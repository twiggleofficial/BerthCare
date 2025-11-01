/**
 * @jest-environment node
 */

import express from 'express';

const mockAuthenticateJwt = jest.fn();
const mockAuthorizeRoles = jest.fn();
const mockGetCacheClient = jest.fn();
const mockRunWithClient = jest.fn();

jest.mock('../auth/middleware', () => ({
  authenticateJwt: (req: express.Request, res: express.Response, next: express.NextFunction) =>
    mockAuthenticateJwt(req, res, next),
  authorizeRoles:
    (...roles: string[]) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const result = mockAuthorizeRoles(req, res, next, roles);
      if (result !== false) {
        next();
      }
    },
}));

jest.mock('../cache/redis', () => ({
  getCacheClient: () => mockGetCacheClient(),
}));

jest.mock('../database/pool', () => ({
  runWithClient: (...args: unknown[]) => mockRunWithClient(...args),
}));

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../logger', () => ({
  logger,
}));

type CacheClientMock = {
  get: jest.Mock<Promise<string | null>, [string]>;
  set: jest.Mock<Promise<string>, [string, string, string, number]>;
  scan: jest.Mock<Promise<[string, string[]]>, [string, string, string, string, number]>;
  del: jest.Mock<Promise<number>, string[]>;
};

type QueryCall = {
  text: string;
  values: unknown[];
};

const defaultUser = {
  id: 'user-1',
  role: 'caregiver',
  zoneId: '11111111-1111-1111-1111-111111111111',
  token: 'access-token',
  tokenExpiresAt: Date.now() + 60_000,
};

const originalEnv = { ...process.env };
const globalWithFetch = globalThis as typeof globalThis & { fetch?: typeof fetch };
const originalFetch = globalWithFetch.fetch;
let fetchMock: jest.Mock;

const createCacheMock = (): CacheClientMock => ({
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
  scan: jest.fn().mockResolvedValue(['0', []]),
  del: jest.fn().mockResolvedValue(1),
});

const createMockRequest = ({
  query,
  user,
  params,
  path,
  originalUrl,
  body,
  method,
}: {
  query?: Record<string, unknown>;
  user?: typeof defaultUser | null;
  params?: Record<string, string>;
  path?: string;
  originalUrl?: string;
  body?: unknown;
  method?: string;
}) => {
  const headers: Record<string, string> = {};
  const resolvedPath = path ?? '/';
  const resolvedOriginalUrl =
    originalUrl ?? `/v1/clients${resolvedPath === '/' ? '' : resolvedPath}`;

  return {
    method: method ?? 'GET',
    url: resolvedPath,
    originalUrl: resolvedOriginalUrl,
    query: query ?? {},
    params: params ?? {},
    headers,
    get: (header: string) => headers[header.toLowerCase()] ?? headers[header] ?? undefined,
    user: user === undefined ? { ...defaultUser } : (user ?? undefined),
    body,
  };
};

const createMockResponse = () => {
  const result: {
    statusCode: number;
    body: unknown;
    status: (code: number) => typeof result;
    json: (payload: unknown) => typeof result;
    headers: Record<string, unknown>;
    setHeader: (name: string, value: unknown) => void;
  } = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    setHeader(name: string, value: unknown) {
      this.headers[name.toLowerCase()] = value;
    },
  };

  return result;
};

const createRunWithClientMock =
  (options: { rows: Array<Record<string, unknown>>; total: number; recordQueries?: QueryCall[] }) =>
  async (
    callback: (client: {
      query: jest.Mock<Promise<{ rows: unknown[] }>, [string, unknown[]?]>;
    }) => Promise<unknown>
  ): Promise<unknown> => {
    const recordQueries = options.recordQueries;
    const client = {
      query: jest.fn(async (text: string, values: unknown[] = []) => {
        recordQueries?.push({ text, values });

        if (text.includes('COUNT(*)::text')) {
          return {
            rows: [{ total: options.total.toString() }],
          };
        }

        return {
          rows: options.rows,
        };
      }),
    };

    return await callback(client);
  };

const loadModule = () => {
  let module: typeof import('./routes');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    module = require('./routes');
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return module!;
};

const setupRouter = () => {
  const cache = createCacheMock();
  mockGetCacheClient.mockReturnValue(cache);
  return { cache };
};

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env = { ...originalEnv };
  fetchMock = jest.fn();
  globalWithFetch.fetch = fetchMock as unknown as typeof fetch;
  mockAuthorizeRoles.mockImplementation(() => undefined);
  mockAuthenticateJwt.mockImplementation(
    (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      req.user = { ...defaultUser };
      next();
    }
  );
});

afterAll(() => {
  process.env = originalEnv;
  if (originalFetch) {
    globalWithFetch.fetch = originalFetch;
  } else {
    Reflect.deleteProperty(globalWithFetch, 'fetch');
  }
});

describe('clientsRouter', () => {
  it('registers authentication middleware before the route handler', () => {
    setupRouter();
    const { clientsRouter } = loadModule();

    const stack = (clientsRouter as unknown as { stack?: Array<{ handle: unknown }> }).stack ?? [];
    const firstLayer = stack[0]?.handle;

    expect(typeof firstLayer).toBe('function');

    const req = {} as express.Request;
    const res = {} as express.Response;
    const next = jest.fn();

    if (typeof firstLayer === 'function') {
      firstLayer(req, res, next);
    }

    expect(mockAuthenticateJwt).toHaveBeenCalledWith(req, res, next);
  });

  it('returns 401 when request is unauthenticated', async () => {
    const { cache } = setupRouter();
    mockRunWithClient.mockImplementation(
      createRunWithClientMock({
        rows: [],
        total: 0,
      })
    );
    const { handleListClients } = loadModule();

    const req = createMockRequest({ user: null });
    const res = createMockResponse();

    await handleListClients(req as unknown as express.Request, res as unknown as express.Response);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ message: 'Authentication required' });
    expect(cache.get).not.toHaveBeenCalled();
  });

  it('returns validation errors for invalid query parameters', async () => {
    const { cache } = setupRouter();
    mockRunWithClient.mockImplementation(
      createRunWithClientMock({
        rows: [],
        total: 0,
      })
    );
    const { handleListClients } = loadModule();

    const req = createMockRequest({ query: { limit: '200', page: '0' } });
    const res = createMockResponse();

    await handleListClients(req as unknown as express.Request, res as unknown as express.Response);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      message: 'Invalid query parameters',
      errors: ['page must be a positive integer', 'limit must be between 1 and 100'],
    });
    expect(cache.get).not.toHaveBeenCalled();
    expect(mockRunWithClient).not.toHaveBeenCalled();
  });

  it('returns cached responses when available', async () => {
    const { cache } = setupRouter();
    const cachedResponse = {
      clients: [
        {
          id: 'client-1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          dateOfBirth: '1815-12-10T00:00:00.000Z',
          address: 'London',
          latitude: 51.5,
          longitude: -0.12,
          carePlanSummary: 'Summary',
          lastVisitDate: null,
          nextScheduledVisit: null,
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      },
    };

    cache.get.mockResolvedValue(JSON.stringify(cachedResponse));
    mockRunWithClient.mockImplementation(
      createRunWithClientMock({
        rows: [],
        total: 0,
      })
    );

    const { handleListClients } = loadModule();
    const req = createMockRequest({});
    const res = createMockResponse();

    await handleListClients(req as unknown as express.Request, res as unknown as express.Response);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(cachedResponse);
    expect(mockRunWithClient).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('fetches clients, converts values, and caches the response', async () => {
    const { cache } = setupRouter();
    cache.get.mockResolvedValue(null);

    const recordedQueries: QueryCall[] = [];
    mockRunWithClient.mockImplementation(
      createRunWithClientMock({
        rows: [
          {
            id: 'client-1',
            first_name: 'Grace',
            last_name: 'Hopper',
            date_of_birth: '1906-12-09',
            address: 'Arlington, VA',
            latitude: '38.88',
            longitude: '-77.09',
            care_plan_summary: null,
            last_visit_date: new Date('2024-05-10T10:00:00Z'),
            next_visit_date: '2024-05-15T14:00:00Z',
          },
        ],
        total: 1,
        recordQueries: recordedQueries,
      })
    );

    const { handleListClients } = loadModule();
    const req = createMockRequest({});
    const res = createMockResponse();

    await handleListClients(req as unknown as express.Request, res as unknown as express.Response);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      clients: [
        {
          id: 'client-1',
          firstName: 'Grace',
          lastName: 'Hopper',
          dateOfBirth: '1906-12-09T00:00:00.000Z',
          address: 'Arlington, VA',
          latitude: 38.88,
          longitude: -77.09,
          carePlanSummary: '',
          lastVisitDate: '2024-05-10T10:00:00.000Z',
          nextScheduledVisit: '2024-05-15T14:00:00.000Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      },
    });

    expect(mockRunWithClient).toHaveBeenCalledWith(expect.any(Function), { useReadReplica: true });
    expect(cache.set).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'EX', 300);
    expect(recordedQueries).toHaveLength(2);
  });

  it('applies zone and search filters to database queries', async () => {
    const { cache } = setupRouter();
    cache.get.mockResolvedValue(null);

    const recordedQueries: QueryCall[] = [];
    mockRunWithClient.mockImplementation(
      createRunWithClientMock({
        rows: [],
        total: 0,
        recordQueries: recordedQueries,
      })
    );

    const { handleListClients } = loadModule();
    const req = createMockRequest({
      query: {
        zoneId: '11111111-1111-1111-1111-111111111111',
        search: '  Ada   Lovelace ',
        page: '2',
        limit: '20',
      },
    });
    const res = createMockResponse();

    await handleListClients(req as unknown as express.Request, res as unknown as express.Response);

    expect(res.statusCode).toBe(200);
    expect(recordedQueries).toHaveLength(2);

    const [listQuery, countQuery] = recordedQueries;
    expect(listQuery?.text).toContain('WHERE c.zone_id = $1');
    expect(listQuery?.text).toContain('c.first_name ILIKE $2');
    expect(listQuery?.values).toEqual([defaultUser.zoneId, '%ada lovelace%', 20, 20]);
    expect(countQuery?.values).toEqual([defaultUser.zoneId, '%ada lovelace%']);
  });

  describe('handleCreateClient', () => {
    const validPayload = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      dateOfBirth: '1990-05-20',
      address: '10 Downing St, London',
      phone: '+441234567890',
      emergencyContact: {
        name: 'Charles Babbage',
        phone: '+44111222333',
        relationship: 'Friend',
      },
    };

    it('returns 401 when request is unauthenticated', async () => {
      const { cache } = setupRouter();
      const { handleCreateClient } = loadModule();

      const req = createMockRequest({
        method: 'POST',
        user: null,
        body: validPayload,
      });
      const res = createMockResponse();

      await handleCreateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: 'Authentication required' });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockRunWithClient).not.toHaveBeenCalled();
      expect(cache.del).not.toHaveBeenCalled();
    });

    it('returns 403 when user does not have admin role', async () => {
      const { cache } = setupRouter();
      const { handleCreateClient } = loadModule();

      const req = createMockRequest({
        method: 'POST',
        body: validPayload,
      });
      const res = createMockResponse();

      await handleCreateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: 'Insufficient permissions' });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockRunWithClient).not.toHaveBeenCalled();
      expect(cache.del).not.toHaveBeenCalled();
    });

    it('returns 400 when validation fails', async () => {
      const { cache } = setupRouter();
      const { handleCreateClient } = loadModule();

      const req = createMockRequest({
        method: 'POST',
        user: { ...defaultUser, role: 'admin' },
        body: {
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          address: '',
        },
      });
      const res = createMockResponse();

      await handleCreateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        message: 'Invalid request body',
        errors: expect.arrayContaining([
          'firstName is required',
          'lastName is required',
          'dateOfBirth is required',
          'address is required',
        ]),
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockRunWithClient).not.toHaveBeenCalled();
      expect(cache.del).not.toHaveBeenCalled();
    });

    it('returns 400 when geocoding returns zero results', async () => {
      process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
      });

      const { cache } = setupRouter();
      const { handleCreateClient } = loadModule();

      const req = createMockRequest({
        method: 'POST',
        user: { ...defaultUser, role: 'admin' },
        body: validPayload,
      });
      const res = createMockResponse();

      await handleCreateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        message: 'Could not geocode address',
        errors: ['Address could not be located. Verify the details and try again.'],
      });
      expect(mockRunWithClient).not.toHaveBeenCalled();
      expect(cache.del).not.toHaveBeenCalled();
    });

    it('returns 400 when zone resolution fails', async () => {
      process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [
            {
              formatted_address: '10 Downing St, London',
              geometry: {
                location: { lat: 51.5033635, lng: -0.1276248 },
              },
            },
          ],
        }),
      });

      const recordedQueries: QueryCall[] = [];

      mockRunWithClient.mockImplementation(async (callback) => {
        const client = {
          query: jest.fn(async (text: string, values: unknown[] = []) => {
            recordedQueries.push({ text, values });
            const upper = text.trim().toUpperCase();

            if (upper === 'BEGIN') {
              return { rows: [], rowCount: null };
            }

            if (text.includes('determine_zone_for_point')) {
              return { rows: [] };
            }

            if (upper === 'ROLLBACK') {
              return { rows: [], rowCount: null };
            }

            throw new Error(`Unexpected query: ${text}`);
          }),
        };

        return await callback(client as never);
      });

      const { cache } = setupRouter();
      const { handleCreateClient } = loadModule();

      const req = createMockRequest({
        method: 'POST',
        user: { ...defaultUser, role: 'admin' },
        body: validPayload,
      });
      const res = createMockResponse();

      await handleCreateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        message: 'No service zone covers the provided location',
      });
      expect(recordedQueries.some(({ text }) => text.trim().toUpperCase() === 'ROLLBACK')).toBe(
        true
      );
      expect(cache.del).not.toHaveBeenCalled();
    });

    it('creates a client, inserts default care plan, and invalidates caches on success', async () => {
      process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [
            {
              formatted_address: '10 Downing St, London',
              geometry: {
                location: { lat: 51.5033635, lng: -0.1276248 },
              },
            },
          ],
        }),
      });

      const insertedRow = {
        id: '33333333-3333-3333-3333-333333333333',
        first_name: 'Ada',
        last_name: 'Lovelace',
        date_of_birth: '1990-05-20',
        address: '10 Downing St, London',
        latitude: '51.5033635',
        longitude: '-0.1276248',
        phone: '+441234567890',
        emergency_contact_name: 'Charles Babbage',
        emergency_contact_phone: '+44111222333',
        emergency_contact_relationship: 'Friend',
        zone_id: '22222222-2222-2222-2222-222222222222',
      };

      const recordedQueries: QueryCall[] = [];

      mockRunWithClient.mockImplementation(async (callback) => {
        const client = {
          query: jest.fn(async (text: string, values: unknown[] = []) => {
            recordedQueries.push({ text, values });
            const upper = text.trim().toUpperCase();

            if (upper === 'BEGIN') {
              return { rows: [], rowCount: null };
            }

            if (text.includes('determine_zone_for_point')) {
              return { rows: [{ zone_id: insertedRow.zone_id }] };
            }

            if (text.startsWith('INSERT INTO clients')) {
              return { rows: [insertedRow] };
            }

            if (text.startsWith('INSERT INTO care_plans')) {
              return { rows: [], rowCount: 1 };
            }

            if (upper === 'COMMIT') {
              return { rows: [], rowCount: null };
            }

            throw new Error(`Unexpected query: ${text}`);
          }),
        };

        return await callback(client as never);
      });

      const { cache } = setupRouter();
      const { handleCreateClient } = loadModule();

      const req = createMockRequest({
        method: 'POST',
        user: { ...defaultUser, role: 'admin' },
        body: validPayload,
      });
      const res = createMockResponse();

      await handleCreateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({
        id: insertedRow.id,
        firstName: insertedRow.first_name,
        lastName: insertedRow.last_name,
        dateOfBirth: '1990-05-20T00:00:00.000Z',
        address: insertedRow.address,
        latitude: 51.5033635,
        longitude: -0.1276248,
        zoneId: insertedRow.zone_id,
        phone: insertedRow.phone,
        emergencyContact: {
          name: insertedRow.emergency_contact_name,
          phone: insertedRow.emergency_contact_phone,
          relationship: insertedRow.emergency_contact_relationship,
        },
        carePlan: {
          summary: 'Initial care plan pending review',
          medications: [],
          allergies: [],
          specialInstructions: '',
        },
      });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('key=test-api-key'),
        expect.objectContaining({ method: 'GET' })
      );
      expect(recordedQueries.some(({ text }) => text.startsWith('INSERT INTO care_plans'))).toBe(
        true
      );
      expect(cache.del).toHaveBeenCalledWith(`clients:detail:${insertedRow.id}`);
      expect(cache.scan).toHaveBeenCalledWith('0', 'MATCH', 'clients:list:*', 'COUNT', 100);
    });
  });

  describe('handleUpdateClient', () => {
    const clientId = '33333333-3333-3333-3333-333333333333';

    type TestClientRow = {
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

    const createDbRow = (overrides: Partial<TestClientRow> = {}): TestClientRow => ({
      id: clientId,
      first_name: 'Ada',
      last_name: 'Lovelace',
      date_of_birth: '1990-05-20',
      address: '10 Downing St, London',
      latitude: '51.5033635',
      longitude: '-0.1276248',
      phone: '+441234567890',
      emergency_contact_name: 'Charles Babbage',
      emergency_contact_phone: '+44111222333',
      emergency_contact_relationship: 'Friend',
      zone_id: defaultUser.zoneId,
      ...overrides,
    });

    const setupUpdateRunWithClient = (
      options: {
        currentRow?: Partial<TestClientRow>;
        updatedRow?: Partial<TestClientRow>;
        zoneIdForCoordinates?: string | null;
      } = {}
    ) => {
      const recordedQueries: QueryCall[] = [];
      const currentRow = createDbRow(options.currentRow);
      const updatedRow = createDbRow(options.updatedRow);
      const zoneIdForCoordinates = options.zoneIdForCoordinates;

      mockRunWithClient.mockImplementation(
        async (
          callback: (client: {
            query: jest.Mock<Promise<{ rows: unknown[] }>, [string, unknown[]?]>;
          }) => Promise<unknown>
        ) => {
          const client = {
            query: jest.fn(async (text: string, values: unknown[] = []) => {
              recordedQueries.push({ text, values });
              const trimmed = text.trim();
              const upper = trimmed.toUpperCase();

              if (upper === 'BEGIN') {
                return { rows: [], rowCount: null };
              }

              if (upper.startsWith('SELECT') && upper.includes('FOR UPDATE')) {
                return { rows: [currentRow] };
              }

              if (text.includes('determine_zone_for_point')) {
                return {
                  rows: [
                    {
                      zone_id:
                        zoneIdForCoordinates === undefined
                          ? currentRow.zone_id
                          : zoneIdForCoordinates,
                    },
                  ],
                };
              }

              if (upper.startsWith('UPDATE CLIENTS')) {
                return { rows: [updatedRow] };
              }

              if (upper === 'COMMIT' || upper === 'ROLLBACK') {
                return { rows: [], rowCount: null };
              }

              throw new Error(`Unexpected query during test: ${text}`);
            }),
          };

          return await callback(client as never);
        }
      );

      return { recordedQueries, currentRow, updatedRow };
    };

    it('returns 401 when request is unauthenticated', async () => {
      const { cache } = setupRouter();
      const { handleUpdateClient } = loadModule();

      const req = createMockRequest({
        method: 'PATCH',
        user: null,
        params: { clientId },
        path: `/${clientId}`,
        body: { firstName: 'Updated' },
      });
      const res = createMockResponse();

      await handleUpdateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: 'Authentication required' });
      expect(mockRunWithClient).not.toHaveBeenCalled();
      expect(cache.del).not.toHaveBeenCalled();
    });

    it('returns 403 when user lacks coordinator or admin role', async () => {
      const { cache } = setupRouter();
      const { handleUpdateClient } = loadModule();

      const req = createMockRequest({
        method: 'PATCH',
        params: { clientId },
        path: `/${clientId}`,
        body: { firstName: 'Updated' },
      });
      const res = createMockResponse();

      await handleUpdateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: 'Insufficient permissions' });
      expect(mockRunWithClient).not.toHaveBeenCalled();
      expect(cache.del).not.toHaveBeenCalled();
    });

    it('returns 400 when clientId is invalid', async () => {
      const { cache } = setupRouter();
      const { handleUpdateClient } = loadModule();

      const req = createMockRequest({
        method: 'PATCH',
        params: { clientId: 'invalid-id' },
        path: '/invalid-id',
        body: { firstName: 'Updated' },
        user: { ...defaultUser, role: 'admin' },
      });
      const res = createMockResponse();

      await handleUpdateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: 'Invalid clientId' });
      expect(mockRunWithClient).not.toHaveBeenCalled();
      expect(cache.del).not.toHaveBeenCalled();
    });

    it('returns 400 when validation fails', async () => {
      const { cache } = setupRouter();
      const { handleUpdateClient } = loadModule();

      const req = createMockRequest({
        method: 'PATCH',
        params: { clientId },
        path: `/${clientId}`,
        body: {},
        user: { ...defaultUser, role: 'admin' },
      });
      const res = createMockResponse();

      await handleUpdateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        message: 'Invalid request body',
        errors: expect.arrayContaining(['At least one updatable field must be provided']),
      });
      expect(mockRunWithClient).not.toHaveBeenCalled();
      expect(cache.del).not.toHaveBeenCalled();
    });

    it('returns 404 when client does not exist', async () => {
      setupRouter();

      mockRunWithClient.mockImplementation(
        async (
          callback: (client: {
            query: jest.Mock<Promise<{ rows: unknown[] }>, [string, unknown[]?]>;
          }) => Promise<unknown>
        ) => {
          const client = {
            query: jest.fn(async (text: string) => {
              const upper = text.trim().toUpperCase();

              if (upper === 'BEGIN') {
                return { rows: [], rowCount: null };
              }

              if (upper.startsWith('SELECT') && upper.includes('FOR UPDATE')) {
                return { rows: [] };
              }

              if (upper === 'ROLLBACK' || upper === 'COMMIT') {
                return { rows: [], rowCount: null };
              }

              throw new Error(`Unexpected query during test: ${text}`);
            }),
          };

          return await callback(client as never);
        }
      );

      const { handleUpdateClient } = loadModule();

      const req = createMockRequest({
        method: 'PATCH',
        params: { clientId },
        path: `/${clientId}`,
        body: { firstName: 'Updated' },
        user: { ...defaultUser, role: 'admin' },
      });
      const res = createMockResponse();

      await handleUpdateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ message: 'Client not found' });
    });

    it('returns 403 when coordinator attempts to update a client in another zone', async () => {
      setupRouter();

      setupUpdateRunWithClient({
        currentRow: { zone_id: '88888888-8888-8888-8888-888888888888' },
      });

      const { handleUpdateClient } = loadModule();

      const req = createMockRequest({
        method: 'PATCH',
        params: { clientId },
        path: `/${clientId}`,
        body: { firstName: 'Updated' },
        user: { ...defaultUser, role: 'coordinator' },
      });
      const res = createMockResponse();

      await handleUpdateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: 'Insufficient permissions' });
    });

    it('returns 400 when geocoding returns zero results', async () => {
      const { cache } = setupRouter();
      process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
      });

      const { handleUpdateClient } = loadModule();

      const req = createMockRequest({
        method: 'PATCH',
        params: { clientId },
        path: `/${clientId}`,
        body: { address: 'Unknown place' },
        user: { ...defaultUser, role: 'admin' },
      });
      const res = createMockResponse();

      await handleUpdateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        message: 'Could not geocode address',
        errors: ['Address could not be located. Verify the details and try again.'],
      });
      expect(mockRunWithClient).not.toHaveBeenCalled();
      expect(cache.del).not.toHaveBeenCalled();
    });

    it('returns 400 when new coordinates cannot be mapped to a zone', async () => {
      const { cache } = setupRouter();
      process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [
            {
              formatted_address: '221B Baker St, London',
              geometry: {
                location: { lat: 51.523767, lng: -0.1585557 },
              },
            },
          ],
        }),
      });

      setupUpdateRunWithClient({
        zoneIdForCoordinates: null,
      });

      const { handleUpdateClient } = loadModule();

      const req = createMockRequest({
        method: 'PATCH',
        params: { clientId },
        path: `/${clientId}`,
        body: { address: '221B Baker St, London' },
        user: { ...defaultUser, role: 'admin' },
      });
      const res = createMockResponse();

      await handleUpdateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: 'No service zone covers the provided location' });
      expect(cache.del).not.toHaveBeenCalled();
    });

    it('applies partial updates and logs audit changes', async () => {
      const { cache } = setupRouter();

      const updatedRow = createDbRow({
        first_name: 'Grace',
        phone: null,
      });

      const { recordedQueries } = setupUpdateRunWithClient({
        updatedRow,
      });

      const { handleUpdateClient } = loadModule();

      const req = createMockRequest({
        method: 'PATCH',
        params: { clientId },
        path: `/${clientId}`,
        body: {
          firstName: 'Grace',
          phone: null,
        },
        user: { ...defaultUser, role: 'admin' },
      });
      const res = createMockResponse();

      await handleUpdateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        id: clientId,
        firstName: 'Grace',
        lastName: 'Lovelace',
        dateOfBirth: '1990-05-20T00:00:00.000Z',
        address: '10 Downing St, London',
        latitude: 51.5033635,
        longitude: -0.1276248,
        zoneId: defaultUser.zoneId,
        phone: '',
        emergencyContact: {
          name: 'Charles Babbage',
          phone: '+44111222333',
          relationship: 'Friend',
        },
      });

      expect(recordedQueries.some(({ text }) => text.toUpperCase().includes('FOR UPDATE'))).toBe(
        true
      );
      expect(recordedQueries.some(({ text }) => text.trim().startsWith('UPDATE clients'))).toBe(
        true
      );
      expect(cache.del).toHaveBeenCalledWith(`clients:detail:${clientId}`);
      expect(cache.scan).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'audit:client.updated',
        expect.objectContaining({
          event: 'client.updated',
          clientId,
          userId: defaultUser.id,
          changes: expect.objectContaining({
            firstName: { previous: 'Ada', current: 'Grace' },
            phone: { previous: '+441234567890', current: null },
          }),
        })
      );
    });

    it('updates address with geocoding, reassigns zone, and invalidates cache', async () => {
      const { cache } = setupRouter();
      process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [
            {
              formatted_address: '1600 Amphitheatre Parkway, Mountain View, CA',
              geometry: {
                location: { lat: 37.4224764, lng: -122.0842499 },
              },
            },
          ],
        }),
      });

      const newZoneId = defaultUser.zoneId;

      const updatedRow = createDbRow({
        address: '1600 Amphitheatre Parkway, Mountain View, CA',
        latitude: 37.4224764,
        longitude: -122.0842499,
        zone_id: newZoneId,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        emergency_contact_relationship: null,
      });

      const { recordedQueries } = setupUpdateRunWithClient({
        updatedRow,
        zoneIdForCoordinates: newZoneId,
      });

      const { handleUpdateClient } = loadModule();

      const req = createMockRequest({
        method: 'PATCH',
        params: { clientId },
        path: `/${clientId}`,
        body: {
          address: '1600 Amphitheatre Parkway, Mountain View, CA',
          emergencyContact: null,
        },
        user: { ...defaultUser, role: 'coordinator' },
      });
      const res = createMockResponse();

      await handleUpdateClient(
        req as unknown as express.Request,
        res as unknown as express.Response
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        id: clientId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        dateOfBirth: '1990-05-20T00:00:00.000Z',
        address: '1600 Amphitheatre Parkway, Mountain View, CA',
        latitude: 37.4224764,
        longitude: -122.0842499,
        zoneId: newZoneId,
        phone: '+441234567890',
        emergencyContact: {
          name: '',
          phone: '',
          relationship: '',
        },
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(
        recordedQueries.find(({ text }) => text.includes('determine_zone_for_point'))
      ).toBeDefined();
      expect(cache.del).toHaveBeenCalledWith(`clients:detail:${clientId}`);
      expect(logger.info).toHaveBeenCalledWith(
        'audit:client.updated',
        expect.objectContaining({
          changes: expect.objectContaining({
            address: {
              previous: '10 Downing St, London',
              current: '1600 Amphitheatre Parkway, Mountain View, CA',
            },
            latitude: {
              previous: 51.5033635,
              current: 37.4224764,
            },
            longitude: {
              previous: -0.1276248,
              current: -122.0842499,
            },
            'emergencyContact.name': {
              previous: 'Charles Babbage',
              current: null,
            },
            'emergencyContact.phone': {
              previous: '+44111222333',
              current: null,
            },
            'emergencyContact.relationship': {
              previous: 'Friend',
              current: null,
            },
          }),
        })
      );
    });
  });

  describe('handleGetClient', () => {
    const clientId = '22222222-2222-2222-2222-222222222222';

    it('returns 401 when request is unauthenticated', async () => {
      const { cache } = setupRouter();
      cache.get.mockResolvedValue(null);

      const { handleGetClient } = loadModule();

      const req = createMockRequest({
        user: null,
        params: { clientId },
        path: `/${clientId}`,
      });
      const res = createMockResponse();

      await handleGetClient(req as unknown as express.Request, res as unknown as express.Response);

      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: 'Authentication required' });
      expect(cache.get).not.toHaveBeenCalled();
      expect(mockRunWithClient).not.toHaveBeenCalled();
    });

    it('returns 400 when clientId is invalid', async () => {
      const { cache } = setupRouter();
      cache.get.mockResolvedValue(null);

      const { handleGetClient } = loadModule();

      const req = createMockRequest({
        params: { clientId: 'not-a-uuid' },
        path: '/not-a-uuid',
      });
      const res = createMockResponse();

      await handleGetClient(req as unknown as express.Request, res as unknown as express.Response);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: 'Invalid clientId' });
      expect(cache.get).not.toHaveBeenCalled();
      expect(mockRunWithClient).not.toHaveBeenCalled();
    });

    it('returns cached response when available for authorised user', async () => {
      const { cache } = setupRouter();
      const cachedResponse = {
        id: clientId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        dateOfBirth: '1815-12-10T00:00:00.000Z',
        address: 'London',
        latitude: 51.5,
        longitude: -0.13,
        phone: '+441234567890',
        emergencyContact: {
          name: 'Charles Babbage',
          phone: '+44000000000',
          relationship: 'Friend',
        },
        carePlan: {
          summary: 'Care summary',
          medications: [],
          allergies: [],
          specialInstructions: '',
        },
        recentVisits: [],
      };

      cache.get.mockResolvedValue(
        JSON.stringify({
          zoneId: defaultUser.zoneId,
          payload: cachedResponse,
        })
      );

      const { handleGetClient } = loadModule();

      const req = createMockRequest({
        params: { clientId },
        path: `/${clientId}`,
      });
      const res = createMockResponse();

      await handleGetClient(req as unknown as express.Request, res as unknown as express.Response);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(cachedResponse);
      expect(mockRunWithClient).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('fetches client detail from database and caches response', async () => {
      const { cache } = setupRouter();
      cache.get.mockResolvedValue(null);

      const clientRow = {
        id: clientId,
        first_name: 'Ada',
        last_name: 'Lovelace',
        date_of_birth: '1815-12-10',
        address: 'London',
        latitude: '51.5074',
        longitude: '-0.1278',
        phone: '+441234567890',
        emergency_contact_name: 'Charles Babbage',
        emergency_contact_phone: '+44000000000',
        emergency_contact_relationship: 'Friend',
        zone_id: defaultUser.zoneId,
        care_plan_summary: 'Care summary',
        care_plan_medications: [
          { name: 'Medication A', dosage: '5mg', frequency: 'daily' },
          { name: 'Medication B', dosage: '10mg', frequency: 'weekly' },
        ],
        care_plan_allergies: ['Peanuts'],
        care_plan_special_instructions: 'Handle with care',
      };

      const visits = [
        {
          id: 'visit-1',
          visit_date: new Date('2024-05-01T10:00:00Z'),
          staff_first_name: 'Grace',
          staff_last_name: 'Hopper',
          duration_minutes: 45,
        },
        {
          id: 'visit-2',
          visit_date: null,
          staff_first_name: null,
          staff_last_name: null,
          duration_minutes: null,
        },
      ];

      mockRunWithClient.mockImplementation(
        async (callback: (client: { query: jest.Mock }) => Promise<unknown>) => {
          const query = jest
            .fn()
            .mockResolvedValueOnce({ rows: [clientRow] })
            .mockResolvedValueOnce({ rows: visits });

          return await callback({ query });
        }
      );

      const { handleGetClient } = loadModule();

      const req = createMockRequest({
        params: { clientId },
        path: `/${clientId}`,
      });
      const res = createMockResponse();

      await handleGetClient(req as unknown as express.Request, res as unknown as express.Response);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        id: clientId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        dateOfBirth: '1815-12-10T00:00:00.000Z',
        address: 'London',
        latitude: 51.5074,
        longitude: -0.1278,
        phone: '+441234567890',
        emergencyContact: {
          name: 'Charles Babbage',
          phone: '+44000000000',
          relationship: 'Friend',
        },
        carePlan: {
          summary: 'Care summary',
          medications: [
            { name: 'Medication A', dosage: '5mg', frequency: 'daily' },
            { name: 'Medication B', dosage: '10mg', frequency: 'weekly' },
          ],
          allergies: ['Peanuts'],
          specialInstructions: 'Handle with care',
        },
        recentVisits: [
          {
            id: 'visit-1',
            date: '2024-05-01T10:00:00.000Z',
            staffName: 'Grace Hopper',
            duration: 45,
          },
          {
            id: 'visit-2',
            date: '',
            staffName: '',
            duration: 0,
          },
        ],
      });
      expect(cache.set).toHaveBeenCalledWith(
        `clients:detail:${clientId}`,
        expect.any(String),
        'EX',
        900
      );
      const cachePayloadCall = cache.set.mock.calls[0]?.[1];
      expect(cachePayloadCall).toBeDefined();
      const parsedCache = cachePayloadCall ? JSON.parse(cachePayloadCall) : null;
      expect(parsedCache).toEqual({
        zoneId: defaultUser.zoneId,
        payload: res.body,
      });
      expect(mockRunWithClient).toHaveBeenCalledWith(expect.any(Function), {
        useReadReplica: true,
      });
    });

    it('returns 404 when client does not exist', async () => {
      const { cache } = setupRouter();
      cache.get.mockResolvedValue(null);

      mockRunWithClient.mockImplementation(
        async (callback: (client: { query: jest.Mock }) => Promise<unknown>) => {
          const query = jest.fn().mockResolvedValueOnce({ rows: [] });
          return await callback({ query });
        }
      );

      const { handleGetClient } = loadModule();

      const req = createMockRequest({
        params: { clientId },
        path: `/${clientId}`,
      });
      const res = createMockResponse();

      await handleGetClient(req as unknown as express.Request, res as unknown as express.Response);

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ message: 'Client not found' });
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('returns 403 when client belongs to different zone', async () => {
      const { cache } = setupRouter();
      cache.get.mockResolvedValue(null);

      const clientRow = {
        id: clientId,
        first_name: 'Ada',
        last_name: 'Lovelace',
        date_of_birth: '1815-12-10',
        address: 'London',
        latitude: null,
        longitude: null,
        phone: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        emergency_contact_relationship: null,
        zone_id: '33333333-3333-3333-3333-333333333333',
        care_plan_summary: null,
        care_plan_medications: [],
        care_plan_allergies: [],
        care_plan_special_instructions: null,
      };

      mockRunWithClient.mockImplementation(
        async (callback: (client: { query: jest.Mock }) => Promise<unknown>) => {
          const query = jest
            .fn()
            .mockResolvedValueOnce({ rows: [clientRow] })
            .mockResolvedValueOnce({ rows: [] });

          return await callback({ query });
        }
      );

      const { handleGetClient } = loadModule();

      const req = createMockRequest({
        params: { clientId },
        path: `/${clientId}`,
      });
      const res = createMockResponse();

      await handleGetClient(req as unknown as express.Request, res as unknown as express.Response);

      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: 'Insufficient permissions' });
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('fetches from database when cached zone does not match user', async () => {
      const { cache } = setupRouter();
      cache.get.mockResolvedValue(
        JSON.stringify({
          zoneId: '99999999-9999-9999-9999-999999999999',
          payload: { id: 'stale' },
        })
      );

      const clientRow = {
        id: clientId,
        first_name: 'Ada',
        last_name: 'Lovelace',
        date_of_birth: '1815-12-10',
        address: 'London',
        latitude: null,
        longitude: null,
        phone: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        emergency_contact_relationship: null,
        zone_id: defaultUser.zoneId,
        care_plan_summary: null,
        care_plan_medications: [],
        care_plan_allergies: [],
        care_plan_special_instructions: null,
      };

      mockRunWithClient.mockImplementation(
        async (callback: (client: { query: jest.Mock }) => Promise<unknown>) => {
          const query = jest
            .fn()
            .mockResolvedValueOnce({ rows: [clientRow] })
            .mockResolvedValueOnce({ rows: [] });

          return await callback({ query });
        }
      );

      const { handleGetClient } = loadModule();

      const req = createMockRequest({
        params: { clientId },
        path: `/${clientId}`,
      });
      const res = createMockResponse();

      await handleGetClient(req as unknown as express.Request, res as unknown as express.Response);

      expect(res.statusCode).toBe(200);
      expect(mockRunWithClient).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
    });
  });
});
