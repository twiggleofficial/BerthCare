import type { Pool } from 'pg';
export type TestDatabase = {
    pool: Pool;
    dispose: () => Promise<void>;
};
export declare const setupTestDatabase: () => Promise<TestDatabase>;
