import { Router } from 'express';

import { createErrorResponse } from '../errors/create-error-response.js';
import { createLogger } from '../logger/index.js';

const familyLogger = createLogger('family');

export const createFamilyRouter = (): Router => {
  const router = Router();

  router.get('/', (_req, res) => {
    familyLogger.info('Family feed requested');
    const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
    res.status(501).json(
      createErrorResponse({
        code: 'NOT_IMPLEMENTED',
        message: 'Family endpoints are not implemented yet',
        requestId,
      }),
    );
  });

  return router;
};
