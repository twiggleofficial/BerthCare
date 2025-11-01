import jwt, {
  type Algorithm,
  type JwtHeader,
  type JwtPayload,
  type SignOptions,
  type VerifyOptions,
} from 'jsonwebtoken';

const ACCESS_TOKEN_EXPIRATION = '1h' satisfies SignOptions['expiresIn'];
const REFRESH_TOKEN_EXPIRATION = '30d' satisfies SignOptions['expiresIn'];
type TokenExpiration = typeof ACCESS_TOKEN_EXPIRATION | typeof REFRESH_TOKEN_EXPIRATION;
const SIGNING_ALGORITHM: Algorithm = 'RS256';

const KEYSET_ENV_VARS = ['JWT_PRIVATE_KEY_SET', 'JWT_PRIVATE_KEYS'] as const;

export type JwtTokenType = 'access' | 'refresh';

export interface TokenClaims {
  userId: string;
  role: string;
  zoneId: string;
}

export interface JwtSigningKey {
  id: string;
  privateKey: string;
  publicKey: string;
}

export interface JwtKeySet {
  activeKeyId: string;
  keys: JwtSigningKey[];
}

export interface VerifiedJwt<TPayload extends JwtPayload = JwtPayload> {
  header: JwtHeader & { kid: string };
  payload: TPayload;
}

let cachedKeySet: JwtKeySet | null = null;

const normaliseKeyMaterial = (key: string): string =>
  key.includes('\\n') ? key.replace(/\\n/g, '\n') : key;

const cloneKey = ({ id, privateKey, publicKey }: JwtSigningKey): JwtSigningKey => ({
  id,
  privateKey: normaliseKeyMaterial(privateKey),
  publicKey: normaliseKeyMaterial(publicKey),
});

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const assertTokenClaims = (claims: TokenClaims): void => {
  if (!isNonEmptyString(claims.userId)) {
    throw new Error('Token claims must include a non-empty user id.');
  }

  if (!isNonEmptyString(claims.role)) {
    throw new Error('Token claims must include a non-empty role.');
  }

  if (!isNonEmptyString(claims.zoneId)) {
    throw new Error('Token claims must include a non-empty zone id.');
  }
};

const parseKeySet = (raw: string): JwtKeySet => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Unable to parse JWT key set: ${(error as Error).message}`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('JWT key set must be a JSON object.');
  }

  const { activeKeyId, keys } = parsed as Partial<JwtKeySet>;

  if (!isNonEmptyString(activeKeyId)) {
    throw new Error('JWT key set must include an activeKeyId.');
  }

  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error('JWT key set must include a non-empty keys array.');
  }

  const normalisedKeys = keys.map((key) => {
    if (typeof key !== 'object' || key === null) {
      throw new Error('Each JWT signing key must be an object.');
    }

    const { id, privateKey, publicKey } = key as Partial<JwtSigningKey>;

    if (!isNonEmptyString(id)) {
      throw new Error('JWT signing key must include a non-empty id.');
    }

    if (!isNonEmptyString(privateKey)) {
      throw new Error(`JWT signing key "${id}" must include a privateKey.`);
    }

    if (!isNonEmptyString(publicKey)) {
      throw new Error(`JWT signing key "${id}" must include a publicKey.`);
    }

    return cloneKey({ id, privateKey, publicKey });
  });

  const hasActiveKey = normalisedKeys.some((key) => key.id === activeKeyId);

  if (!hasActiveKey) {
    throw new Error(`JWT key set does not include the active key "${activeKeyId}".`);
  }

  return {
    activeKeyId,
    keys: normalisedKeys,
  };
};

const loadKeySetFromEnvironment = (): JwtKeySet => {
  for (const envVar of KEYSET_ENV_VARS) {
    const raw = process.env[envVar];

    if (isNonEmptyString(raw)) {
      return parseKeySet(raw);
    }
  }

  throw new Error(
    'JWT key set is not configured. Set JWT_PRIVATE_KEY_SET with AWS Secrets Manager output.'
  );
};

const getKeySet = (): JwtKeySet => {
  if (!cachedKeySet) {
    cachedKeySet = loadKeySetFromEnvironment();
  }

  return cachedKeySet;
};

const getActiveKey = (): JwtSigningKey => {
  const keySet = getKeySet();
  const activeKey = keySet.keys.find((key) => key.id === keySet.activeKeyId);

  if (!activeKey) {
    throw new Error(`Active JWT signing key "${keySet.activeKeyId}" is missing.`);
  }

  return activeKey;
};

const getKeyById = (keyId: string): JwtSigningKey | undefined =>
  getKeySet().keys.find((key) => key.id === keyId);

const buildSignOptions = (expiration: TokenExpiration, keyId: string): SignOptions => {
  const options: SignOptions = {
    algorithm: SIGNING_ALGORITHM,
    expiresIn: expiration,
    keyid: keyId,
  };

  if (process.env.JWT_ISSUER) {
    options.issuer = process.env.JWT_ISSUER;
  }

  if (process.env.JWT_AUDIENCE) {
    options.audience = process.env.JWT_AUDIENCE;
  }

  return options;
};

const buildVerifyOptions = (): VerifyOptions => {
  const options: VerifyOptions = {
    algorithms: [SIGNING_ALGORITHM],
  };

  if (process.env.JWT_ISSUER) {
    options.issuer = process.env.JWT_ISSUER;
  }

  if (process.env.JWT_AUDIENCE) {
    options.audience = process.env.JWT_AUDIENCE;
  }

  return options;
};

const signToken = (
  claims: TokenClaims,
  tokenType: JwtTokenType,
  expiration: TokenExpiration
): string => {
  assertTokenClaims(claims);

  const signingKey = getActiveKey();
  const payload: JwtPayload = {
    sub: claims.userId,
    user_id: claims.userId,
    role: claims.role,
    zone_id: claims.zoneId,
    token_type: tokenType,
  };

  return jwt.sign(payload, signingKey.privateKey, buildSignOptions(expiration, signingKey.id));
};

export const generateAccessToken = (claims: TokenClaims): string =>
  signToken(claims, 'access', ACCESS_TOKEN_EXPIRATION);

export const generateRefreshToken = (claims: TokenClaims): string =>
  signToken(claims, 'refresh', REFRESH_TOKEN_EXPIRATION);

export const verifyToken = <TPayload extends JwtPayload = JwtPayload>(
  token: string
): VerifiedJwt<TPayload> => {
  const decoded = jwt.decode(token, { complete: true });

  if (!decoded || typeof decoded === 'string') {
    throw new Error('Token is malformed.');
  }

  const { header } = decoded;

  if (!isNonEmptyString(header.kid)) {
    throw new Error('Token is missing its signing key id (kid).');
  }

  const signingKey = getKeyById(header.kid);

  if (!signingKey) {
    throw new Error(`No signing key found for kid "${header.kid}".`);
  }

  const payload = jwt.verify(token, signingKey.publicKey, buildVerifyOptions()) as TPayload;

  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Verified token payload is not an object.');
  }

  return {
    header: {
      ...header,
      kid: header.kid,
    },
    payload,
  };
};

export const configureJwtKeySet = (keySet: JwtKeySet): void => {
  cachedKeySet = {
    activeKeyId: keySet.activeKeyId,
    keys: keySet.keys.map(cloneKey),
  };
};

export const resetJwtKeySet = (): void => {
  cachedKeySet = null;
};
