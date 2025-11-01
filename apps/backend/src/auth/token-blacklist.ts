import crypto from 'node:crypto';

import { getSessionClient } from '../cache/redis';

const ACCESS_TOKEN_BLACKLIST_PREFIX = 'auth:blacklist:access:';

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

const buildAccessTokenKey = (token: string): string =>
  `${ACCESS_TOKEN_BLACKLIST_PREFIX}${hashToken(token)}`;

/**
 * Adds an access token to the blacklist with a TTL matching the remaining lifetime of the token.
 * The value stored in Redis does not matter; only the key existence is important.
 */
export const blacklistAccessToken = async (token: string, ttlSeconds: number): Promise<void> => {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return;
  }

  const client = getSessionClient();
  const key = buildAccessTokenKey(token);

  await client.set(key, '1', 'EX', Math.ceil(ttlSeconds));
};

export const isAccessTokenBlacklisted = async (token: string): Promise<boolean> => {
  const client = getSessionClient();
  const key = buildAccessTokenKey(token);

  const exists = await client.exists(key);
  return exists === 1;
};
