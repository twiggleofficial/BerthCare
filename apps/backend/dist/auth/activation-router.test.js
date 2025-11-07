import { describe, expect, it, vi } from 'vitest';
import { createAuthV1Router } from './index.js';
import { ActivationError } from './activation-service.js';
import { SessionError } from './session-service.js';
const createMockResponse = () => {
    const headers = {};
    const res = {
        statusCode: 200,
        body: undefined,
        headers,
        locals: { requestId: 'test-request-id' },
    };
    res.setHeader = ((name, value) => {
        headers[name.toLowerCase()] = value;
        return res;
    });
    res.getHeader = ((name) => headers[name.toLowerCase()]);
    res.set = ((field, value) => {
        if (typeof field === 'string') {
            if (value !== undefined) {
                headers[field.toLowerCase()] = value;
            }
        }
        else {
            for (const key of Object.keys(field)) {
                headers[key.toLowerCase()] = field[key];
            }
        }
        return res;
    });
    res.end = ((payload) => {
        res.body = payload ?? res.body;
        return res;
    });
    res.statusMock = vi.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.status = res.statusMock;
    res.jsonMock = vi.fn((payload) => {
        res.body = payload;
        return res;
    });
    res.json = res.jsonMock;
    return res;
};
const createActivationService = (overrides = {}) => {
    const service = {
        requestActivation: vi.fn(),
        completeActivation: vi.fn(),
        ...overrides,
    };
    return service;
};
const resolveRouteStack = (router, path) => {
    const layer = router.stack.find((item) => item.route?.path === path);
    if (!layer?.route?.stack?.length) {
        throw new Error(`Route handler not found for path: ${path}`);
    }
    return layer.route.stack.map((stackLayer) => stackLayer.handle);
};
const invokeRoute = async (router, path, options = {}) => {
    const stack = resolveRouteStack(router, path);
    const headers = Object.fromEntries(Object.entries({
        'user-agent': 'vitest',
        ...(options.headers ?? {}),
    }).map(([key, value]) => [key.toLowerCase(), value]));
    const req = {
        method: options.method ?? 'POST',
        url: path,
        originalUrl: `/v1/auth${path}`,
        body: options.body ?? {},
        headers,
        params: {},
        query: {},
        get: (header) => headers[header.toLowerCase()],
        ip: '127.0.0.1',
        socket: {
            remoteAddress: '127.0.0.1',
        },
    };
    const res = createMockResponse();
    const dispatch = async (index) => {
        if (index >= stack.length) {
            return;
        }
        const handler = stack[index];
        const shouldContinue = await new Promise((resolve, reject) => {
            let settled = false;
            const finish = (value) => {
                if (!settled) {
                    settled = true;
                    resolve(value);
                }
            };
            const fail = (error) => {
                if (!settled) {
                    settled = true;
                    reject(error instanceof Error ? error : new Error(String(error)));
                }
            };
            const next = (error) => {
                if (error) {
                    fail(error);
                    return;
                }
                finish(true);
            };
            try {
                const result = handler(req, res, next);
                if (result && typeof result.then === 'function') {
                    result
                        .then(() => {
                        finish(false);
                    })
                        .catch(fail);
                }
                else {
                    finish(false);
                }
            }
            catch (error) {
                fail(error);
            }
        });
        if (shouldContinue) {
            await dispatch(index + 1);
        }
    };
    await dispatch(0);
    return res;
};
describe('createAuthV1Router', () => {
    it('returns activation payload on success', async () => {
        const activationService = createActivationService();
        activationService.requestActivation.mockResolvedValue({
            activationToken: 'mock-token',
            user: {
                id: 'user-123',
                firstName: 'Test',
                lastName: 'User',
                role: 'caregiver',
                zoneId: null,
            },
            requiresMfa: false,
        });
        const router = createAuthV1Router({ activationService });
        const res = await invokeRoute(router, '/activate', {
            body: {
                email: 'test@example.com',
                activationCode: '1234-5678',
                deviceFingerprint: 'device-123',
                appVersion: '1.0.0',
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            activationToken: 'mock-token',
            user: {
                id: 'user-123',
                firstName: 'Test',
                lastName: 'User',
                role: 'caregiver',
                zoneId: null,
            },
            requiresMfa: false,
        });
        expect(activationService.requestActivation).toHaveBeenCalledWith({
            email: 'test@example.com',
            activationCode: '1234-5678',
            deviceFingerprint: 'device-123',
            appVersion: '1.0.0',
        }, {
            ipAddress: '127.0.0.1',
            userAgent: 'vitest',
        });
    });
    it('returns validation errors for invalid payloads', async () => {
        const activationService = createActivationService();
        const router = createAuthV1Router({ activationService });
        const res = await invokeRoute(router, '/activate', {
            body: {
                email: 'not-an-email',
                activationCode: '12',
                deviceFingerprint: '',
                appVersion: '',
            },
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toMatchObject({
            error: {
                code: 'AUTH_INVALID_ACTIVATION_PAYLOAD',
                message: 'Invalid activation request',
                requestId: 'test-request-id',
            },
        });
        expect(typeof res.body.error.timestamp).toBe('string');
        expect(Array.isArray(res.body.error.details)).toBe(true);
        expect(activationService.requestActivation).not.toHaveBeenCalled();
    });
    it('maps activation errors to API responses', async () => {
        const activationService = createActivationService();
        activationService.requestActivation.mockRejectedValue(new ActivationError('Invalid activation code', 400, 'AUTH_INVALID_ACTIVATION_CODE'));
        const router = createAuthV1Router({ activationService });
        const res = await invokeRoute(router, '/activate', {
            body: {
                email: 'test@example.com',
                activationCode: '1234-5678',
                deviceFingerprint: 'device-123',
                appVersion: '1.0.0',
            },
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toMatchObject({
            error: {
                code: 'AUTH_INVALID_ACTIVATION_CODE',
                message: 'Invalid activation code',
                requestId: 'test-request-id',
            },
        });
        expect(typeof res.body.error.timestamp).toBe('string');
    });
    it('returns tokens on activation completion success', async () => {
        const activationService = createActivationService();
        activationService.completeActivation.mockResolvedValue({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            deviceId: 'device-session-123',
        });
        const router = createAuthV1Router({ activationService });
        const res = await invokeRoute(router, '/activate/complete', {
            body: {
                activationToken: 'a'.repeat(64),
                pin: '123456',
                deviceName: 'Field Device',
                supportsBiometric: true,
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            deviceId: 'device-session-123',
        });
        expect(activationService.completeActivation).toHaveBeenCalledWith({
            activationToken: 'a'.repeat(64),
            pin: '123456',
            deviceName: 'Field Device',
            supportsBiometric: true,
        }, {
            ipAddress: '127.0.0.1',
            userAgent: 'vitest',
        });
    });
    it('returns validation errors for invalid activation completion payloads', async () => {
        const activationService = createActivationService();
        const router = createAuthV1Router({ activationService });
        const res = await invokeRoute(router, '/activate/complete', {
            body: {
                activationToken: 'short',
                pin: 'abc',
                deviceName: '',
                supportsBiometric: 'yes',
            },
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toMatchObject({
            error: {
                code: 'AUTH_INVALID_ACTIVATION_COMPLETION_PAYLOAD',
                message: 'Invalid activation completion request',
                requestId: 'test-request-id',
            },
        });
        expect(typeof res.body.error.timestamp).toBe('string');
        expect(Array.isArray(res.body.error.details)).toBe(true);
        expect(activationService.completeActivation).not.toHaveBeenCalled();
    });
    it('maps activation completion errors to API responses', async () => {
        const activationService = createActivationService();
        activationService.completeActivation.mockRejectedValue(new ActivationError('Invalid activation token', 400, 'AUTH_INVALID_ACTIVATION_TOKEN'));
        const router = createAuthV1Router({ activationService });
        const res = await invokeRoute(router, '/activate/complete', {
            body: {
                activationToken: 'a'.repeat(64),
                pin: '123456',
                deviceName: 'Field Device',
                supportsBiometric: false,
            },
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toMatchObject({
            error: {
                code: 'AUTH_INVALID_ACTIVATION_TOKEN',
                message: 'Invalid activation token',
                requestId: 'test-request-id',
            },
        });
        expect(typeof res.body.error.timestamp).toBe('string');
    });
    const DEVICE_ID = '3f8a1bca-9c4a-4f6d-8b7c-123456789abc';
    const OTHER_DEVICE_ID = '1c2d3e4f-5678-4abc-9def-fedcba987654';
    it('returns rotated tokens on session refresh', async () => {
        const activationService = createActivationService();
        const sessionService = {
            refreshSession: vi.fn().mockResolvedValue({
                accessToken: 'new-access',
                refreshToken: 'new-refresh',
                deviceId: 'device-1',
            }),
            revokeSession: vi.fn(),
            loadSessionContext: vi.fn(),
        };
        const router = createAuthV1Router({ activationService, sessionService });
        const res = await invokeRoute(router, '/session/refresh', {
            body: {
                refreshToken: 'refresh-token',
                deviceId: DEVICE_ID,
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
            deviceId: 'device-1',
        });
        expect(sessionService.refreshSession).toHaveBeenCalledWith({
            refreshToken: 'refresh-token',
            deviceId: DEVICE_ID,
        }, expect.objectContaining({
            ipAddress: '127.0.0.1',
            userAgent: 'vitest',
        }));
    });
    it('returns validation errors for invalid session refresh payloads', async () => {
        const activationService = createActivationService();
        const sessionService = {
            refreshSession: vi.fn(),
            revokeSession: vi.fn(),
            loadSessionContext: vi.fn(),
        };
        const router = createAuthV1Router({ activationService, sessionService });
        const res = await invokeRoute(router, '/session/refresh', {
            body: {
                refreshToken: '',
                deviceId: 'not-a-uuid',
            },
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toMatchObject({
            error: {
                code: 'AUTH_INVALID_SESSION_REFRESH_PAYLOAD',
                message: 'Invalid session refresh request',
                requestId: 'test-request-id',
            },
        });
        expect(sessionService.refreshSession).not.toHaveBeenCalled();
    });
    it('maps session refresh errors to API responses', async () => {
        const activationService = createActivationService();
        const sessionService = {
            refreshSession: vi
                .fn()
                .mockRejectedValue(new SessionError('Invalid refresh token', 401, 'AUTH_TOKEN_INVALID')),
            revokeSession: vi.fn(),
            loadSessionContext: vi.fn(),
        };
        const router = createAuthV1Router({ activationService, sessionService });
        const res = await invokeRoute(router, '/session/refresh', {
            body: {
                refreshToken: 'refresh-token',
                deviceId: DEVICE_ID,
            },
        });
        expect(res.statusCode).toBe(401);
        expect(res.body).toMatchObject({
            error: {
                code: 'AUTH_TOKEN_INVALID',
                requestId: 'test-request-id',
            },
        });
    });
    it('revokes session when payload is valid', async () => {
        const activationService = createActivationService();
        const sessionContext = {
            user: {
                id: 'user-1',
                role: 'caregiver',
                zoneId: 'zone-1',
                permissions: undefined,
                accessibleZoneIds: undefined,
            },
            deviceSession: {
                id: DEVICE_ID,
                userId: 'user-1',
                deviceName: 'Field Tablet',
                supportsBiometric: true,
                rotationId: 'rotation-1',
                tokenId: 'token-1',
                refreshTokenExpiresAt: new Date(Date.now() + 86_400_000),
                lastSeenAt: new Date(),
            },
            token: {
                sub: 'user-1',
                role: 'caregiver',
                deviceId: DEVICE_ID,
                activationMethod: 'biometric',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 900,
            },
        };
        const sessionService = {
            refreshSession: vi.fn(),
            revokeSession: vi.fn().mockResolvedValue(undefined),
            loadSessionContext: vi.fn().mockResolvedValue(sessionContext),
        };
        const router = createAuthV1Router({ activationService, sessionService });
        const res = await invokeRoute(router, '/session/revoke', {
            body: {
                refreshToken: 'refresh-token',
                deviceId: DEVICE_ID,
                reason: 'user_logout',
            },
            headers: {
                authorization: 'Bearer access-token',
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ status: 'revoked' });
        expect(sessionService.loadSessionContext).toHaveBeenCalledWith('access-token');
        expect(sessionService.revokeSession).toHaveBeenCalledWith({
            refreshToken: 'refresh-token',
            deviceId: DEVICE_ID,
            reason: 'user_logout',
        });
    });
    it('rejects revocation when device mismatch occurs', async () => {
        const activationService = createActivationService();
        const sessionService = {
            refreshSession: vi.fn(),
            revokeSession: vi.fn(),
            loadSessionContext: vi.fn().mockResolvedValue({
                user: {
                    id: 'user-1',
                    role: 'caregiver',
                    zoneId: 'zone-1',
                    permissions: undefined,
                    accessibleZoneIds: undefined,
                },
                deviceSession: {
                    id: DEVICE_ID,
                    userId: 'user-1',
                    deviceName: 'Field Tablet',
                    supportsBiometric: true,
                    rotationId: 'rotation-1',
                    tokenId: 'token-1',
                    refreshTokenExpiresAt: new Date(Date.now() + 86_400_000),
                    lastSeenAt: new Date(),
                },
                token: {
                    sub: 'user-1',
                    role: 'caregiver',
                    deviceId: DEVICE_ID,
                    activationMethod: 'biometric',
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 900,
                },
            }),
        };
        const router = createAuthV1Router({ activationService, sessionService });
        const res = await invokeRoute(router, '/session/revoke', {
            body: {
                refreshToken: 'refresh-token',
                deviceId: OTHER_DEVICE_ID,
            },
            headers: {
                authorization: 'Bearer access-token',
            },
        });
        expect(res.statusCode).toBe(403);
        expect(res.body).toMatchObject({
            error: {
                code: 'AUTH_DEVICE_MISMATCH',
                requestId: 'test-request-id',
            },
        });
        expect(sessionService.revokeSession).not.toHaveBeenCalled();
    });
    it('requires authorization for session revocation', async () => {
        const activationService = createActivationService();
        const sessionService = {
            refreshSession: vi.fn(),
            revokeSession: vi.fn(),
            loadSessionContext: vi.fn(),
        };
        const router = createAuthV1Router({ activationService, sessionService });
        const res = await invokeRoute(router, '/session/revoke', {
            body: {
                refreshToken: 'refresh-token',
                deviceId: DEVICE_ID,
            },
        });
        expect(res.statusCode).toBe(401);
        expect(res.body).toMatchObject({
            error: {
                code: 'AUTH_UNAUTHENTICATED',
                requestId: 'test-request-id',
            },
        });
        expect(sessionService.loadSessionContext).not.toHaveBeenCalled();
    });
    it('maps revocation errors to API responses', async () => {
        const activationService = createActivationService();
        const sessionService = {
            refreshSession: vi.fn(),
            revokeSession: vi
                .fn()
                .mockRejectedValue(new SessionError('Invalid refresh token', 401, 'AUTH_TOKEN_INVALID')),
            loadSessionContext: vi.fn().mockResolvedValue({
                user: {
                    id: 'user-1',
                    role: 'caregiver',
                    zoneId: 'zone-1',
                    permissions: undefined,
                    accessibleZoneIds: undefined,
                },
                deviceSession: {
                    id: DEVICE_ID,
                    userId: 'user-1',
                    deviceName: 'Field Tablet',
                    supportsBiometric: true,
                    rotationId: 'rotation-1',
                    tokenId: 'token-1',
                    refreshTokenExpiresAt: new Date(Date.now() + 86_400_000),
                    lastSeenAt: new Date(),
                },
                token: {
                    sub: 'user-1',
                    role: 'caregiver',
                    deviceId: DEVICE_ID,
                    activationMethod: 'biometric',
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 900,
                },
            }),
        };
        const router = createAuthV1Router({ activationService, sessionService });
        const res = await invokeRoute(router, '/session/revoke', {
            body: {
                refreshToken: 'refresh-token',
                deviceId: DEVICE_ID,
            },
            headers: {
                authorization: 'Bearer access-token',
            },
        });
        expect(res.statusCode).toBe(401);
        expect(res.body).toMatchObject({
            error: {
                code: 'AUTH_TOKEN_INVALID',
                requestId: 'test-request-id',
            },
        });
    });
    it('propagates device session errors from middleware', async () => {
        const activationService = createActivationService();
        const sessionService = {
            refreshSession: vi.fn(),
            revokeSession: vi.fn(),
            loadSessionContext: vi
                .fn()
                .mockRejectedValue(new SessionError('Device revoked', 423, 'AUTH_DEVICE_REVOKED')),
        };
        const router = createAuthV1Router({ activationService, sessionService });
        const res = await invokeRoute(router, '/session/revoke', {
            body: {
                refreshToken: 'refresh-token',
                deviceId: DEVICE_ID,
            },
            headers: {
                authorization: 'Bearer access-token',
            },
        });
        expect(res.statusCode).toBe(423);
        expect(res.body).toMatchObject({
            error: {
                code: 'AUTH_DEVICE_REVOKED',
                requestId: 'test-request-id',
            },
        });
        expect(sessionService.revokeSession).not.toHaveBeenCalled();
    });
});
