import { Router } from 'express';

import { createLogger } from '../logger/index.js';
import { createNotImplementedHandler } from '../routes/not-implemented-handler.js';

const carePlansLogger = createLogger('care-plans');

export const createCarePlansRouter = (): Router => {
  const router = Router();

  router.get(
    '/',
    createNotImplementedHandler({
      logger: carePlansLogger,
      message: 'Care plan listing requested',
    }),
  );

  return router;
};
