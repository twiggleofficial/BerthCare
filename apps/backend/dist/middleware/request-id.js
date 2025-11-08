import crypto from 'node:crypto';
const REQUEST_ID_HEADER = 'x-request-id';
const MAX_HEADER_LENGTH = 128;
const sanitizeIncomingId = (value) => {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return undefined;
    }
    if (trimmed.length > MAX_HEADER_LENGTH) {
        return trimmed.slice(0, MAX_HEADER_LENGTH);
    }
    return trimmed;
};
export const requestId = (req, res, next) => {
    const incoming = sanitizeIncomingId(req.header(REQUEST_ID_HEADER));
    const requestIdValue = incoming ?? crypto.randomUUID();
    res.locals.requestId = requestIdValue;
    res.setHeader(REQUEST_ID_HEADER, requestIdValue);
    req.requestId = requestIdValue;
    next();
};
