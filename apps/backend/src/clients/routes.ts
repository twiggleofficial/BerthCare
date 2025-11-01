import crypto from 'node:crypto';

import type { PoolClient } from 'pg';
import type { Request, Response } from 'express';
import { Router } from 'express';

import { authenticateJwt, authorizeRoles } from '../auth/middleware';
import { getCacheClient } from '../cache/redis';
import { runWithClient } from '../database/pool';
import { logger } from '../logger';
import { geocodeAddress, GeocodingError, type GeocodeResult } from './geocoding';
import { buildClientDetailCacheKey, invalidateClientCaches } from './cache';
import { sanitiseCreateClientPayload, sanitiseUpdateClientPayload } from './validation';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;
const LIST_CACHE_TTL_SECONDS = 5 * 60;
const CLIENT_DETAIL_CACHE_TTL_SECONDS = 15 * 60;
const DEFAULT_CARE_PLAN_SUMMARY = 'Initial care plan pending review';
const DEFAULT_CARE_PLAN_SPECIAL_INSTRUCTIONS = '';
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const buildDefaultCarePlan = () => ({
  summary: DEFAULT_CARE_PLAN_SUMMARY,
  medications: [] as CarePlanMedication[],
  allergies: [] as string[],
  specialInstructions: DEFAULT_CARE_PLAN_SPECIAL_INSTRUCTIONS,
});

type RawClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | Date;
  address: string;
  latitude: string | number | null;
  longitude: string | number | null;
  care_plan_summary: string | null;
  last_visit_date: string | Date | null;
  next_visit_date: string | Date | null;
};

type ClientsResponse = {
  clients: Array<{
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    carePlanSummary: string;
    lastVisitDate: string | null;
    nextScheduledVisit: string | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type RawClientDetailRow = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | Date;
  address: string;
  latitude: string | number | null;
  longitude: string | number | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  zone_id: string | null;
  care_plan_summary: string | null;
  care_plan_medications: unknown;
  care_plan_allergies: unknown;
  care_plan_special_instructions: string | null;
};

type RawVisitRow = {
  id: string;
  visit_date: string | Date | null;
  staff_first_name: string | null;
  staff_last_name: string | null;
  duration_minutes: string | number | null;
};

type RawInsertedClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | Date;
  address: string;
  latitude: string | number | null;
  longitude: string | number | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  zone_id: string | null;
};

type RawClientUpdateRow = RawInsertedClientRow;

type CarePlanMedication = {
  name: string;
  dosage: string;
  frequency: string;
};

export type ClientDetailResponse = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  carePlan: {
    summary: string;
    medications: CarePlanMedication[];
    allergies: string[];
    specialInstructions: string;
  };
  recentVisits: Array<{
    id: string;
    date: string;
    staffName: string;
    duration: number;
  }>;
};

type ClientDetailCacheEntry = {
  zoneId: string | null;
  payload: ClientDetailResponse;
};

type ParsedQueryResult =
  | {
      ok: true;
      value: {
        page: number;
        limit: number;
        search: string | null;
        zoneId: string | null;
      };
    }
  | {
      ok: false;
      errors: string[];
    };

const toIsoString = (value: string | Date | null): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const toDateOnly = (value: string | Date | null): string | null => {
  const iso = toIsoString(value);
  return iso ? iso.slice(0, 10) : null;
};

const toNumber = (value: string | number | null): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const getQueryParam = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === 'string' ? first : undefined;
  }

  return typeof value === 'string' ? value : undefined;
};

const normaliseSearch = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\s+/g, ' ').toLowerCase();
};

const parseClientsQuery = (req: Request): ParsedQueryResult => {
  const errors: string[] = [];

  const rawPage = getQueryParam(req.query.page);
  const rawLimit = getQueryParam(req.query.limit);
  const rawZoneId = getQueryParam(req.query.zoneId ?? req.query.zone_id);
  const rawSearch = getQueryParam(req.query.search);

  const pageValue = rawPage ? Number.parseInt(rawPage, 10) : DEFAULT_PAGE;
  const limitValue = rawLimit ? Number.parseInt(rawLimit, 10) : DEFAULT_LIMIT;

  if (Number.isNaN(pageValue) || pageValue < 1) {
    errors.push('page must be a positive integer');
  }

  if (Number.isNaN(limitValue) || limitValue < 1 || limitValue > MAX_LIMIT) {
    errors.push(`limit must be between 1 and ${MAX_LIMIT}`);
  }

  let zoneId: string | null = null;

  if (rawZoneId) {
    const candidate = rawZoneId.trim();

    if (!UUID_REGEX.test(candidate)) {
      errors.push('zoneId must be a valid UUID');
    } else {
      zoneId = candidate;
    }
  }

  const search = normaliseSearch(rawSearch);

  if (search && search.length > 100) {
    errors.push('search must be 100 characters or fewer');
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      page: pageValue,
      limit: limitValue,
      search,
      zoneId,
    },
  };
};

const buildCacheKey = (params: {
  page: number;
  limit: number;
  search: string | null;
  zoneId: string | null;
  userRole: string | null;
}): string => {
  const hashInput = JSON.stringify(params);
  const digest = crypto.createHash('sha256').update(hashInput).digest('hex');
  return `clients:list:${digest}`;
};

class ZoneAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZoneAssignmentError';
  }
}

class ClientNotFoundError extends Error {
  constructor() {
    super('Client not found');
    this.name = 'ClientNotFoundError';
  }
}

class ClientPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClientPermissionError';
  }
}

type ClientAuditChanges = Record<string, { previous: unknown; current: unknown }>;

const determineZoneForCoordinates = async (
  client: PoolClient,
  latitude: number,
  longitude: number
): Promise<string | null> => {
  try {
    const result = await client.query<{ zone_id: string | null }>(
      'SELECT determine_zone_for_point($1, $2) AS zone_id',
      [latitude, longitude]
    );

    const zoneId = result.rows[0]?.zone_id ?? null;

    if (zoneId && UUID_REGEX.test(zoneId)) {
      return zoneId;
    }

    if (zoneId) {
      logger.warn('Zone lookup returned invalid UUID', { zoneId });
    }

    return null;
  } catch (error) {
    logger.warn('Failed to determine zone for coordinates', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return null;
  }
};

const ensureString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value;
  }

  return null;
};

const parseMedications = (value: unknown): CarePlanMedication[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const name = ensureString(record.name);

      if (!name) {
        return null;
      }

      return {
        name,
        dosage: ensureString(record.dosage) ?? '',
        frequency: ensureString(record.frequency) ?? '',
      };
    })
    .filter((item): item is CarePlanMedication => item !== null);
};

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item : null))
    .filter((item): item is string => item !== null);
};

const fetchClients = async (options: {
  page: number;
  limit: number;
  search: string | null;
  zoneId: string | null;
}): Promise<{ rows: RawClientRow[]; total: number }> => {
  const { page, limit, search, zoneId } = options;
  const filters: string[] = [];
  const params: unknown[] = [];

  if (zoneId) {
    params.push(zoneId);
    filters.push(`c.zone_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    const placeholder = `$${params.length}`;
    filters.push(
      `(c.first_name ILIKE ${placeholder} OR c.last_name ILIKE ${placeholder} OR (c.first_name || ' ' || c.last_name) ILIKE ${placeholder})`
    );
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const limitPlaceholder = `$${params.length + 1}`;
  const offsetPlaceholder = `$${params.length + 2}`;
  const offset = (page - 1) * limit;

  const rowsPromise = runWithClient(
    async (client) => {
      const rowsResult = await client.query<RawClientRow>(
        `
        SELECT
          c.id,
          c.first_name,
          c.last_name,
          c.date_of_birth,
          c.address,
          c.latitude,
          c.longitude,
          cp.summary AS care_plan_summary,
          last_visit.last_visit_date,
          next_visit.next_visit_date
        FROM clients c
        LEFT JOIN LATERAL (
          SELECT summary
          FROM care_plans cp
          WHERE cp.client_id = c.id
          ORDER BY cp.updated_at DESC
          LIMIT 1
        ) cp ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(v.check_out_time, v.scheduled_start_time) AS last_visit_date
          FROM visits v
          WHERE v.client_id = c.id
            AND v.status = 'completed'
          ORDER BY last_visit_date DESC NULLS LAST
          LIMIT 1
        ) last_visit ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            v.scheduled_start_time AS next_visit_date
          FROM visits v
          WHERE v.client_id = c.id
            AND v.status IN ('scheduled', 'in_progress')
          ORDER BY v.scheduled_start_time ASC NULLS LAST
          LIMIT 1
        ) next_visit ON TRUE
        ${whereClause}
        ORDER BY c.last_name ASC, c.first_name ASC, c.id ASC
        LIMIT ${limitPlaceholder}
        OFFSET ${offsetPlaceholder}
        `,
        [...params, limit, offset]
      );

      const countResult = await client.query<{ total: string }>(
        `
        SELECT COUNT(*)::text AS total
        FROM clients c
        ${whereClause}
        `,
        params
      );

      const total = Number.parseInt(countResult.rows[0]?.total ?? '0', 10);

      return {
        rows: rowsResult.rows,
        total: Number.isNaN(total) ? 0 : total,
      };
    },
    { useReadReplica: true }
  );

  return rowsPromise;
};

const fetchClientDetail = async (
  clientId: string
): Promise<{ client: RawClientDetailRow; visits: RawVisitRow[] } | null> => {
  return await runWithClient(
    async (client) => {
      const clientResult = await client.query<RawClientDetailRow>(
        `
        SELECT
          c.id,
          c.first_name,
          c.last_name,
          c.date_of_birth,
          c.address,
          c.latitude,
          c.longitude,
          c.phone,
          c.emergency_contact_name,
          c.emergency_contact_phone,
          c.emergency_contact_relationship,
          c.zone_id,
          latest_care_plan.summary AS care_plan_summary,
          latest_care_plan.medications AS care_plan_medications,
          latest_care_plan.allergies AS care_plan_allergies,
          latest_care_plan.special_instructions AS care_plan_special_instructions
        FROM clients c
        LEFT JOIN LATERAL (
          SELECT
            cp.summary,
            cp.medications,
            cp.allergies,
            cp.special_instructions
          FROM care_plans cp
          WHERE cp.client_id = c.id
          ORDER BY cp.updated_at DESC
          LIMIT 1
        ) latest_care_plan ON TRUE
        WHERE c.id = $1
        LIMIT 1
        `,
        [clientId]
      );

      const [clientRow] = clientResult.rows;

      if (!clientRow) {
        return null;
      }

      const visitsResult = await client.query<RawVisitRow>(
        `
        SELECT
          v.id,
          COALESCE(v.check_out_time, v.check_in_time, v.scheduled_start_time) AS visit_date,
          u.first_name AS staff_first_name,
          u.last_name AS staff_last_name,
          v.duration_minutes
        FROM visits v
        LEFT JOIN users u ON u.id = v.staff_id
        WHERE v.client_id = $1
        ORDER BY visit_date DESC NULLS LAST, v.created_at DESC
        LIMIT 10
        `,
        [clientId]
      );

      return {
        client: clientRow,
        visits: visitsResult.rows,
      };
    },
    { useReadReplica: true }
  );
};

const normaliseRole = (role: string | null | undefined): string => role?.trim().toLowerCase() ?? '';

const insertCarePlan = async (client: PoolClient, clientId: string): Promise<void> => {
  await client.query(
    `INSERT INTO care_plans (
      client_id,
      summary,
      medications,
      allergies,
      special_instructions
    )
    VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)`,
    [
      clientId,
      DEFAULT_CARE_PLAN_SUMMARY,
      JSON.stringify([]),
      JSON.stringify([]),
      DEFAULT_CARE_PLAN_SPECIAL_INSTRUCTIONS,
    ]
  );
};

export const handleCreateClient = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  if (normaliseRole(req.user.role) !== 'admin') {
    res.status(403).json({ message: 'Insufficient permissions' });
    return;
  }

  const validation = sanitiseCreateClientPayload(req.body ?? {});

  if (!validation.ok) {
    res.status(400).json({
      message: 'Invalid request body',
      errors: validation.errors,
    });
    return;
  }

  const payload = validation.value;

  let geocodeResult: GeocodeResult;

  try {
    geocodeResult = await geocodeAddress(payload.address);
  } catch (error) {
    if (error instanceof GeocodingError) {
      if (error.code === 'zero_results') {
        res.status(400).json({
          message: 'Could not geocode address',
          errors: ['Address could not be located. Verify the details and try again.'],
        });
        return;
      }

      const statusCode = error.code === 'config_error' ? 503 : 502;
      res.status(statusCode).json({
        message: 'Unable to validate address at this time',
        error: error.code,
      });
      return;
    }

    res.status(502).json({
      message: 'Unable to validate address at this time',
    });
    return;
  }

  let insertedClient: RawInsertedClientRow;

  try {
    const { client } = await runWithClient(async (client) => {
      let transactionStarted = false;

      try {
        await client.query('BEGIN');
        transactionStarted = true;

        const zoneId = await determineZoneForCoordinates(
          client,
          geocodeResult.latitude,
          geocodeResult.longitude
        );

        if (!zoneId) {
          throw new ZoneAssignmentError('No service zone covers the provided location');
        }

        const clientInsertResult = await client.query<RawInsertedClientRow>(
          `INSERT INTO clients (
            first_name,
            last_name,
            date_of_birth,
            address,
            latitude,
            longitude,
            phone,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relationship,
            zone_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING
            id,
            first_name,
            last_name,
            date_of_birth,
            address,
            latitude,
            longitude,
            phone,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relationship,
            zone_id`,
          [
            payload.firstName,
            payload.lastName,
            payload.dateOfBirth,
            geocodeResult.formattedAddress,
            geocodeResult.latitude,
            geocodeResult.longitude,
            payload.phone ?? null,
            payload.emergencyContact?.name ?? null,
            payload.emergencyContact?.phone ?? null,
            payload.emergencyContact?.relationship ?? null,
            zoneId,
          ]
        );

        const inserted = clientInsertResult.rows[0];

        if (!inserted) {
          throw new Error('Client insert did not return a row');
        }

        await insertCarePlan(client, inserted.id);

        await client.query('COMMIT');

        return {
          client: inserted,
        };
      } catch (error) {
        if (transactionStarted) {
          try {
            await client.query('ROLLBACK');
          } catch (rollbackError) {
            logger.error('Failed to rollback client creation transaction', {
              error: rollbackError instanceof Error ? rollbackError.message : 'unknown_error',
            });
          }
        }

        throw error;
      }
    });

    insertedClient = client;
  } catch (error) {
    if (error instanceof ZoneAssignmentError) {
      res.status(400).json({
        message: error.message,
      });
      return;
    }

    logger.error('Failed to create client', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ message: 'Unable to create client at this time' });
    return;
  }

  const defaultCarePlan = buildDefaultCarePlan();

  const responseBody = {
    id: insertedClient.id,
    firstName: insertedClient.first_name,
    lastName: insertedClient.last_name,
    dateOfBirth: toIsoString(insertedClient.date_of_birth) ?? payload.dateOfBirth,
    address: insertedClient.address,
    latitude: toNumber(insertedClient.latitude),
    longitude: toNumber(insertedClient.longitude),
    zoneId: insertedClient.zone_id,
    phone: insertedClient.phone ?? '',
    emergencyContact: {
      name: insertedClient.emergency_contact_name ?? '',
      phone: insertedClient.emergency_contact_phone ?? '',
      relationship: insertedClient.emergency_contact_relationship ?? '',
    },
    carePlan: defaultCarePlan,
  };

  try {
    await invalidateClientCaches(insertedClient.id);
  } catch (error) {
    logger.warn('Failed to invalidate client caches after creation', {
      error: error instanceof Error ? error.message : 'unknown_error',
      clientId: insertedClient.id,
    });
  }

  res.setHeader('Location', `/v1/clients/${insertedClient.id}`);
  res.status(201).json(responseBody);
};

export const handleUpdateClient = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const actingUser = req.user;
  const userRole = normaliseRole(actingUser.role);
  const isAdmin = userRole === 'admin';
  const isCoordinator = userRole === 'coordinator';

  if (!isAdmin && !isCoordinator) {
    res.status(403).json({ message: 'Insufficient permissions' });
    return;
  }

  const { clientId } = req.params;

  if (!clientId || !UUID_REGEX.test(clientId)) {
    res.status(400).json({ message: 'Invalid clientId' });
    return;
  }

  const validation = sanitiseUpdateClientPayload(req.body ?? {});

  if (!validation.ok) {
    res.status(400).json({
      message: 'Invalid request body',
      errors: validation.errors,
    });
    return;
  }

  const payload = validation.value;

  let geocodeResult: GeocodeResult | null = null;

  if (Object.prototype.hasOwnProperty.call(payload, 'address')) {
    try {
      geocodeResult = await geocodeAddress(payload.address as string);
    } catch (error) {
      if (error instanceof GeocodingError) {
        if (error.code === 'zero_results') {
          res.status(400).json({
            message: 'Could not geocode address',
            errors: ['Address could not be located. Verify the details and try again.'],
          });
          return;
        }

        const statusCode = error.code === 'config_error' ? 503 : 502;
        res.status(statusCode).json({
          message: 'Unable to validate address at this time',
          error: error.code,
        });
        return;
      }

      res.status(502).json({
        message: 'Unable to validate address at this time',
      });
      return;
    }
  }

  let updateOutcome: {
    updated: RawClientUpdateRow;
    previous: RawClientUpdateRow;
    changes: ClientAuditChanges;
  };

  try {
    updateOutcome = (await runWithClient(async (client) => {
      let transactionStarted = false;

      try {
        await client.query('BEGIN');
        transactionStarted = true;

        const currentResult = await client.query<RawClientUpdateRow>(
          `
          SELECT
            id,
            first_name,
            last_name,
            date_of_birth,
            address,
            latitude,
            longitude,
            phone,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relationship,
            zone_id
          FROM clients
          WHERE id = $1
          FOR UPDATE
          `,
          [clientId]
        );

        const current = currentResult.rows[0];

        if (!current) {
          throw new ClientNotFoundError();
        }

        if (!isAdmin) {
          if (!current.zone_id || current.zone_id !== actingUser.zoneId) {
            throw new ClientPermissionError('Insufficient permissions for client zone');
          }
        }

        const updates: string[] = [];
        const values: unknown[] = [];
        let parameterIndex = 0;
        const changes: ClientAuditChanges = {};

        const pushUpdate = (column: string, value: unknown) => {
          parameterIndex += 1;
          updates.push(`${column} = $${parameterIndex}`);
          values.push(value);
        };

        const normaliseAuditValue = (value: unknown): unknown => {
          if (value instanceof Date) {
            return toIsoString(value);
          }

          if (typeof value === 'undefined') {
            return null;
          }

          return value;
        };

        const recordChange = (field: string, previous: unknown, currentValue: unknown) => {
          const prev = normaliseAuditValue(previous);
          const next = normaliseAuditValue(currentValue);

          if (prev === next) {
            return;
          }

          if (prev === null && next === null) {
            return;
          }

          changes[field] = {
            previous: prev,
            current: next,
          };
        };

        if (geocodeResult) {
          const zoneId = await determineZoneForCoordinates(
            client,
            geocodeResult.latitude,
            geocodeResult.longitude
          );

          if (!zoneId) {
            throw new ZoneAssignmentError('No service zone covers the provided location');
          }

          if (!isAdmin && zoneId !== actingUser.zoneId) {
            throw new ClientPermissionError('Insufficient permissions for target zone');
          }

          pushUpdate('address', geocodeResult.formattedAddress);
          pushUpdate('latitude', geocodeResult.latitude);
          pushUpdate('longitude', geocodeResult.longitude);
          pushUpdate('zone_id', zoneId);

          recordChange('address', current.address, geocodeResult.formattedAddress);
          recordChange('latitude', toNumber(current.latitude), geocodeResult.latitude);
          recordChange('longitude', toNumber(current.longitude), geocodeResult.longitude);
          recordChange('zoneId', current.zone_id, zoneId);
        }

        if (payload.firstName !== undefined) {
          pushUpdate('first_name', payload.firstName);
          recordChange('firstName', current.first_name, payload.firstName);
        }

        if (payload.lastName !== undefined) {
          pushUpdate('last_name', payload.lastName);
          recordChange('lastName', current.last_name, payload.lastName);
        }

        if (payload.dateOfBirth !== undefined) {
          pushUpdate('date_of_birth', payload.dateOfBirth);
          recordChange('dateOfBirth', toDateOnly(current.date_of_birth), payload.dateOfBirth);
        }

        if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
          const newPhone = payload.phone ?? null;
          pushUpdate('phone', newPhone);
          recordChange('phone', current.phone, newPhone);
        }

        if (Object.prototype.hasOwnProperty.call(payload, 'emergencyContact')) {
          const contactValue = payload.emergencyContact ?? null;
          const newName = contactValue ? contactValue.name : null;
          const newPhone = contactValue ? contactValue.phone : null;
          const newRelationship = contactValue ? (contactValue.relationship ?? null) : null;

          pushUpdate('emergency_contact_name', newName);
          pushUpdate('emergency_contact_phone', newPhone);
          pushUpdate('emergency_contact_relationship', newRelationship);

          recordChange('emergencyContact.name', current.emergency_contact_name, newName);
          recordChange('emergencyContact.phone', current.emergency_contact_phone, newPhone);
          recordChange(
            'emergencyContact.relationship',
            current.emergency_contact_relationship,
            newRelationship
          );
        }

        if (updates.length === 0) {
          await client.query('ROLLBACK');
          return {
            updated: current,
            previous: current,
            changes,
          };
        }

        const updateQuery = `
          UPDATE clients
          SET ${updates.join(', ')}
          WHERE id = $${parameterIndex + 1}
          RETURNING
            id,
            first_name,
            last_name,
            date_of_birth,
            address,
            latitude,
            longitude,
            phone,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relationship,
            zone_id
        `;

        values.push(clientId);

        const updatedResult = await client.query<RawClientUpdateRow>(updateQuery, values);
        const updatedRow = updatedResult.rows[0];

        if (!updatedRow) {
          throw new Error('Client update did not return a row');
        }

        await client.query('COMMIT');

        return {
          updated: updatedRow,
          previous: current,
          changes,
        };
      } catch (error) {
        if (transactionStarted) {
          try {
            await client.query('ROLLBACK');
          } catch (rollbackError) {
            logger.error('Failed to rollback client update transaction', {
              error: rollbackError instanceof Error ? rollbackError.message : 'unknown_error',
            });
          }
        }

        throw error;
      }
    })) as {
      updated: RawClientUpdateRow;
      previous: RawClientUpdateRow;
      changes: ClientAuditChanges;
    };
  } catch (error) {
    if (error instanceof ClientNotFoundError) {
      res.status(404).json({ message: 'Client not found' });
      return;
    }

    if (error instanceof ClientPermissionError) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    if (error instanceof ZoneAssignmentError) {
      res.status(400).json({ message: error.message });
      return;
    }

    logger.error('Failed to update client', {
      error: error instanceof Error ? error.message : 'unknown_error',
      clientId,
    });
    res.status(500).json({ message: 'Unable to update client at this time' });
    return;
  }

  try {
    await invalidateClientCaches(clientId);
  } catch (error) {
    logger.warn('Failed to invalidate client caches after update', {
      error: error instanceof Error ? error.message : 'unknown_error',
      clientId,
    });
  }

  if (Object.keys(updateOutcome.changes).length > 0) {
    logger.info('audit:client.updated', {
      event: 'client.updated',
      clientId,
      userId: actingUser.id,
      changes: updateOutcome.changes,
      zoneId: updateOutcome.updated.zone_id,
    });
  }

  const responseBody = {
    id: updateOutcome.updated.id,
    firstName: updateOutcome.updated.first_name,
    lastName: updateOutcome.updated.last_name,
    dateOfBirth:
      toIsoString(updateOutcome.updated.date_of_birth) ??
      toIsoString(updateOutcome.previous.date_of_birth) ??
      '',
    address: updateOutcome.updated.address,
    latitude: toNumber(updateOutcome.updated.latitude),
    longitude: toNumber(updateOutcome.updated.longitude),
    zoneId: updateOutcome.updated.zone_id,
    phone: updateOutcome.updated.phone ?? '',
    emergencyContact: {
      name: updateOutcome.updated.emergency_contact_name ?? '',
      phone: updateOutcome.updated.emergency_contact_phone ?? '',
      relationship: updateOutcome.updated.emergency_contact_relationship ?? '',
    },
  };

  res.status(200).json(responseBody);
};

export const handleListClients = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const parsed = parseClientsQuery(req);

  if (!parsed.ok) {
    res.status(400).json({
      message: 'Invalid query parameters',
      errors: parsed.errors,
    });
    return;
  }

  const query = parsed.value;
  const effectiveZoneId = query.zoneId ?? req.user.zoneId ?? null;

  const cacheKey = buildCacheKey({
    page: query.page,
    limit: query.limit,
    search: query.search,
    zoneId: effectiveZoneId,
    userRole: req.user.role ?? null,
  });

  const cacheClient = getCacheClient();

  try {
    const cached = await cacheClient.get(cacheKey);
    if (cached) {
      try {
        const parsedCache = JSON.parse(cached) as ClientsResponse;
        res.status(200).json(parsedCache);
        return;
      } catch (error) {
        logger.warn('Failed to parse cached clients response', {
          error: error instanceof Error ? error.message : 'unknown_error',
        });
      }
    }
  } catch (error) {
    logger.warn('Failed to read clients list from cache', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
  }

  try {
    const { rows, total } = await fetchClients({
      page: query.page,
      limit: query.limit,
      search: query.search,
      zoneId: effectiveZoneId,
    });

    const clients = rows.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      dateOfBirth: toIsoString(row.date_of_birth) ?? '',
      address: row.address,
      latitude: toNumber(row.latitude),
      longitude: toNumber(row.longitude),
      carePlanSummary: row.care_plan_summary ?? '',
      lastVisitDate: toIsoString(row.last_visit_date),
      nextScheduledVisit: toIsoString(row.next_visit_date),
    }));

    const responseBody: ClientsResponse = {
      clients,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };

    try {
      await cacheClient.set(cacheKey, JSON.stringify(responseBody), 'EX', LIST_CACHE_TTL_SECONDS);
    } catch (error) {
      logger.warn('Failed to write clients list to cache', {
        error: error instanceof Error ? error.message : 'unknown_error',
      });
    }

    res.status(200).json(responseBody);
  } catch (error) {
    logger.error('Failed to fetch clients', {
      error: error instanceof Error ? error.message : 'unknown_error',
      page: query.page,
      limit: query.limit,
      search: query.search ?? undefined,
      zoneId: effectiveZoneId ?? undefined,
    });

    res.status(500).json({ message: 'Unable to fetch clients at this time' });
  }
};

export const handleGetClient = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const { clientId } = req.params;

  if (!clientId || !UUID_REGEX.test(clientId)) {
    res.status(400).json({ message: 'Invalid clientId' });
    return;
  }

  const cacheClient = getCacheClient();
  const cacheKey = buildClientDetailCacheKey(clientId);

  try {
    const cached = await cacheClient.get(cacheKey);

    if (cached) {
      try {
        const cachedEntry = JSON.parse(cached) as ClientDetailCacheEntry;

        if (cachedEntry.zoneId && cachedEntry.zoneId === req.user.zoneId) {
          res.status(200).json(cachedEntry.payload);
          return;
        }
      } catch (error) {
        logger.warn('Failed to parse cached client detail', {
          error: error instanceof Error ? error.message : 'unknown_error',
        });
      }
    }
  } catch (error) {
    logger.warn('Failed to read client detail from cache', {
      error: error instanceof Error ? error.message : 'unknown_error',
      clientId,
    });
  }

  let detail: { client: RawClientDetailRow; visits: RawVisitRow[] } | null = null;

  try {
    detail = await fetchClientDetail(clientId);
  } catch (error) {
    logger.error('Failed to query client detail', {
      error: error instanceof Error ? error.message : 'unknown_error',
      clientId,
    });
    res.status(500).json({ message: 'Unable to fetch client details at this time' });
    return;
  }

  if (!detail) {
    res.status(404).json({ message: 'Client not found' });
    return;
  }

  if (!detail.client.zone_id || detail.client.zone_id !== req.user.zoneId) {
    res.status(403).json({ message: 'Insufficient permissions' });
    return;
  }

  const responseBody: ClientDetailResponse = {
    id: detail.client.id,
    firstName: detail.client.first_name,
    lastName: detail.client.last_name,
    dateOfBirth: toIsoString(detail.client.date_of_birth) ?? '',
    address: detail.client.address,
    latitude: toNumber(detail.client.latitude),
    longitude: toNumber(detail.client.longitude),
    phone: detail.client.phone ?? '',
    emergencyContact: {
      name: detail.client.emergency_contact_name ?? '',
      phone: detail.client.emergency_contact_phone ?? '',
      relationship: detail.client.emergency_contact_relationship ?? '',
    },
    carePlan: {
      summary: detail.client.care_plan_summary ?? '',
      medications: parseMedications(detail.client.care_plan_medications),
      allergies: parseStringArray(detail.client.care_plan_allergies),
      specialInstructions: detail.client.care_plan_special_instructions ?? '',
    },
    recentVisits: detail.visits.map((visit) => {
      const staffFirstName = visit.staff_first_name?.trim() ?? '';
      const staffLastName = visit.staff_last_name?.trim() ?? '';
      const staffName = `${staffFirstName} ${staffLastName}`.trim();

      return {
        id: visit.id,
        date: toIsoString(visit.visit_date) ?? '',
        staffName,
        duration: toNumber(visit.duration_minutes) ?? 0,
      };
    }),
  };

  try {
    const cacheEntry: ClientDetailCacheEntry = {
      zoneId: detail.client.zone_id,
      payload: responseBody,
    };
    await cacheClient.set(
      cacheKey,
      JSON.stringify(cacheEntry),
      'EX',
      CLIENT_DETAIL_CACHE_TTL_SECONDS
    );
  } catch (error) {
    logger.warn('Failed to write client detail to cache', {
      error: error instanceof Error ? error.message : 'unknown_error',
      clientId,
    });
  }

  res.status(200).json(responseBody);
};

export const clientsRouter = Router();

clientsRouter.use(authenticateJwt);

clientsRouter.post('/', authorizeRoles('admin'), handleCreateClient);
clientsRouter.patch('/:clientId', authorizeRoles(['admin', 'coordinator']), handleUpdateClient);
clientsRouter.get('/', handleListClients);
clientsRouter.get('/:clientId', handleGetClient);

clientsRouter.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Not Found' });
});

export const __TESTING__ = {
  parseClientsQuery,
  buildCacheKey,
  toIsoString,
  toNumber,
  normaliseSearch,
};
