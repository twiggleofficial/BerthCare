import type { Request, Response } from 'express';

import { createErrorResponse } from '../errors/create-error-response.js';

export const notFoundHandler = (req: Request, res: Response) => {
  const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;

  res.status(404).json(
    createErrorResponse({
      code: 'RESOURCE_NOT_FOUND',
      details: { path: req.originalUrl },
      requestId,
    }),
  );
};
