// Error codes align with project-documentation/architecture-output.md – Error Response Format.
export const SPEC_ERROR_MESSAGES = {
    AUTH_INVALID_CREDENTIALS: 'Invalid email or password',
    AUTH_INVALID_ACTIVATION_CODE: 'Activation code not recognized',
    AUTH_ACTIVATION_EXPIRED: 'Activation code has expired',
    AUTH_TOKEN_EXPIRED: 'Session expired, please re-authenticate',
    AUTH_TOKEN_INVALID: 'Invalid authentication token',
    AUTH_DEVICE_REVOKED: 'This device has been unenrolled',
    AUTH_PIN_REQUIRED: 'Offline PIN required to continue',
    AUTH_INSUFFICIENT_PERMISSIONS: "You don't have permission to perform this action",
    AUTH_ZONE_ACCESS_DENIED: "You don't have access to this zone",
    VALIDATION_REQUIRED_FIELD: 'Required field missing',
    VALIDATION_INVALID_FORMAT: 'Invalid data format',
    VALIDATION_OUT_OF_RANGE: 'Value out of acceptable range',
    RESOURCE_NOT_FOUND: 'Resource not found',
    VISIT_NOT_FOUND: 'Visit not found',
    CLIENT_NOT_FOUND: 'Client not found',
    CONFLICT_DUPLICATE_ENTRY: 'Resource already exists',
    CONFLICT_CONCURRENT_UPDATE: 'Resource was modified by another user',
    CONFLICT_INVALID_STATE: 'Operation not allowed in current state',
    SERVER_DATABASE_ERROR: 'Database error occurred',
    SERVER_EXTERNAL_SERVICE_ERROR: 'External service unavailable',
    SERVER_UNKNOWN_ERROR: 'An unexpected error occurred',
};
const ADDITIONAL_ERROR_MESSAGES = {
    AUTH_UNAUTHENTICATED: 'Authentication required.',
    AUTH_INSUFFICIENT_ROLE: 'Insufficient role for this operation.',
    AUTH_ZONE_CONTEXT_REQUIRED: 'Zone context is required for this operation.',
    AUTH_SERVICE_UNAVAILABLE: 'Authentication service temporarily unavailable.',
    AUTH_ACTIVATION_FAILED: 'Failed to process activation.',
    AUTH_ACTIVATION_COMPLETION_FAILED: 'Failed to complete activation.',
    AUTH_ACTIVATION_RATE_LIMITED: 'Activation attempts temporarily limited.',
    AUTH_DEVICE_ALREADY_ENROLLED: 'Device already enrolled.',
    AUTH_INVALID_ACTIVATION_PAYLOAD: 'Activation payload is invalid.',
    AUTH_INVALID_ACTIVATION_COMPLETION_PAYLOAD: 'Activation completion payload is invalid.',
    AUTH_INVALID_ACTIVATION_TOKEN: 'Activation token is invalid.',
    AUTH_PIN_POLICY_VIOLATION: 'PIN does not meet policy requirements.',
    AUTH_INVALID_SESSION_REFRESH_PAYLOAD: 'Session refresh payload is invalid.',
    AUTH_INVALID_SESSION_REVOKE_PAYLOAD: 'Session revoke payload is invalid.',
    AUTH_SESSION_NOT_FOUND: 'Device session could not be found.',
    AUTH_DEVICE_MISMATCH: 'Request does not match the active device session.',
};
export const ERROR_MESSAGES = {
    ...SPEC_ERROR_MESSAGES,
    ...ADDITIONAL_ERROR_MESSAGES,
};
export const DEFAULT_ERROR_CODE = 'SERVER_UNKNOWN_ERROR';
export const getDefaultMessageForCode = (code) => {
    return ERROR_MESSAGES[code];
};
