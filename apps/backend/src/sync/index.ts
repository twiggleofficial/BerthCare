import { Router } from 'express';

import { createErrorResponse } from '../errors/create-error-response.js';
import { createLogger } from '../logger/index.js';

const syncLogger = createLogger('sync');

export const createSyncRouter = (): Router => {
  const router = Router();

  router.post('/trigger', (_req, res) => {
    syncLogger.info('Manual sync trigger requested');
    const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
    res.status(501).json(
      createErrorResponse({
        code: 'NOT_IMPLEMENTED',
        message: 'Sync endpoints are not implemented yet',
        requestId,
      }),
    );
  });

  return router;
};
