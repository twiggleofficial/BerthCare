import type { Request, Response } from 'express';
import type { Logger as WinstonLogger } from 'winston';

import { createErrorResponse } from '../errors/create-error-response.js';
import { SERVER_NOT_IMPLEMENTED, type KnownErrorCode } from '../errors/error-codes.js';

type NotImplementedHandlerOptions = {
  logger: WinstonLogger;
  message: string;
  code?: KnownErrorCode;
};

export const createNotImplementedHandler =
  ({ logger, message, code = SERVER_NOT_IMPLEMENTED }: NotImplementedHandlerOptions) =>
  (_req: Request, res: Response): void => {
    logger.warn(message);

    const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;

    res.status(501).json(
      createErrorResponse({
        code,
        message,
        requestId,
      }),
    );
  };
