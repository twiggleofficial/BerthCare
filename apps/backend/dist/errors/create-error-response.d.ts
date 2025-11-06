type ErrorResponseOptions = {
    code?: string;
    message?: string;
    details?: unknown;
    requestId?: string;
    timestamp?: string;
};
export declare const createErrorResponse: ({ code: maybeCode, message: maybeMessage, details, requestId, timestamp, }: ErrorResponseOptions) => {
    error: {
        code: string;
        message: string;
        timestamp: string;
        requestId?: string;
        details?: unknown;
    };
};
export {};
