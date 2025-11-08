import type { NextFunction, Response } from 'express';
import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';

import {
  authorize,
  type AuthenticatedUser,
  type AuthorizationRequest,
  type DeviceSessionContext,
  canAccessZone,
  hasPermission,
  hasRole,
  loadDeviceSession,
} from './middleware.js';
import { SessionError, type SessionService } from './session-service.js';

const createUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => {
  return {
    id: 'user-1',
    role: 'caregiver',
    zoneId: 'zone-1',
    permissions: [],
    accessibleZoneIds: undefined,
    ...overrides,
  };
};

const createRequest = (overrides: Partial<AuthorizationRequest> = {}): AuthorizationRequest => {
  const baseHeaders = Object.fromEntries(
    Object.entries((overrides.headers as Record<string, string> | undefined) ?? {}).map(
      ([key, value]) => [key.toLowerCase(), value],
    ),
  );

  const request = {
    params: {},
    query: {},
    body: {},
    headers: baseHeaders,
    get: (header: string) => baseHeaders[header.toLowerCase()],
    ...overrides,
  } as AuthorizationRequest;

  return request;
};

type MockResponse = Response & {
  statusCode?: number;
  jsonBody?: unknown;
  statusMock: Mock<[status: number], MockResponse>;
  jsonMock: Mock<[payload: unknown], MockResponse>;
};

const createResponse = (): MockResponse => {
  const res = {} as Partial<MockResponse>;

  res.locals = { requestId: 'test-request-id' } as Response['locals'];

  res.statusMock = vi.fn((code: number) => {
    res.statusCode = code;
    return res as MockResponse;
  }) as Mock<[status: number], MockResponse>;
  res.status = res.statusMock as unknown as MockResponse['status'];

  res.jsonMock = vi.fn((payload: unknown) => {
    res.jsonBody = payload;
    return res as MockResponse;
  }) as Mock<[payload: unknown], MockResponse>;
  res.json = res.jsonMock as unknown as MockResponse['json'];

  return res as MockResponse;
};

const createNext = () => vi.fn<Parameters<NextFunction>, ReturnType<NextFunction>>();

const expectErrorResponse = (res: MockResponse, code: string, message: string) => {
  expect(res.jsonMock).toHaveBeenCalled();
  const calls = res.jsonMock.mock.calls;
  const payload = calls[calls.length - 1]?.[0] as {
    error: { code: string; message: string; timestamp: string; requestId?: string };
  };
  expect(payload).toMatchObject({
    error: {
      code,
      message,
      requestId: 'test-request-id',
    },
  });
  expect(typeof payload.error.timestamp).toBe('string');
};

describe('hasRole', () => {
  it('returns true when the user has the required role', () => {
    const user = createUser({ role: 'coordinator' });
    expect(hasRole(user, 'coordinator')).toBe(true);
    expect(hasRole(user, ['caregiver', 'coordinator'])).toBe(true);
  });

  it('returns false when the user does not have the role', () => {
    const user = createUser({ role: 'family' });
    expect(hasRole(user, 'coordinator')).toBe(false);
  });
});

describe('hasPermission', () => {
  it('evaluates all permissions by default', () => {
    const user = createUser({ role: 'caregiver' });
    expect(hasPermission(user, ['read:own_schedule', 'create:visits'])).toBe(true);
    expect(hasPermission(user, 'write:care_plans')).toBe(false);
  });

  it('supports any-match semantics', () => {
    const user = createUser({ role: 'caregiver' });
    expect(
      hasPermission(user, ['write:care_plans', 'create:visits'], {
        match: 'any',
      }),
    ).toBe(true);
  });

  it('accepts per-user overrides', () => {
    const user = createUser({
      permissions: ['write:care_plans'],
    });
    expect(hasPermission(user, 'write:care_plans')).toBe(true);
  });

  it('grants full access for admins', () => {
    const user = createUser({ role: 'admin' });
    expect(hasPermission(user, 'write:care_plans')).toBe(true);
  });
});

describe('canAccessZone', () => {
  it('allows admins to access any zone', () => {
    const user = createUser({ role: 'admin', zoneId: null });
    expect(canAccessZone(user, 'zone-x')).toBe(true);
  });

  it('allows access when zones match', () => {
    const user = createUser({ zoneId: 'zone-1' });
    expect(canAccessZone(user, 'zone-1')).toBe(true);
  });

  it('allows access via additional zone list', () => {
    const user = createUser({ zoneId: 'zone-1', accessibleZoneIds: ['zone-2'] });
    expect(canAccessZone(user, 'zone-2')).toBe(true);
  });

  it('rejects cross-zone access for non-admin roles', () => {
    const user = createUser({ zoneId: 'zone-1', accessibleZoneIds: [] });
    expect(canAccessZone(user, 'zone-5')).toBe(false);
  });

  it('treats missing zone as allowed', () => {
    const user = createUser();
    expect(canAccessZone(user, undefined)).toBe(true);
  });
});

describe('loadDeviceSession', () => {
  const createSessionContext = (): {
    user: {
      id: string;
      role: AuthenticatedUser['role'];
      zoneId: string | null;
      permissions?: string[];
      accessibleZoneIds?: string[];
    };
    deviceSession: DeviceSessionContext;
    token: {
      sub: string;
      role: AuthenticatedUser['role'];
      deviceId: string;
      activationMethod: 'biometric' | 'pin';
      iat: number;
      exp: number;
    };
  } => ({
    user: {
      id: 'user-1',
      role: 'caregiver',
      zoneId: 'zone-1',
      permissions: ['create:visits'],
      accessibleZoneIds: ['zone-2'],
    },
    deviceSession: {
      id: 'device-1',
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
      deviceId: 'device-1',
      activationMethod: 'biometric',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
    },
  });

  it('responds with 401 when authorization header is missing', async () => {
    const sessionService = {
      loadSessionContext: vi.fn(),
    };

    const middleware = loadDeviceSession(sessionService as unknown as SessionService);
    const req = createRequest();
    const res = createResponse();
    const next = createNext();

    await middleware(req, res, next as unknown as NextFunction);

    expect(res.statusMock).toHaveBeenCalledWith(401);
    expect(sessionService.loadSessionContext).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches user and device session context when token is valid', async () => {
    const context = createSessionContext();
    const sessionService = {
      loadSessionContext: vi.fn().mockResolvedValue(context),
    };

    const middleware = loadDeviceSession(sessionService as unknown as SessionService);
    const req = createRequest({
      headers: {
        authorization: 'Bearer access-token',
      },
    });
    const res = createResponse();
    const next = createNext();

    await middleware(req, res, next as unknown as NextFunction);

    expect(sessionService.loadSessionContext).toHaveBeenCalledWith('access-token');
    expect(req.user).toEqual({
      id: 'user-1',
      role: 'caregiver',
      zoneId: 'zone-1',
      permissions: ['create:visits'],
      accessibleZoneIds: ['zone-2'],
    });
    expect(req.deviceSession).toEqual(context.deviceSession);
    expect(req.accessToken).toBe('access-token');
    expect(next).toHaveBeenCalledOnce();
  });

  it('maps session errors to error responses', async () => {
    const sessionService = {
      loadSessionContext: vi
        .fn()
        .mockRejectedValue(new SessionError('Device revoked', 423, 'AUTH_DEVICE_REVOKED')),
    };

    const middleware = loadDeviceSession(sessionService as unknown as SessionService);
    const req = createRequest({
      headers: {
        authorization: 'Bearer stale-token',
      },
    });
    const res = createResponse();
    const next = createNext();

    await middleware(req, res, next as unknown as NextFunction);

    expect(res.statusMock).toHaveBeenCalledWith(423);
    expect(res.jsonMock).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('authorize middleware', () => {
  it('returns 401 when no user is present', () => {
    const middleware = authorize({ roles: 'caregiver' });
    const req = createRequest({ user: undefined });
    const res = createResponse();
    const next = createNext();

    middleware(req, res, next as unknown as NextFunction);

    expect(res.statusMock).toHaveBeenCalledWith(401);
    expectErrorResponse(res, 'AUTH_UNAUTHENTICATED', 'Authentication required.');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when role is insufficient', () => {
    const middleware = authorize({ roles: 'coordinator' });
    const req = createRequest({ user: createUser({ role: 'caregiver' }) });
    const res = createResponse();
    const next = createNext();

    middleware(req, res, next as unknown as NextFunction);

    expect(res.statusMock).toHaveBeenCalledWith(403);
    expectErrorResponse(res, 'AUTH_INSUFFICIENT_ROLE', 'You do not have access to this resource.');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when permissions are missing', () => {
    const middleware = authorize({
      roles: ['caregiver', 'coordinator'],
      allPermissions: ['write:care_plans'],
    });
    const req = createRequest({ user: createUser({ role: 'caregiver' }) });
    const res = createResponse();
    const next = createNext();

    middleware(req, res, next as unknown as NextFunction);

    expect(res.statusMock).toHaveBeenCalledWith(403);
    expectErrorResponse(
      res,
      'AUTH_INSUFFICIENT_PERMISSIONS',
      'You do not have permission to perform this action.',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when any permission requirements fail', () => {
    const middleware = authorize({
      anyPermissions: ['write:care_plans', 'delete:alerts'],
    });
    const req = createRequest({ user: createUser({ role: 'family' }) });
    const res = createResponse();
    const next = createNext();

    middleware(req, res, next as unknown as NextFunction);

    expect(res.statusMock).toHaveBeenCalledWith(403);
    expectErrorResponse(
      res,
      'AUTH_INSUFFICIENT_PERMISSIONS',
      'You do not have permission to perform this action.',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when zone access is denied', () => {
    const middleware = authorize();
    const req = createRequest({
      user: createUser({ zoneId: 'zone-1' }),
      params: { zoneId: 'zone-2' },
    });
    const res = createResponse();
    const next = createNext();

    middleware(req, res, next as unknown as NextFunction);

    expect(res.statusMock).toHaveBeenCalledWith(403);
    expectErrorResponse(res, 'AUTH_ZONE_ACCESS_DENIED', 'You do not have access to this zone.');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when zone is required but missing', () => {
    const middleware = authorize({
      zone: {
        required: true,
      },
    });
    const req = createRequest({
      user: createUser({ zoneId: 'zone-1' }),
    });
    const res = createResponse();
    const next = createNext();

    middleware(req, res, next as unknown as NextFunction);

    expect(res.statusMock).toHaveBeenCalledWith(400);
    expectErrorResponse(
      res,
      'AUTH_ZONE_CONTEXT_REQUIRED',
      'Zone context is required for this operation.',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('invokes next when all checks pass', () => {
    const middleware = authorize({
      roles: ['caregiver', 'coordinator'],
      allPermissions: ['create:visits'],
    });
    const req = createRequest({
      user: createUser({ role: 'caregiver', zoneId: 'zone-1' }),
      params: { zoneId: 'zone-1' },
    });
    const res = createResponse();
    const next = createNext();

    middleware(req, res, next as unknown as NextFunction);

    expect(next).toHaveBeenCalledOnce();
    expect(res.statusMock).not.toHaveBeenCalled();
  });

  it('allows custom zone resolver', () => {
    const middleware = authorize({
      zone: {
        resolver: (req) => (req.headers?.['x-zone-key'] as string) ?? null,
      },
    });
    const req = createRequest({
      user: createUser({ zoneId: 'zone-3' }),
      headers: { 'x-zone-key': 'zone-3' },
    });
    const res = createResponse();
    const next = createNext();

    middleware(req, res, next as unknown as NextFunction);

    expect(next).toHaveBeenCalledOnce();
  });
});
