import type { Request, Response } from 'express';
import { Router } from 'express';

import { authenticateJwt, authorizeRoles } from '../auth/middleware';
import { runWithClient } from '../database/pool';
import { logger } from '../logger';
import { invalidateClientCaches } from '../clients/cache';
import { sanitiseCarePlanPayload, type SanitisedCarePlanPayload } from './validation';

type ClientZoneRow = {
  zone_id: string | null;
};

type LatestVersionRow = {
  version: number;
};

type InsertedCarePlanRow = {
  id: string;
  version: number;
  created_at: Date | string;
  updated_at: Date | string;
};

class CarePlanClientNotFoundError extends Error {
  constructor() {
    super('Client not found');
    this.name = 'CarePlanClientNotFoundError';
  }
}

class CarePlanPermissionError extends Error {
  constructor() {
    super('Insufficient permissions for client zone');
    this.name = 'CarePlanPermissionError';
  }
}

const normaliseRole = (role: string | null | undefined): string => role?.trim().toLowerCase() ?? '';

const toIsoString = (value: Date | string): string => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
};

const insertCarePlan = async (
  payload: SanitisedCarePlanPayload,
  actingUser: { id: string; role: string; zoneId: string }
): Promise<InsertedCarePlanRow> => {
  return await runWithClient(async (client) => {
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      const clientResult = await client.query<ClientZoneRow>(
        `SELECT zone_id
         FROM clients
         WHERE id = $1
         FOR UPDATE`,
        [payload.clientId]
      );

      const clientRow = clientResult.rows[0];

      if (!clientRow) {
        throw new CarePlanClientNotFoundError();
      }

      const userRole = normaliseRole(actingUser.role);
      const isAdmin = userRole === 'admin';

      if (!isAdmin) {
        const clientZone = clientRow.zone_id ?? '';

        if (!clientZone || clientZone !== actingUser.zoneId) {
          throw new CarePlanPermissionError();
        }
      }

      const latestVersionResult = await client.query<LatestVersionRow>(
        `SELECT version
         FROM care_plans
         WHERE client_id = $1
         ORDER BY version DESC
         LIMIT 1`,
        [payload.clientId]
      );

      const currentVersion = latestVersionResult.rows[0]?.version ?? 0;
      const nextVersion = currentVersion + 1;

      const insertResult = await client.query<InsertedCarePlanRow>(
        `INSERT INTO care_plans (
          client_id,
          summary,
          medications,
          allergies,
          special_instructions,
          version
        )
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)
        RETURNING id, version, created_at, updated_at`,
        [
          payload.clientId,
          payload.summary,
          JSON.stringify(payload.medications),
          JSON.stringify(payload.allergies),
          payload.specialInstructions,
          nextVersion,
        ]
      );

      const inserted = insertResult.rows[0];

      if (!inserted) {
        throw new Error('Care plan insert did not return a row');
      }

      await client.query('COMMIT');

      return inserted;
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          logger.error('Failed to rollback care plan transaction', {
            error: rollbackError instanceof Error ? rollbackError.message : 'unknown_error',
            clientId: payload.clientId,
          });
        }
      }

      throw error;
    }
  });
};

export const handleCreateOrUpdateCarePlan = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const validation = sanitiseCarePlanPayload(req.body ?? {});

  if (!validation.ok) {
    res.status(400).json({
      message: 'Invalid request body',
      errors: validation.errors,
    });
    return;
  }

  const payload = validation.value;

  let insertedPlan: InsertedCarePlanRow;

  try {
    insertedPlan = await insertCarePlan(payload, req.user);
  } catch (error) {
    if (error instanceof CarePlanClientNotFoundError) {
      res.status(404).json({ message: 'Client not found' });
      return;
    }

    if (error instanceof CarePlanPermissionError) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    logger.error('Failed to create care plan', {
      error: error instanceof Error ? error.message : 'unknown_error',
      clientId: payload.clientId,
    });
    res.status(500).json({ message: 'Unable to update care plan at this time' });
    return;
  }

  try {
    await invalidateClientCaches(payload.clientId);
  } catch (error) {
    logger.warn('Failed to invalidate caches after care plan update', {
      error: error instanceof Error ? error.message : 'unknown_error',
      clientId: payload.clientId,
    });
  }

  logger.info('audit:care_plan.updated', {
    event: 'care_plan.updated',
    clientId: payload.clientId,
    userId: req.user.id,
    version: insertedPlan.version,
  });

  res.status(200).json({
    id: insertedPlan.id,
    clientId: payload.clientId,
    summary: payload.summary,
    medications: payload.medications,
    allergies: payload.allergies,
    specialInstructions: payload.specialInstructions,
    version: insertedPlan.version,
    createdAt: toIsoString(insertedPlan.created_at),
    updatedAt: toIsoString(insertedPlan.updated_at),
  });
};

export const carePlanRouter = Router();

carePlanRouter.use(authenticateJwt);

carePlanRouter.post('/', authorizeRoles(['admin', 'coordinator']), handleCreateOrUpdateCarePlan);

carePlanRouter.use((req: Request, res: Response) => {
  if (res.headersSent) {
    return;
  }

  res.status(404).json({ message: 'Not Found', path: req.originalUrl });
});
