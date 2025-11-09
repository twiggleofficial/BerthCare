import type Database from '@nozbe/watermelondb/Database';
import { beforeEach, describe, expect, it } from 'vitest';

import { ClientRepository, type CreateClientInput } from '../client-repository';
import type { RepositoryDependencies } from '../base-repository';
import {
  createRepositoryDependencies,
  createTestDatabase,
  resetDatabase,
} from './test-helpers';

describe('ClientRepository', () => {
  let database: Database;
  let deps: RepositoryDependencies;
  let repository: ClientRepository;

  beforeEach(async () => {
    database = createTestDatabase();
    await resetDatabase(database);
    deps = createRepositoryDependencies(database);
    repository = new ClientRepository(deps);
  });

  const baseInput = (overrides: Partial<CreateClientInput> = {}): CreateClientInput => ({
    firstName: 'Care',
    lastName: 'Giver',
    dateOfBirth: '1990-01-01',
    address: '123 Main St',
    zoneId: 'north',
    phone: '555-5555',
    carePlanSummary: null,
    allergies: [],
    specialInstructions: null,
    ...overrides,
  });

  it('creates clients and fetches them by zone ordered by last name', async () => {
    await repository.create(baseInput({ lastName: 'Alvarez', zoneId: 'north' }));
    await repository.create(baseInput({ lastName: 'Baker', zoneId: 'south' }));
    await repository.create(baseInput({ lastName: 'Chan', zoneId: 'north' }));

    const northernClients = await repository.getByZone('north');
    expect(northernClients).toHaveLength(2);
    expect(northernClients.map((client) => client.lastName)).toEqual(['Alvarez', 'Chan']);
  });

  it('updates profiles and pushes optimistic changes into the queue', async () => {
    const created = await repository.create(baseInput({ zoneId: 'west', allergies: ['pollen'] }));
    const queue = deps.queue;

    await repository.update(created.id, {
      lastName: 'Rivera',
      location: { latitude: 44.5, longitude: -63.5 },
      allergies: ['pollen', 'nuts'],
    });

    const updated = await repository.findById(created.id);
    expect(updated?.lastName).toBe('Rivera');
    expect(updated?.allergies).toEqual(['pollen', 'nuts']);

    const pendingChanges = await queue.list();
    const updateEntry = pendingChanges.find(
      (change) => change.recordId === created.id && change.operation === 'update',
    );
    expect(updateEntry).toBeDefined();
    expect(updateEntry?.payload).toMatchObject({
      lastName: 'Rivera',
      allergies: ['pollen', 'nuts'],
      latitude: 44.5,
    });
  });

  it('returns the most recently touched clients first', async () => {
    await repository.create(baseInput({ firstName: 'Ana', lastName: 'North' }));
    await repository.create(baseInput({ firstName: 'Ben', lastName: 'West' }));
    await repository.create(baseInput({ firstName: 'Cara', lastName: 'East' }));

    const recent = await repository.getRecent(2);
    expect(recent).toHaveLength(2);
    expect(recent.map((client) => client.firstName)).toEqual(['Cara', 'Ben']);
  });

  it('soft deletes clients and queues a delete operation', async () => {
    const client = await repository.create(baseInput({ firstName: 'DeleteMe' }));
    const queue = deps.queue;

    await repository.delete(client.id);
    const refreshed = await repository.findById(client.id);
    expect(refreshed?.isActive).toBe(false);

    const pendingChanges = await queue.list();
    const deleteEntry = pendingChanges.find(
      (change) => change.recordId === client.id && change.operation === 'delete',
    );
    expect(deleteEntry).toBeDefined();
    expect(deleteEntry?.payload).toMatchObject({ isActive: false });
  });
});
