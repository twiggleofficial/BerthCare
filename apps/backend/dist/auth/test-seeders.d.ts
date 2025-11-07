import type { TestDatabase } from './test-utils.js';
export type DeviceSessionSeedResult = {
    userId: string;
    activationSessionId: string;
    deviceSessionId: string;
    refreshToken: string;
    tokenId: string;
    rotationId: string;
};
export declare const seedDeviceSession: (db: TestDatabase) => Promise<DeviceSessionSeedResult>;
