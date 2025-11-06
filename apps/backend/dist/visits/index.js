import { Router } from 'express';
import { createErrorResponse } from '../errors/create-error-response.js';
import { createLogger } from '../logger/index.js';
const visitsLogger = createLogger('visits');
export const createVisitsRouter = () => {
    const router = Router();
    router.get('/', (_req, res) => {
        visitsLogger.info('Visits listing requested');
        const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
        res.status(501).json(createErrorResponse({
            code: 'SERVER_UNKNOWN_ERROR',
            message: 'Visits endpoints are not implemented yet',
            requestId,
        }));
    });
    return router;
};
