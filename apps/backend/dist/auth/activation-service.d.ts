import type { Pool } from 'pg';
import { type ActivationRepository } from './activation-repository.js';
import { type DeviceSessionRepository } from './device-session-repository.js';
export declare class ActivationError extends Error {
    readonly status: number;
    readonly code: string;
    readonly expose: boolean;
    constructor(message: string, status: number, code: string, expose?: boolean);
}
type ActivationRequestPayload = {
    email: string;
    activationCode: string;
    deviceFingerprint: string;
    appVersion: string;
};
type ActivationRequestContext = {
    ipAddress?: string | null;
    userAgent?: string | null;
};
type ActivationResponse = {
    activationToken: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        role: 'caregiver' | 'coordinator';
        zoneId: string | null;
    };
    requiresMfa: boolean;
};
export interface ActivationService {
    requestActivation(payload: ActivationRequestPayload, context: ActivationRequestContext): Promise<ActivationResponse>;
    completeActivation(payload: ActivationCompletionPayload, context: ActivationCompletionContext): Promise<ActivationCompletionResponse>;
}
type ActivationServiceOptions = {
    pool?: Pool | null;
    repository?: ActivationRepository;
    deviceSessions?: DeviceSessionRepository;
};
type ActivationCompletionPayload = {
    activationToken: string;
    pin: string;
    deviceName: string;
    supportsBiometric: boolean;
};
type ActivationCompletionContext = {
    ipAddress?: string | null;
    userAgent?: string | null;
};
type ActivationCompletionResponse = {
    accessToken: string;
    refreshToken: string;
    deviceId: string;
};
export declare const createActivationService: (options?: ActivationServiceOptions) => ActivationService;
export {};
