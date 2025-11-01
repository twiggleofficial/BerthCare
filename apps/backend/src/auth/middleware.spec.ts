import type { NextFunction, Request, Response } from 'express';
import {
  configureJwtKeySet,
  generateAccessToken,
  generateRefreshToken,
  resetJwtKeySet,
} from 'libs/shared/jwt-utils';

import { authenticateJwt, authorizeRoles } from './middleware';
import type { AuthenticatedRequestUser } from './middleware';
import { getSessionClient } from '../cache/redis';

jest.mock('../cache/redis', () => ({
  getSessionClient: jest.fn(),
}));

const ACTIVE_KEY_ID = 'key-20240201';

const KEY_ONE_PRIVATE = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDjFlWGDuyPFBjP
h/3FNCDR/aWn1ASBLVnhC50nWwAGu5V8rQStN3FqdijhXY7DYNnruzDpVRIfb+PD
y64Qj/5Y8UQEJ0imsw2SuwZotlvBemh4viQHu9tdF9lTPeyPwjZnHmJvHxMipx4c
uQOt5NK3Iom8CQQPs05WGv2+YXgoX/gp6gJ+MpmqTutZugNngkPXRI8mDfdCcGYX
GPW4IZpz3maSuXsctLUtIbRfjnson7GBuFjJHjd3eahENziYcLGIPJeQspdY0CvG
IXE2oYPPIKiBd5i/jVq7KTPcb40s7NeKmXxZA8AYG2lEwUv0kp0j2YHeEQ8sTqz6
moa768RrAgMBAAECggEBAJTLh5JlqP8/Tdp94vwaYf72UlsbgzAZRTE+aOTmrae7
tgGRZOUS1Q/LCJJSuT6v8VqSt0PMaCmNKRKcHRvhHemtfMGz89i2rggc3+AwzQKD
cHzdKcKfhucCv3XZt22i9f6vXBQvqlwkYIi1egGxU5iH2vQIfE7FUGj/GpBqUU8y
Buzi2GzY6CJuRzLOgyFYlFKSyJowmAbEQCThZjFIeRLEDeYldfhXuxQANRxCpphZ
ouPqJO8FZwuNJpdCrgggyJ8Og50FP86w52Emzwig3prVKPxH95MHpIyPPahrJ4Uw
Msr3aCW/rlkZm1bVVgj8IJJmMIGuDtGORQ5zj1Zz9VECgYEA9AGyMMUaX0JkpY1V
CxmxWHyTEi4CHHyP7CWKyuA8GqIKQbPDpCp7j10FokcppWmPhZeig4hns5jtBE6l
0G014ALloFokB00eXd4mg0SCC3dXAKhGy8cSYCSFfZeJlPO2kwlv4jwYrNbHpHKN
gKvbdj1XFX5z33+/vSVi4TdTRb8CgYEA7j++XPZb+yVn5W4GbrBZmGkdFjXQAu8C
f9OqvZOMrqt9RMaeA4D61E75qoFFQfEvs1zvFwZ9myAjD5kiA5TEj6KObYEqjx20
v7enqGDLGF0zwpJBMhulamC5hJmF+jl52PzEhgog6EGHuhZ1MuS9V7jjJlOIV3zJ
v+jpHFG5ZFUCgYBINhRI8JvsYxasE9Z+MX1VhZB0yd7gFVD2funDPncrHpdQeGXG
uLfWZp4bN1ow1Lufuo9iw8SE1xYVtzzFIPzXraPNP7/31S/OcccOBAFEaW37CNHi
zqg2gbhrwaP6y+FVRG6zEjvvMqTkmu4bjUCmjmKuPr0GAKV60YygwCHJuwKBgQDH
nrMicuyopjPCIQjUr3+yWsgbNuVdv+LpNXGGu90Q8PDZskztBKGlR7KasQtVb/8W
mpRdR3vwgOG/jP/Z3kk/S+VoTORa23n5dKjORKOGe3kF2sMzd8SGOBrYxkViXcwB
CfCjmlLuJxHQ0kZKaStYF7qC/1RqcU0dNcozhyn9rQKBgQCcl87gCdDMPEqZLgKC
WF0JNl9XECa+7elMVhdCIK+bSgSyz91AuJ9oeR/B7ptfCA+nZRVcdGuzc6MRDVrU
wcVfBbn8JausgtK62URFJyI4oVIf/LaUFDn79DPNu9tUw9whBzhbhcIHRR3KnmV8
gms5cUOCDHrfE4oq3+dr3IqlnQ==
-----END PRIVATE KEY-----`;

const KEY_ONE_PUBLIC = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4xZVhg7sjxQYz4f9xTQg
0f2lp9QEgS1Z4QudJ1sABruVfK0ErTdxanYo4V2Ow2DZ67sw6VUSH2/jw8uuEI/+
WPFEBCdIprMNkrsGaLZbwXpoeL4kB7vbXRfZUz3sj8I2Zx5ibx8TIqceHLkDreTS
tyKJvAkED7NOVhr9vmF4KF/4KeoCfjKZqk7rWboDZ4JD10SPJg33QnBmFxj1uCGa
c95mkrl7HLS1LSG0X457KJ+xgbhYyR43d3moRDc4mHCxiDyXkLKXWNArxiFxNqGD
zyCogXeYv41auykz3G+NLOzXipl8WQPAGBtpRMFL9JKdI9mB3hEPLE6s+pqGu+vE
awIDAQAB
-----END PUBLIC KEY-----`;

type MockRedis = {
  exists: jest.Mock<Promise<number>, [string]>;
  set: jest.Mock<Promise<'OK'>, [string, string, string, number]>;
};

const mockRedisClient: MockRedis = {
  exists: jest.fn(),
  set: jest.fn(),
};

const mockGetSessionClient = jest.mocked(getSessionClient);

const configureKeySet = () => {
  configureJwtKeySet({
    activeKeyId: ACTIVE_KEY_ID,
    keys: [
      {
        id: ACTIVE_KEY_ID,
        privateKey: KEY_ONE_PRIVATE,
        publicKey: KEY_ONE_PUBLIC,
      },
    ],
  });
};

const createMockRequest = (headers: Record<string, string> = {}): Request => {
  const normalisedHeaders = Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key.toLowerCase()] = value;
    return acc;
  }, {});

  return {
    headers: { ...normalisedHeaders },
    get: jest.fn((name: string) => normalisedHeaders[name.toLowerCase()]),
  } as unknown as Request;
};

const createMockResponse = () => {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn().mockReturnThis();

  const res = {
    status,
    json,
    locals: {},
  } as unknown as Response;

  return { res, status, json };
};

const createRequestWithUser = (
  user?: Partial<AuthenticatedRequestUser>
): Request => {
  const baseUser: AuthenticatedRequestUser = {
    id: 'user-123',
    role: 'admin',
    zoneId: 'zone-9',
    token: 'access-token',
    tokenExpiresAt: Date.now() + 60_000,
  };

  return {
    user: user ? { ...baseUser, ...user } : undefined,
  } as unknown as Request;
};

describe('authenticateJwt middleware', () => {
  beforeEach(() => {
    configureKeySet();
    mockRedisClient.exists.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.exists.mockResolvedValue(0);
    mockRedisClient.set.mockResolvedValue('OK');
    mockGetSessionClient.mockReturnValue(mockRedisClient as unknown as ReturnType<typeof getSessionClient>);
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetJwtKeySet();
    jest.useRealTimers();
  });

  it('allows requests with a valid access token', async () => {
    const token = generateAccessToken({
      userId: 'user-123',
      role: 'admin',
      zoneId: 'zone-9',
    });

    const req = createMockRequest({ authorization: `Bearer ${token}` });
    const { res, status, json } = createMockResponse();
    const next: NextFunction = jest.fn();

    await authenticateJwt(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
    expect(req.user).toMatchObject({
      id: 'user-123',
      role: 'admin',
      zoneId: 'zone-9',
      token,
    });
    expect(typeof req.user?.tokenExpiresAt).toBe('number');
    expect(mockRedisClient.exists).toHaveBeenCalledTimes(1);
  });

  it('rejects requests with no authorization header', async () => {
    const req = createMockRequest();
    const { res, status, json } = createMockResponse();
    const next: NextFunction = jest.fn();

    await authenticateJwt(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Authentication required' });
  });

  it('rejects requests with an invalid token', async () => {
    const req = createMockRequest({ authorization: 'Bearer invalid.token.value' });
    const { res, status, json } = createMockResponse();
    const next: NextFunction = jest.fn();

    await authenticateJwt(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Invalid access token' });
  });

  it('rejects requests when the token has expired', async () => {
    const token = generateAccessToken({
      userId: 'user-123',
      role: 'admin',
      zoneId: 'zone-9',
    });

    jest.useFakeTimers().setSystemTime(new Date(Date.now() + 2 * 60 * 60 * 1000));

    const req = createMockRequest({ authorization: `Bearer ${token}` });
    const { res, status, json } = createMockResponse();
    const next: NextFunction = jest.fn();

    await authenticateJwt(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Access token expired' });
  });

  it('rejects requests when the token is blacklisted', async () => {
    mockRedisClient.exists.mockResolvedValueOnce(1);

    const token = generateAccessToken({
      userId: 'user-123',
      role: 'admin',
      zoneId: 'zone-9',
    });

    const req = createMockRequest({ authorization: `Bearer ${token}` });
    const { res, status, json } = createMockResponse();
    const next: NextFunction = jest.fn();

    await authenticateJwt(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Access token has been revoked' });
  });

  it('rejects refresh tokens presented as an access token', async () => {
    const refreshToken = generateRefreshToken({
      userId: 'user-123',
      role: 'admin',
      zoneId: 'zone-9',
    });

    const req = createMockRequest({ authorization: `Bearer ${refreshToken}` });
    const { res, status, json } = createMockResponse();
    const next: NextFunction = jest.fn();

    await authenticateJwt(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Invalid access token' });
  });

  it('returns service unavailable when blacklist lookup fails', async () => {
    mockRedisClient.exists.mockRejectedValueOnce(new Error('redis unavailable'));

    const token = generateAccessToken({
      userId: 'user-123',
      role: 'admin',
      zoneId: 'zone-9',
    });

    const req = createMockRequest({ authorization: `Bearer ${token}` });
    const { res, status, json } = createMockResponse();
    const next: NextFunction = jest.fn();

    await authenticateJwt(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({ message: 'Service temporarily unavailable' });
  });
});

describe('authorizeRoles middleware', () => {
  it('allows access when the user has the required role', () => {
    const middleware = authorizeRoles('admin');
    const req = createRequestWithUser({ role: 'admin' });
    const { res, status, json } = createMockResponse();
    const next: NextFunction = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it('allows access when the user matches one of multiple roles (case-insensitive)', () => {
    const middleware = authorizeRoles(['Admin', 'manager']);
    const req = createRequestWithUser({ role: 'MANAGER' });
    const { res, status, json } = createMockResponse();
    const next: NextFunction = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it('rejects access when the user role is not permitted', () => {
    const middleware = authorizeRoles(['admin', 'manager']);
    const req = createRequestWithUser({ role: 'caregiver' });
    const { res, status, json } = createMockResponse();
    const next: NextFunction = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
  });

  it('rejects access with 401 when the request is unauthenticated', () => {
    const middleware = authorizeRoles('admin');
    const req = createRequestWithUser(undefined);
    const { res, status, json } = createMockResponse();
    const next: NextFunction = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Authentication required' });
  });
});
