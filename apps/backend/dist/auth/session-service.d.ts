import jwt from 'jsonwebtoken';
import type { Pool } from 'pg';
import { type DeviceSessionRepository, type DeviceSessionUser } from './device-session-repository.js';
export declare class SessionError extends Error {
    readonly status: number;
    readonly code: string;
    readonly expose: boolean;
    constructor(message: string, status: number, code: string, expose?: boolean);
}
type SessionServiceOptions = {
    pool?: Pool | null;
    repository?: DeviceSessionRepository;
};
type RefreshSessionPayload = {
    refreshToken: string;
    deviceId: string;
};
type RefreshSessionContext = {
    ipAddress?: string | null;
    userAgent?: string | null;
};
export type RefreshSessionResponse = {
    accessToken: string;
    refreshToken: string;
    deviceId: string;
};
type RevokeSessionPayload = RefreshSessionPayload & {
    reason?: string | null;
};
type AccessTokenClaims = jwt.JwtPayload & {
    sub: string;
    role: DeviceSessionUser['role'];
    deviceId: string;
    activationMethod: 'biometric' | 'pin';
};
export type LoadedDeviceSession = {
    user: {
        id: string;
        role: DeviceSessionUser['role'];
        zoneId: string | null;
        permissions?: string[];
        accessibleZoneIds?: string[];
    };
    deviceSession: {
        id: string;
        userId: string;
        deviceName: string;
        supportsBiometric: boolean;
        rotationId: string;
        tokenId: string;
        refreshTokenExpiresAt: Date;
        lastSeenAt: Date | null;
    };
    token: AccessTokenClaims;
};
export interface SessionService {
    refreshSession(payload: RefreshSessionPayload, context: RefreshSessionContext): Promise<RefreshSessionResponse>;
    revokeSession(payload: RevokeSessionPayload): Promise<void>;
    loadSessionContext(accessToken: string): Promise<LoadedDeviceSession>;
}
export declare const createSessionService: (options?: SessionServiceOptions) => SessionService;
export {};
