import { Router } from 'express';
import { createErrorResponse } from '../errors/create-error-response.js';
import { createLogger } from '../logger/index.js';
const clientsLogger = createLogger('clients');
export const createClientsRouter = () => {
    const router = Router();
    router.get('/', (_req, res) => {
        clientsLogger.info('Clients listing requested');
        const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
        res.status(501).json(createErrorResponse({
            code: 'SERVER_UNKNOWN_ERROR',
            message: 'Clients endpoints are not implemented yet',
            requestId,
        }));
    });
    return router;
};
