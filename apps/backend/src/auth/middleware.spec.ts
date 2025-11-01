import crypto from 'node:crypto';
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

let testPrivateKey: string;
let testPublicKey: string;

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
  if (!testPrivateKey || !testPublicKey) {
    throw new Error('JWT test keys have not been initialised');
  }
  configureJwtKeySet({
    activeKeyId: ACTIVE_KEY_ID,
    keys: [
      {
        id: ACTIVE_KEY_ID,
        privateKey: testPrivateKey,
        publicKey: testPublicKey,
      },
    ],
  });
};

const createMockRequest = (headers: Record<string, string> = {}): Request => {
  const normalisedHeaders = Object.entries(headers).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      acc[key.toLowerCase()] = value;
      return acc;
    },
    {}
  );

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

const createRequestWithUser = (user?: Partial<AuthenticatedRequestUser>): Request => {
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
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });
    testPrivateKey = privateKey;
    testPublicKey = publicKey;

    configureKeySet();
    mockRedisClient.exists.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.exists.mockResolvedValue(0);
    mockRedisClient.set.mockResolvedValue('OK');
    mockGetSessionClient.mockReturnValue(
      mockRedisClient as unknown as ReturnType<typeof getSessionClient>
    );
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
