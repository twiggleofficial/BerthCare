import type Database from '@nozbe/watermelondb/Database';

import { ENABLE_OPTIONAL_DB_INDEXES } from '../config/feature-flags';
import { createLogger } from '../services/logger';
import { OPTIONAL_INDEXES } from './indexes';

const OPTIONAL_INDEX_STORAGE_KEY = 'berthcare.optionalIndexes';
const logger = createLogger('optional-indexes');

type OptionalIndexState = {
  applied: boolean;
  rollbackRequested: boolean;
};

const defaultState: OptionalIndexState = {
  applied: false,
  rollbackRequested: false,
};

const serializeState = (state: OptionalIndexState): string => JSON.stringify(state);

const parseState = (raw: string | undefined | null): OptionalIndexState => {
  if (!raw) {
    return { ...defaultState };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OptionalIndexState>;
    return {
      applied: parsed.applied ?? false,
      rollbackRequested: parsed.rollbackRequested ?? false,
    };
  } catch {
    return { ...defaultState };
  }
};

const persistState = async (database: Database, state: OptionalIndexState) => {
  await database.localStorage.set(OPTIONAL_INDEX_STORAGE_KEY, serializeState(state));
};

const fetchState = async (database: Database): Promise<OptionalIndexState> => {
  const raw = await database.localStorage.get(OPTIONAL_INDEX_STORAGE_KEY);
  return parseState(typeof raw === 'string' ? raw : null);
};

type SQLiteArg = string | boolean | number | null;
type SQLiteQuery = [string, SQLiteArg[]];

const toQueries = (sqls: string[]): SQLiteQuery[] => sqls.map((sql) => [sql, []]);

const createOptionalIndexes = async (database: Database) => {
  const statements = toQueries(OPTIONAL_INDEXES.map((index) => index.sql));
  if (!statements.length) {
    return;
  }

  await database.adapter.unsafeExecute({ sqls: statements });
  logger.info('Optional indexes applied', { count: statements.length });
};

const dropOptionalIndexes = async (database: Database) => {
  const statements = toQueries(
    OPTIONAL_INDEXES.map((index) => `DROP INDEX IF EXISTS ${index.name}`),
  );
  if (!statements.length) {
    return;
  }

  await database.adapter.unsafeExecute({ sqls: statements });
  logger.info('Optional indexes dropped', { count: statements.length });
};

export const syncOptionalIndexes = async (database: Database): Promise<void> => {
  const state = await fetchState(database);

  if (state.rollbackRequested) {
    if (state.applied) {
      await dropOptionalIndexes(database);
    }
    await persistState(database, { applied: false, rollbackRequested: true });
    return;
  }

  if (ENABLE_OPTIONAL_DB_INDEXES) {
    if (!state.applied) {
      await createOptionalIndexes(database);
      await persistState(database, { applied: true, rollbackRequested: false });
    }
    return;
  }

  if (state.applied) {
    await dropOptionalIndexes(database);
    await persistState(database, { applied: false, rollbackRequested: false });
  }
};

export const requestOptionalIndexRollback = async (
  database: Database,
): Promise<void> => {
  const state = await fetchState(database);
  if (!state.applied) {
    if (!state.rollbackRequested) {
      await persistState(database, { applied: false, rollbackRequested: true });
    }
    return;
  }

  await dropOptionalIndexes(database);
  await persistState(database, { applied: false, rollbackRequested: true });
};
