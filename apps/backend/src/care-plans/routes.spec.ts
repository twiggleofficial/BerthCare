/**
 * @jest-environment node
 */

import type { Request, Response } from 'express';

const mockRunWithClient = jest.fn();
const mockInvalidateClientCaches = jest.fn();

jest.mock('../auth/middleware', () => ({
  authenticateJwt: (_req: Request, _res: Response, next: () => void) => next(),
  authorizeRoles: () => (_req: Request, _res: Response, next: () => void) => next(),
}));

jest.mock('../database/pool', () => ({
  runWithClient: (...args: unknown[]) => mockRunWithClient(...args),
}));

jest.mock('../clients/cache', () => ({
  invalidateClientCaches: (...args: unknown[]) => mockInvalidateClientCaches(...args),
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

type MockQueryResult = {
  rows: Array<Record<string, unknown>>;
  rowCount: number | null;
};

type TestResponse = Response & {
  statusCalls: number[];
  jsonPayload: unknown;
};

const createMockResponse = (): TestResponse => {
  const statusMock = jest.fn();
  const jsonMock = jest.fn();

  const res = {
    statusCalls: [] as number[],
    jsonPayload: undefined as unknown,
    headersSent: false,
    status: statusMock,
    json: jsonMock,
  } as Partial<Response> & { statusCalls: number[]; jsonPayload: unknown };

  statusMock.mockImplementation((code: number) => {
    res.statusCalls.push(code);
    return res as unknown as Response;
  });

  jsonMock.mockImplementation((payload: unknown) => {
    res.jsonPayload = payload;
    res.headersSent = true;
    return res as unknown as Response;
  });

  return res as TestResponse;
};

const createMockRequest = (
  body: Record<string, unknown>,
  user = {
    id: 'user-1',
    role: 'admin',
    zoneId: '11111111-1111-1111-1111-111111111111',
    token: 'access-token',
    tokenExpiresAt: Date.now() + 60_000,
  }
): Request =>
  ({
    body,
    user,
  }) as unknown as Request;

const loadModule = () => {
  let module: typeof import('./routes');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    module = require('./routes');
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return module!;
};

type MockClientOptions = {
  clientZone?: string | null;
  latestVersion?: number | null;
  insertRow?: Record<string, unknown>;
  insertError?: Error;
};

const createMockClient = (options: MockClientOptions = {}) => {
  const state: {
    insertValues?: unknown[];
    beginCount: number;
    commitCount: number;
    rollbackCount: number;
  } = {
    beginCount: 0,
    commitCount: 0,
    rollbackCount: 0,
  };

  const query = jest.fn(async (text: string, values: unknown[] = []): Promise<MockQueryResult> => {
    const normalised = text.trim().toUpperCase();

    if (normalised === 'BEGIN') {
      state.beginCount += 1;
      return { rows: [], rowCount: null };
    }

    if (normalised === 'COMMIT') {
      state.commitCount += 1;
      return { rows: [], rowCount: null };
    }

    if (normalised === 'ROLLBACK') {
      state.rollbackCount += 1;
      return { rows: [], rowCount: null };
    }

    if (text.includes('FROM clients')) {
      if (options.clientZone === undefined) {
        return { rows: [], rowCount: 0 };
      }

      return {
        rows: [{ zone_id: options.clientZone }],
        rowCount: 1,
      };
    }

    if (text.includes('SELECT version')) {
      if (options.latestVersion === null || options.latestVersion === undefined) {
        return { rows: [], rowCount: 0 };
      }

      return {
        rows: [{ version: options.latestVersion }],
        rowCount: 1,
      };
    }

    if (text.includes('INSERT INTO care_plans')) {
      if (options.insertError) {
        throw options.insertError;
      }

      state.insertValues = values;
      const row =
        options.insertRow ??
        ({
          id: 'plan-123',
          version:
            (options.latestVersion === null || options.latestVersion === undefined
              ? 0
              : options.latestVersion) + 1,
          created_at: new Date('2025-01-01T00:00:00.000Z'),
          updated_at: new Date('2025-01-02T00:00:00.000Z'),
        } as Record<string, unknown>);

      return {
        rows: [row],
        rowCount: 1,
      };
    }

    throw new Error(`Unexpected query: ${text}`);
  });

  return {
    client: { query },
    state,
  };
};

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockRunWithClient.mockReset();
  mockInvalidateClientCaches.mockResolvedValue(undefined);
  logger.info.mockClear();
  logger.warn.mockClear();
  logger.error.mockClear();
  logger.debug.mockClear();
});

describe('handleCreateOrUpdateCarePlan', () => {
  it('creates a new care plan and returns the inserted record', async () => {
    const { client, state } = createMockClient({
      clientZone: '11111111-1111-1111-1111-111111111111',
      latestVersion: 2,
    });
    const mockClient = client as unknown as { query: typeof client.query };

    mockRunWithClient.mockImplementation(
      async (callback: (client: unknown) => Promise<unknown>) => await callback(mockClient)
    );

    const { handleCreateOrUpdateCarePlan } = loadModule();
    const res = createMockResponse();
    const req = createMockRequest({
      clientId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      summary: '  Updated care plan ',
      medications: [{ name: '  Aspirin  ', dosage: '81mg', frequency: 'daily' }],
      allergies: ['  Latex '],
      specialInstructions: '  Monitor blood pressure daily  ',
    });

    await handleCreateOrUpdateCarePlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: 'plan-123',
      clientId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      summary: 'Updated care plan',
      medications: [{ name: 'Aspirin', dosage: '81mg', frequency: 'daily' }],
      allergies: ['Latex'],
      specialInstructions: 'Monitor blood pressure daily',
      version: 3,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
    });

    expect(state.insertValues).toEqual([
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'Updated care plan',
      JSON.stringify([{ name: 'Aspirin', dosage: '81mg', frequency: 'daily' }]),
      JSON.stringify(['Latex']),
      'Monitor blood pressure daily',
      3,
    ]);
    expect(mockInvalidateClientCaches).toHaveBeenCalledWith('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(logger.info).toHaveBeenCalledWith('audit:care_plan.updated', expect.any(Object));
  });

  it('returns validation errors for invalid payloads', async () => {
    const { handleCreateOrUpdateCarePlan } = loadModule();
    const res = createMockResponse();
    const req = createMockRequest({});

    await handleCreateOrUpdateCarePlan(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid request body',
      errors: ['clientId is required', 'summary is required'],
    });
    expect(mockRunWithClient).not.toHaveBeenCalled();
  });

  it('returns 404 when the client does not exist', async () => {
    const { client } = createMockClient({ clientZone: undefined });
    const mockClient = client as unknown as { query: typeof client.query };

    mockRunWithClient.mockImplementation(
      async (callback: (client: unknown) => Promise<unknown>) => await callback(mockClient)
    );

    const { handleCreateOrUpdateCarePlan } = loadModule();
    const res = createMockResponse();
    const req = createMockRequest({
      clientId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      summary: 'Summary',
      medications: [],
      allergies: [],
    });

    await handleCreateOrUpdateCarePlan(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Client not found' });
    expect(mockInvalidateClientCaches).not.toHaveBeenCalled();
  });

  it('returns 403 when the coordinator is not assigned to the client zone', async () => {
    const coordinatorUser = {
      id: 'user-2',
      role: 'coordinator',
      zoneId: '77777777-7777-7777-7777-777777777777',
      token: 'access-token',
      tokenExpiresAt: Date.now() + 60_000,
    };

    const { client } = createMockClient({
      clientZone: '99999999-9999-9999-9999-999999999999',
    });
    const mockClient = client as unknown as { query: typeof client.query };

    mockRunWithClient.mockImplementation(
      async (callback: (client: unknown) => Promise<unknown>) => await callback(mockClient)
    );

    const { handleCreateOrUpdateCarePlan } = loadModule();
    const res = createMockResponse();
    const req = createMockRequest(
      {
        clientId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        summary: 'Summary',
        medications: [],
        allergies: [],
      },
      coordinatorUser
    );

    await handleCreateOrUpdateCarePlan(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
    expect(mockInvalidateClientCaches).not.toHaveBeenCalled();
  });

  it('returns 500 when database insertion fails', async () => {
    const insertError = new Error('insert failed');
    const { client } = createMockClient({
      clientZone: '11111111-1111-1111-1111-111111111111',
      latestVersion: 1,
      insertError,
    });
    const mockClient = client as unknown as { query: typeof client.query };

    mockRunWithClient.mockImplementation(
      async (callback: (client: unknown) => Promise<unknown>) => await callback(mockClient)
    );

    const { handleCreateOrUpdateCarePlan } = loadModule();
    const res = createMockResponse();
    const req = createMockRequest({
      clientId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      summary: 'Summary',
      medications: [],
      allergies: [],
    });

    await handleCreateOrUpdateCarePlan(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unable to update care plan at this time' });
    expect(logger.error).toHaveBeenCalledWith('Failed to create care plan', {
      error: 'insert failed',
      clientId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    });
  });
});
