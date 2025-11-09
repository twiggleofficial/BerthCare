import type Database from '@nozbe/watermelondb/Database';
import { beforeEach, describe, expect, it } from 'vitest';

import type { RepositoryDependencies } from '../repositories/base-repository';
import { ClientRepository } from '../repositories/client-repository';
import { VisitRepository } from '../repositories/visit-repository';
import {
  createRepositoryDependencies,
  createTestDatabase,
  resetDatabase,
} from '../repositories/__tests__/test-helpers';

describe('Visit model', () => {
  let database: Database;
  let deps: RepositoryDependencies;
  let visitRepository: VisitRepository;
  let clientRepository: ClientRepository;

  beforeEach(async () => {
    database = createTestDatabase();
    await resetDatabase(database);
    deps = createRepositoryDependencies(database);
    visitRepository = new VisitRepository(deps);
    clientRepository = new ClientRepository(deps);
    await deps.queue.clear();
  });

  const createClient = async () => {
    const client = await clientRepository.create({
      firstName: 'Visit',
      lastName: 'Client',
      dateOfBirth: '1980-01-01',
      address: '1 Care St',
      zoneId: 'north',
      phone: null,
      carePlanSummary: null,
      allergies: [],
      specialInstructions: null,
    });
    await deps.queue.clear();
    return client;
  };

  it('marks checkout without check-in as invalid timing when no duration is provided', async () => {
    const client = await createClient();
    const visit = await visitRepository.create({
      clientId: client.id,
      localId: 'visit-1',
      scheduledStartTime: new Date('2024-02-01T10:00:00Z'),
      status: 'scheduled',
      isActive: true,
    });
    await deps.queue.clear();

    await visit.recordCheckOut({ timestamp: new Date('2024-02-01T11:00:00Z') });
    const updated = await visitRepository.findById(visit.id);

    expect(updated?.status).toBe('invalid_timing');
    expect(updated?.durationMinutes).toBeNull();
  });
});
