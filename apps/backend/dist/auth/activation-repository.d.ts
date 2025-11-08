import type { PoolClient } from 'pg';
export type ActivationUserRecord = {
    id: string;
    email: string;
    activationCodeHash: string | null;
    activationExpiresAt: Date | null;
    firstName: string;
    lastName: string;
    role: 'caregiver' | 'coordinator' | 'admin' | 'family';
    zoneId: string | null;
    isActive: boolean;
};
export type ActivationAttemptOutcome = 'invalid_credentials' | 'expired' | 'rate_limited' | 'device_enrolled' | 'success';
export type ActivationAttemptRecord = {
    userId: string | null;
    email: string;
    deviceFingerprint: string;
    appVersion?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    detail?: string | null;
    outcome: ActivationAttemptOutcome;
    success: boolean;
};
export type ActivationSessionRecord = {
    userId: string;
    activationTokenHash: string;
    deviceFingerprint: string;
    appVersion?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    expiresAt: Date;
};
export type ActivationSessionWithUser = {
    id: string;
    userId: string;
    activationTokenHash: string;
    deviceFingerprint: string;
    appVersion: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    expiresAt: Date;
    completedAt: Date | null;
    revokedAt: Date | null;
    user: ActivationUserRecord;
};
export interface ActivationRepository {
    findUserByEmail(client: PoolClient, email: string): Promise<ActivationUserRecord | null>;
    countRecentAttempts(client: PoolClient, email: string, deviceFingerprint: string, windowMinutes: number): Promise<number>;
    recordAttempt(client: PoolClient, record: ActivationAttemptRecord): Promise<void>;
    hasActiveSession(client: PoolClient, userId: string, deviceFingerprint: string): Promise<boolean>;
    revokePendingSessions(client: PoolClient, userId: string, deviceFingerprint: string): Promise<void>;
    createActivationSession(client: PoolClient, record: ActivationSessionRecord): Promise<void>;
    findActivationSessionByTokenHash(client: PoolClient, activationTokenHash: string): Promise<ActivationSessionWithUser | null>;
    completeActivationSession(client: PoolClient, sessionId: string, completedAt: Date): Promise<void>;
}
export declare const createActivationRepository: () => ActivationRepository;
