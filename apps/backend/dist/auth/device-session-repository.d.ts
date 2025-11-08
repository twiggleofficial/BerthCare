import type { PoolClient } from 'pg';
export type DeviceSessionRecord = {
    id: string;
    userId: string;
    activationSessionId: string;
    deviceFingerprint: string;
    deviceName: string;
    appVersion: string | null;
    supportsBiometric: boolean;
    pinScryptHash: string;
    pinScryptSalt: string;
    pinScryptParams: string;
    tokenId: string;
    rotationId: string;
    refreshTokenHash: string;
    refreshTokenExpiresAt: Date;
    lastRotatedAt: Date | null;
    revokedAt: Date | null;
    revokedReason: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    lastSeenAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};
export type DeviceSessionUser = {
    role: 'caregiver' | 'coordinator' | 'admin' | 'family';
    zoneId: string | null;
    isActive: boolean;
};
export type DeviceSessionWithUser = DeviceSessionRecord & {
    user: DeviceSessionUser;
};
export type CreateDeviceSessionInput = {
    id?: string;
    userId: string;
    activationSessionId: string;
    deviceFingerprint: string;
    deviceName: string;
    appVersion?: string | null;
    supportsBiometric: boolean;
    pinScryptHash: string;
    pinScryptSalt: string;
    pinScryptParams: string;
    tokenId: string;
    rotationId: string;
    refreshTokenHash: string;
    refreshTokenExpiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
    lastSeenAt?: Date | null;
};
export type RotateDeviceSessionInput = {
    deviceSessionId: string;
    tokenId: string;
    rotationId: string;
    refreshTokenHash: string;
    refreshTokenExpiresAt: Date;
    rotatedAt: Date;
};
export type RevokeDeviceSessionInput = {
    deviceSessionId: string;
    revokedAt: Date;
    reason?: string | null;
};
export interface DeviceSessionRepository {
    createDeviceSession(client: PoolClient, input: CreateDeviceSessionInput): Promise<DeviceSessionRecord>;
    findActiveByFingerprint(client: PoolClient, deviceFingerprint: string): Promise<DeviceSessionRecord | null>;
    findByIdWithUser(client: PoolClient, deviceSessionId: string, options?: {
        lock?: boolean;
    }): Promise<DeviceSessionWithUser | null>;
    rotateDeviceSession(client: PoolClient, input: RotateDeviceSessionInput): Promise<void>;
    revokeDeviceSession(client: PoolClient, input: RevokeDeviceSessionInput): Promise<void>;
    touchDeviceSession(client: PoolClient, deviceSessionId: string, seenAt: Date): Promise<void>;
}
export declare const createDeviceSessionRepository: () => DeviceSessionRepository;
