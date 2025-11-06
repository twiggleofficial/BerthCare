import type {
  CacheHealth,
  CacheHealthState,
  CacheSetOptions,
} from './redis.js';
import {
  CACHE_TTL,
  closeRedisConnections,
  del,
  get,
  getCacheHealth,
  getRedisClient,
  invalidate,
  set,
} from './redis.js';

export {
  CACHE_TTL,
  type CacheHealth,
  type CacheHealthState,
  type CacheSetOptions,
  get,
  set,
  del,
  invalidate,
  getCacheHealth,
  getRedisClient,
  closeRedisConnections,
};

export const closeRedisConnection = async (): Promise<void> => {
  await closeRedisConnections();
};
