import { createErrorResponse } from '../errors/create-error-response.js';
import { DEFAULT_ERROR_CODE, getDefaultMessageForCode } from '../errors/error-codes.js';
import { createLogger } from '../logger/index.js';
const errorLogger = createLogger('error');
const deriveStatusCode = (error) => {
    if (typeof error.status === 'number' && error.status >= 400) {
        return error.status;
    }
    return 500;
};
const defaultCodeForStatus = (status) => {
    if (status >= 500) {
        return 'SERVER_UNKNOWN_ERROR';
    }
    if (status === 404) {
        return 'RESOURCE_NOT_FOUND';
    }
    if (status === 401) {
        return 'AUTH_INVALID_CREDENTIALS';
    }
    if (status === 403) {
        return 'AUTH_INSUFFICIENT_PERMISSIONS';
    }
    if (status === 409) {
        return 'CONFLICT_INVALID_STATE';
    }
    if (status === 422) {
        return 'VALIDATION_OUT_OF_RANGE';
    }
    if (status === 400) {
        return 'VALIDATION_INVALID_FORMAT';
    }
    return DEFAULT_ERROR_CODE;
};
export const errorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        next(error);
        return;
    }
    const status = deriveStatusCode(error);
    const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
    const code = error.code ?? defaultCodeForStatus(status);
    const shouldExpose = error.expose ?? status < 500;
    const fallbackMessage = getDefaultMessageForCode(code) ?? getDefaultMessageForCode(DEFAULT_ERROR_CODE) ?? 'An unexpected error occurred';
    const message = shouldExpose ? error.message ?? fallbackMessage : fallbackMessage;
    const details = shouldExpose ? error.details : undefined;
    errorLogger.error('Unhandled application error', {
        message: error.message,
        stack: error.stack,
        status,
        path: req.originalUrl,
        code,
        requestId,
        details: error.details,
    });
    res.status(status).json(createErrorResponse({
        code,
        message,
        details,
        requestId,
    }));
};
