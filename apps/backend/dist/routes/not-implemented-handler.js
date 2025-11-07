import { createErrorResponse } from '../errors/create-error-response.js';
import { SERVER_NOT_IMPLEMENTED } from '../errors/error-codes.js';
export const createNotImplementedHandler = ({ logger, message, code = SERVER_NOT_IMPLEMENTED }) => (_req, res) => {
    logger.warn(message);
    const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
    res.status(501).json(createErrorResponse({
        code,
        message,
        requestId,
    }));
};
