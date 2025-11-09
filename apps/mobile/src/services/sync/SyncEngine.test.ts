import type Database from '@nozbe/watermelondb/Database';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Client } from '../../database/models/client';
import type { RepositoryDependencies } from '../../database/repositories/base-repository';
import { ClientRepository } from '../../database/repositories/client-repository';
import {
  createDeterministicClock,
  createTestDatabase,
  resetDatabase,
} from '../../database/repositories/__tests__/test-helpers';
import { SyncQueue } from './SyncQueue';
import { SyncEngine } from './SyncEngine';

type SyncEngineDeps = ConstructorParameters<typeof SyncEngine>[0];
type SyncStoreAdapter = NonNullable<SyncEngineDeps['store']>;
type SyncApiClient = NonNullable<SyncEngineDeps['api']>;
type DeterministicClock = ReturnType<typeof createDeterministicClock>;
type ApiPostMock = Mock<
  Parameters<SyncApiClient['post']>,
  ReturnType<SyncApiClient['post']>
>;
type MockedSyncApiClient = SyncApiClient & {
  post: ApiPostMock;
};

type StoreHarness = {
  adapter: SyncStoreAdapter;
  beginSync: SyncStoreAdapter['beginSync'];
  completeSync: SyncStoreAdapter['completeSync'];
  setOnline: (next: boolean) => void;
  setLastSync: (value: Date) => void;
};

const createStoreHarness = (initialLastSync = new Date('2024-01-01T00:00:00Z')): StoreHarness => {
  let isOnline = true;
  let lastSyncTime = initialLastSync;
  const beginSync = vi.fn<
    Parameters<SyncStoreAdapter['beginSync']>,
    ReturnType<SyncStoreAdapter['beginSync']>
  >();
  const completeSync = vi.fn<
    Parameters<SyncStoreAdapter['completeSync']>,
    ReturnType<SyncStoreAdapter['completeSync']>
  >((options?: Parameters<SyncStoreAdapter['completeSync']>[0]) => {
    if (options?.isError) {
      return;
    }

    if (options?.completedAt) {
      lastSyncTime = options.completedAt;
    }
  });

  return {
    adapter: {
      beginSync,
      completeSync,
      getIsOnline: () => isOnline,
      getLastSyncTime: () => lastSyncTime,
    },
    beginSync,
    completeSync,
    setOnline: (next: boolean) => {
      isOnline = next;
    },
    setLastSync: (value: Date) => {
      lastSyncTime = value;
    },
  };
};

const createLoggerStub = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

const createApiClientMock = (): MockedSyncApiClient => {
  const post: ApiPostMock = vi.fn();
  return { post };
};

describe('SyncEngine', () => {
  let database: Database;
  let queue: SyncQueue;
  let storeHarness: StoreHarness;
  let api: MockedSyncApiClient;
  let logger: ReturnType<typeof createLoggerStub>;
  let clock: DeterministicClock;
  let engine: SyncEngine;

  beforeEach(async () => {
    database = createTestDatabase();
    await resetDatabase(database);
    clock = createDeterministicClock();
    queue = new SyncQueue(database, { now: clock.next });
    storeHarness = createStoreHarness();
    api = createApiClientMock();
    logger = createLoggerStub();
    engine = new SyncEngine({
      database,
      queue,
      api,
      store: storeHarness.adapter,
      logger,
      now: clock.next,
    });
  });

  it('aborts sync when offline without calling the API', async () => {
    storeHarness.setOnline(false);

    const result = await engine.sync();

    expect(result.status).toBe('offline');
    expect(api.post).not.toHaveBeenCalled();
    expect(storeHarness.beginSync).not.toHaveBeenCalled();
  });

  it('pushes pending changes, pulls server updates, and updates last sync time', async () => {
    const change = await queue.enqueue({
      table: 'clients',
      recordId: 'client-local-1',
      operation: 'update',
      payload: {
        id: 'client-local-1',
        firstName: 'Offline',
        lastName: 'Care',
        updatedAt: new Date('2024-01-02T00:00:00Z').toISOString(),
      },
    });

    api.post.mockResolvedValue({
      data: {
        results: [
          {
            localId: change.id,
            status: 'success',
            entity: 'client',
          },
        ],
        serverChanges: [
          {
            type: 'create',
            entity: 'client',
            data: {
              id: 'server-client-1',
              firstName: 'Server',
              lastName: 'Client',
              dateOfBirth: '1985-07-01',
              address: '100 Cloud Lane',
              zoneId: 'north',
              isActive: true,
              createdAt: '2024-02-01T00:00:00Z',
              updatedAt: '2024-02-01T00:00:00Z',
              syncState: 'synced',
            },
            timestamp: '2024-02-01T00:00:00Z',
          },
        ],
        newSyncTimestamp: '2024-02-01T00:10:00Z',
      },
    });

    const result = await engine.sync();

    if (result.status !== 'success') {
      throw new Error('Expected successful sync result');
    }

    expect(api.post).toHaveBeenCalledTimes(1);
    const payload = api.post.mock.calls[0]?.[1];
    expect(payload?.operations).toHaveLength(1);
    expect(payload?.lastSyncTimestamp).toBe('2024-01-01T00:00:00.000Z');

    expect(result.pushed).toBe(1);
    expect(result.pulled).toBe(1);
    expect(result.conflicts).toBe(0);
    expect(result.lastSyncTime.toISOString()).toBe('2024-02-01T00:10:00.000Z');
    expect(await queue.count()).toBe(0);

    const clientCollection = database.get<Client>('clients');
    const serverRecord = await clientCollection.find('server-client-1');
    expect(serverRecord.firstName).toBe('Server');
    expect(storeHarness.completeSync).toHaveBeenCalled();
  });

  it('resolves conflicts via last-write-wins when server timestamp is newer', async () => {
    const deps: RepositoryDependencies = {
      database,
      queue,
      now: clock.next,
    };
    const clientRepository = new ClientRepository(deps);
    const client = await clientRepository.create({
      firstName: 'Conflict',
      lastName: 'Case',
      dateOfBirth: '1990-01-01',
      address: '111 Local St',
      zoneId: 'central',
      syncState: 'pending',
    });
    await queue.clear();
    await clientRepository.update(client.id, { phone: '111-1111' });

    api.post.mockResolvedValue({
      data: {
        results: [],
        serverChanges: [
          {
            type: 'update',
            entity: 'client',
            data: {
              id: client.id,
              phone: '999-9999',
              firstName: 'Conflict',
              lastName: 'Case',
              updatedAt: '2024-03-01T00:00:00Z',
            },
            timestamp: '2024-03-01T00:00:00Z',
          },
        ],
        newSyncTimestamp: '2024-03-01T00:05:00Z',
      },
    });

    const result = await engine.sync();

    expect(result.conflicts).toBe(1);
    expect(await queue.count()).toBe(0);

    const refreshed = await database.get<Client>('clients').find(client.id);
    expect(refreshed.phone).toBe('999-9999');
    expect(storeHarness.completeSync).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Sync conflict resolved via last-write-wins; logged to sync_log.',
      expect.objectContaining({
        entity: 'client',
        recordId: client.id,
        resolution: 'server',
      }),
    );
  });
});
