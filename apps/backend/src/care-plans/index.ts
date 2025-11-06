import { Router } from 'express';

import { createErrorResponse } from '../errors/create-error-response.js';
import { createLogger } from '../logger/index.js';

const carePlansLogger = createLogger('care-plans');

export const createCarePlansRouter = (): Router => {
  const router = Router();

  router.get('/', (_req, res) => {
    carePlansLogger.info('Care plan listing requested');
    const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
    res.status(501).json(
      createErrorResponse({
        code: 'SERVER_UNKNOWN_ERROR',
        message: 'Care plans endpoints are not implemented yet',
        requestId,
      }),
    );
  });

  return router;
};
