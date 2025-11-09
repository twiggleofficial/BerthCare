import type Database from '@nozbe/watermelondb/Database';
import { beforeEach, describe, expect, it } from 'vitest';

import { ClientRepository } from '../client-repository';
import { VisitRepository, type CreateVisitInput } from '../visit-repository';
import type { RepositoryDependencies } from '../base-repository';
import {
  createRepositoryDependencies,
  createTestDatabase,
  resetDatabase,
} from './test-helpers';

describe('VisitRepository', () => {
  let database: Database;
  let deps: RepositoryDependencies;
  let repository: VisitRepository;
  let clientRepository: ClientRepository;
  let localIdCounter: number;

  beforeEach(async () => {
    database = createTestDatabase();
    await resetDatabase(database);
    deps = createRepositoryDependencies(database);
    repository = new VisitRepository(deps);
    clientRepository = new ClientRepository(deps);
    localIdCounter = 1;
    await deps.queue.clear();
  });

  const createClient = async (overrides: Record<string, unknown> = {}) => {
    const client = await clientRepository.create({
      firstName: 'Visit',
      lastName: overrides.lastName ? String(overrides.lastName) : 'Client',
      dateOfBirth: '1980-06-15',
      address: '55 Care Ave',
      zoneId: overrides.zoneId ? String(overrides.zoneId) : 'north',
      phone: null,
      carePlanSummary: null,
      allergies: [],
      specialInstructions: null,
    });
    await deps.queue.clear();
    return client;
  };

  type VisitInputOverrides = Partial<CreateVisitInput> & { zoneId?: string };

  const baseVisitInput = async (
    overrides: VisitInputOverrides = {},
  ): Promise<CreateVisitInput> => {
    const zoneId = overrides.zoneId ?? 'north';
    const client = overrides.clientId ? { id: overrides.clientId } : await createClient({ zoneId });
    return {
      clientId: client.id,
      localId: overrides.localId ?? `local-${localIdCounter++}`,
      scheduledStartTime: overrides.scheduledStartTime ?? new Date('2024-02-01T12:00:00Z'),
      status: overrides.status ?? 'scheduled',
      checkInTime: overrides.checkInTime,
      checkOutTime: overrides.checkOutTime,
      durationMinutes: overrides.durationMinutes,
      copiedFromVisitId: overrides.copiedFromVisitId ?? null,
      staffId: overrides.staffId ?? null,
      isActive: overrides.isActive ?? true,
      syncState: overrides.syncState,
      checkInLocation: overrides.checkInLocation,
      checkOutLocation: overrides.checkOutLocation,
    };
  };

  it('filters visits by status and keeps ordering by start time', async () => {
    await repository.create(
      await baseVisitInput({
        status: 'scheduled',
        localId: 'visit-10',
        scheduledStartTime: new Date('2024-02-01T10:00:00Z'),
      }),
    );
    await repository.create(
      await baseVisitInput({
        status: 'completed',
        localId: 'visit-8',
        scheduledStartTime: new Date('2024-02-01T08:00:00Z'),
      }),
    );
    await repository.create(
      await baseVisitInput({
        status: 'scheduled',
        localId: 'visit-9',
        scheduledStartTime: new Date('2024-02-01T09:00:00Z'),
      }),
    );

    const scheduled = await repository.getByStatus('scheduled');
    expect(scheduled).toHaveLength(2);
    expect(scheduled.map((visit) => visit.localId)).toEqual(['visit-9', 'visit-10']);
  });

  it('returns zone-specific visits using the client relation', async () => {
    const northClient = await createClient({ zoneId: 'north', lastName: 'North' });
    const southClient = await createClient({ zoneId: 'south', lastName: 'South' });

    await repository.create(
      await baseVisitInput({ clientId: northClient.id, status: 'scheduled', localId: 'north' }),
    );
    await repository.create(
      await baseVisitInput({ clientId: southClient.id, status: 'scheduled', localId: 'south' }),
    );

    const northVisits = await repository.getByZone('north');
    expect(northVisits).toHaveLength(1);
    expect(northVisits[0].clientId).toBe(northClient.id);
    expect(northVisits[0].localId).toBe('north');
  });

  it('queues optimistic updates when visit status changes', async () => {
    const visit = await repository.create(await baseVisitInput({ status: 'scheduled' }));
    const queue = deps.queue;

    await repository.updateStatus(visit.id, 'completed');

    const pending = await queue.list();
    const updateEntry = pending.find(
      (change) => change.recordId === visit.id && change.operation === 'update',
    );
    expect(updateEntry).toBeDefined();
    expect(updateEntry?.payload).toMatchObject({ status: 'completed' });
  });

  it('getRecent returns the latest visits first', async () => {
    await repository.create(await baseVisitInput({ localId: 'one' }));
    await repository.create(await baseVisitInput({ localId: 'two' }));
    await repository.create(await baseVisitInput({ localId: 'three' }));

    const recent = await repository.getRecent(2, { since: new Date('2023-01-01T00:00:00Z') });
    expect(recent.map((visit) => visit.localId)).toEqual(['three', 'two']);
  });

  it('getRecent coerces invalid limits to the default', async () => {
    const client = await createClient();
    for (let index = 0; index < 20; index += 1) {
      await repository.create(
        await baseVisitInput({
          clientId: client.id,
          localId: `invalid-${index}`,
        }),
      );
    }

    const options = { since: new Date('2023-01-01T00:00:00Z') };
    const negativeLimit = await repository.getRecent(-5, options);
    expect(negativeLimit).toHaveLength(VisitRepository.DEFAULT_RECENT_LIMIT);

    const nanLimit = await repository.getRecent(Number.NaN, options);
    expect(nanLimit).toHaveLength(VisitRepository.DEFAULT_RECENT_LIMIT);
  });

  it('getRecent clamps requested limits to the maximum safe size', async () => {
    const client = await createClient();
    const totalVisits = VisitRepository.MAX_RECENT_LIMIT + 10;
    for (let index = 0; index < totalVisits; index += 1) {
      await repository.create(
        await baseVisitInput({
          clientId: client.id,
          localId: `bounded-${index}`,
        }),
      );
    }

    const since = new Date('2023-01-01T00:00:00Z');
    const recent = await repository.getRecent(VisitRepository.MAX_RECENT_LIMIT * 4, { since });
    expect(recent).toHaveLength(VisitRepository.MAX_RECENT_LIMIT);
  });
});
