import crypto from 'node:crypto';
import {
  configureJwtKeySet,
  generateAccessToken,
  generateRefreshToken,
  resetJwtKeySet,
  verifyToken,
} from 'libs/shared/jwt-utils';
import type { JwtPayload } from 'jsonwebtoken';

const ACTIVE_KEY_ID = 'key-20240201';
const ROTATED_KEY_ID = 'key-20240530';

let keyOnePrivate: string;
let keyOnePublic: string;
let keyTwoPrivate: string;
let keyTwoPublic: string;

const configureKeySet = () => {
  configureJwtKeySet({
    activeKeyId: ACTIVE_KEY_ID,
    keys: [
      { id: ACTIVE_KEY_ID, privateKey: keyOnePrivate, publicKey: keyOnePublic },
      { id: ROTATED_KEY_ID, privateKey: keyTwoPrivate, publicKey: keyTwoPublic },
    ],
  });
};

const claims = {
  userId: 'user-123',
  role: 'coordinator',
  zoneId: 'zone-456',
};

describe('jwt utils', () => {
  beforeAll(() => {
    const keyOne = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const keyTwo = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    keyOnePrivate = keyOne.privateKey;
    keyOnePublic = keyOne.publicKey;
    keyTwoPrivate = keyTwo.privateKey;
    keyTwoPublic = keyTwo.publicKey;
  });

  beforeEach(() => {
    configureKeySet();
  });

  afterEach(() => {
    resetJwtKeySet();
    delete process.env.JWT_PRIVATE_KEY_SET;
    delete process.env.JWT_PRIVATE_KEYS;
  });

  it('generates an access token with the expected claims and expiry', () => {
    const token = generateAccessToken(claims);
    const { payload, header } = verifyToken(token);
    const typedPayload = payload as JwtPayload & {
      exp: number;
      iat: number;
      role: string;
      token_type: string;
      user_id: string;
      zone_id: string;
    };

    expect(header.kid).toBe(ACTIVE_KEY_ID);
    expect(typedPayload.sub).toBe(claims.userId);
    expect(typedPayload.user_id).toBe(claims.userId);
    expect(typedPayload.role).toBe(claims.role);
    expect(typedPayload.zone_id).toBe(claims.zoneId);
    expect(typedPayload.token_type).toBe('access');
    expect(typedPayload.exp - typedPayload.iat).toBe(3600);
  });

  it('generates a refresh token that expires in 30 days', () => {
    const token = generateRefreshToken(claims);
    const { payload, header } = verifyToken(token);
    const typedPayload = payload as JwtPayload & {
      exp: number;
      iat: number;
      token_type: string;
    };

    expect(header.kid).toBe(ACTIVE_KEY_ID);
    expect(typedPayload.token_type).toBe('refresh');
    expect(typedPayload.exp - typedPayload.iat).toBe(60 * 60 * 24 * 30);
  });

  it('supports key rotation by honouring the kid header on verification', () => {
    const legacyToken = generateAccessToken(claims);

    configureJwtKeySet({
      activeKeyId: ROTATED_KEY_ID,
      keys: [
        { id: ROTATED_KEY_ID, privateKey: keyTwoPrivate, publicKey: keyTwoPublic },
        // keep legacy key for verification of previously-issued tokens
        { id: ACTIVE_KEY_ID, privateKey: keyOnePrivate, publicKey: keyOnePublic },
      ],
    });

    const newToken = generateAccessToken(claims);

    expect(verifyToken(legacyToken).header.kid).toBe(ACTIVE_KEY_ID);
    expect(verifyToken(newToken).header.kid).toBe(ROTATED_KEY_ID);
  });

  it('loads key material from JWT_PRIVATE_KEY_SET when no in-memory key set is configured', () => {
    process.env.JWT_PRIVATE_KEY_SET = JSON.stringify({
      activeKeyId: ACTIVE_KEY_ID,
      keys: [
        {
          id: ACTIVE_KEY_ID,
          privateKey: keyOnePrivate.replace(/\n/g, '\\n'),
          publicKey: keyOnePublic.replace(/\n/g, '\\n'),
        },
      ],
    });

    resetJwtKeySet();

    const token = generateAccessToken(claims);
    const { header } = verifyToken(token);

    expect(header.kid).toBe(ACTIVE_KEY_ID);
  });
});
