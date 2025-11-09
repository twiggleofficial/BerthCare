import Database from '@nozbe/watermelondb/Database';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import {
  Client,
  Medication,
  Photo,
  SyncQueueEntry,
  Visit,
  VisitDocumentation,
} from '../../models';
import { schema } from '../../schema';
import type { RepositoryDependencies } from '../base-repository';
import { SyncQueue } from '../../../services/sync/SyncQueue';

export const createTestDatabase = (): Database => {
  const adapter = new LokiJSAdapter({
    schema,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
  });

  return new Database({
    adapter,
    modelClasses: [Client, Medication, Photo, Visit, VisitDocumentation, SyncQueueEntry],
  });
};

export const resetDatabase = async (database: Database): Promise<void> => {
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
};

export const createDeterministicClock = () => {
  let counter = 0;
  return {
    next: () => {
      const base = new Date('2024-01-01T00:00:00.000Z').getTime();
      const date = new Date(base + counter * 60000);
      counter += 1;
      return date;
    },
  };
};

export const createRepositoryDependencies = (database: Database): RepositoryDependencies => {
  const clock = createDeterministicClock();
  const queue = new SyncQueue(database, { now: clock.next });

  return {
    database,
    queue,
    now: clock.next,
  };
};
