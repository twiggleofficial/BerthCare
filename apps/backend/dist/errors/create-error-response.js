import { DEFAULT_ERROR_CODE, getDefaultMessageForCode } from './error-codes.js';
// Produces the consistent payload defined in project-documentation/architecture-output.md – Error Response Format.
export const createErrorResponse = ({ code: maybeCode, message: maybeMessage, details, requestId, timestamp, }) => {
    const code = maybeCode ?? DEFAULT_ERROR_CODE;
    const fallbackMessage = getDefaultMessageForCode(DEFAULT_ERROR_CODE) ?? 'An unexpected error occurred';
    const derivedMessage = maybeMessage ?? getDefaultMessageForCode(code) ?? fallbackMessage;
    const errorPayload = {
        code,
        message: derivedMessage,
        timestamp: timestamp ?? new Date().toISOString(),
    };
    if (typeof requestId === 'string' && requestId.length > 0) {
        errorPayload.requestId = requestId;
    }
    if (details !== undefined) {
        errorPayload.details = details;
    }
    return {
        error: errorPayload,
    };
};
