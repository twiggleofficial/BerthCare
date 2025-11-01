import { getCacheClient } from '../cache/redis';
import { logger } from '../logger';

const LIST_CACHE_PATTERN = 'clients:list:*';
const LIST_CACHE_SCAN_COUNT = 100;

export const buildClientDetailCacheKey = (clientId: string): string => `clients:detail:${clientId}`;

export const invalidateClientCaches = async (clientId: string): Promise<void> => {
  const cache = getCacheClient();

  try {
    await cache.del(buildClientDetailCacheKey(clientId));
  } catch (error) {
    logger.warn('Failed to invalidate client detail cache', {
      error: error instanceof Error ? error.message : 'unknown_error',
      clientId,
    });
  }

  try {
    let cursor = '0';

    do {
      const [nextCursor, keys] = await cache.scan(
        cursor,
        'MATCH',
        LIST_CACHE_PATTERN,
        'COUNT',
        LIST_CACHE_SCAN_COUNT
      );

      if (Array.isArray(keys) && keys.length > 0) {
        await cache.del(...keys);
      }

      cursor = nextCursor;
    } while (cursor !== '0');
  } catch (error) {
    logger.warn('Failed to invalidate clients list cache', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
  }
};
