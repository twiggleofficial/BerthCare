import { Router } from 'express';
import { createErrorResponse } from '../errors/create-error-response.js';
import { createLogger } from '../logger/index.js';
const twilioLogger = createLogger('twilio');
export const createTwilioRouter = () => {
    const router = Router();
    router.post('/voice/callback', (_req, res) => {
        twilioLogger.info('Twilio voice callback received');
        const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
        res.status(501).json(createErrorResponse({
            code: 'SERVER_UNKNOWN_ERROR',
            message: 'Twilio webhook handling not implemented yet',
            requestId,
        }));
    });
    return router;
};
