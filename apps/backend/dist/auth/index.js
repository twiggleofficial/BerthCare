import { Router } from 'express';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { projectMetadata } from '@berthcare/shared';
import { env } from '../config/environment.js';
import { createErrorResponse } from '../errors/create-error-response.js';
import { createLogger } from '../logger/index.js';
import { ActivationError, createActivationService, } from './activation-service.js';
import { loadDeviceSession } from './middleware.js';
import { createSessionService, SessionError } from './session-service.js';
const authLogger = createLogger('auth');
const loginSchema = Joi.object({
    email: Joi.string().email({ tlds: false }).required(),
    password: Joi.string().min(8).max(128).required(),
});
const activationSchema = Joi.object({
    email: Joi.string().email({ tlds: false }).required(),
    activationCode: Joi.string()
        .pattern(/^\d{4}[- ]?\d{4}$/)
        .message('Activation code must be 8 digits')
        .required(),
    deviceFingerprint: Joi.string().max(255).required(),
    appVersion: Joi.string().max(50).required(),
});
let generatedHash = null;
const activationCompletionSchema = Joi.object({
    activationToken: Joi.string().length(64).hex().required(),
    pin: Joi.string()
        .pattern(/^\d{6}$/)
        .message('PIN must be exactly 6 digits')
        .required(),
    deviceName: Joi.string().max(255).required(),
    supportsBiometric: Joi.boolean().required(),
});
const sessionRefreshSchema = Joi.object({
    refreshToken: Joi.string().max(2048).required(),
    deviceId: Joi.string().guid({ version: 'uuidv4' }).required(),
});
const sessionRevokeSchema = Joi.object({
    refreshToken: Joi.string().max(2048).required(),
    deviceId: Joi.string().guid({ version: 'uuidv4' }).required(),
    reason: Joi.string().max(255).optional(),
});
const resolveDemoPasswordHash = async () => {
    if (env.authDemo.passwordHash) {
        return env.authDemo.passwordHash;
    }
    if (generatedHash) {
        return generatedHash;
    }
    generatedHash = await bcrypt.hash('CareTeam!23', 10);
    authLogger.warn('Using generated development credential hash; configure AUTH_DEMO_PASSWORD_HASH for consistency');
    return generatedHash;
};
const verifyCredentials = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const expectedEmail = env.authDemo.email.trim().toLowerCase();
    if (normalizedEmail !== expectedEmail) {
        return false;
    }
    const hash = await resolveDemoPasswordHash();
    return bcrypt.compare(password, hash);
};
export const createAuthRouter = () => {
    const router = Router();
    router.post('/login', async (req, res) => {
        const validation = loginSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });
        const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
        if (validation.error) {
            res.status(400).json(createErrorResponse({
                code: 'VALIDATION_INVALID_FORMAT',
                message: 'Invalid login request',
                details: validation.error.details.map((detail) => detail.message),
                requestId,
            }));
            return;
        }
        const { email, password } = validation.value;
        const isValid = await verifyCredentials(email, password);
        if (!isValid) {
            res.status(401).json(createErrorResponse({
                code: 'AUTH_INVALID_CREDENTIALS',
                message: 'Invalid email or password',
                requestId,
            }));
            return;
        }
        const accessToken = jwt.sign({
            sub: 'demo-user',
            email,
            scope: ['care-team'],
        }, env.jwtSecret, {
            issuer: projectMetadata.service,
            expiresIn: '1h',
        });
        res.json({
            accessToken,
            tokenType: 'Bearer',
            expiresIn: 3600,
        });
    });
    router.get('/me', (_req, res) => {
        const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
        res.status(501).json(createErrorResponse({
            code: 'SERVER_NOT_IMPLEMENTED',
            message: 'Account profile endpoint not implemented yet',
            requestId,
        }));
    });
    return router;
};
export const createAuthV1Router = (options = {}) => {
    const router = Router();
    const activationService = options.activationService ?? createActivationService();
    const sessionService = options.sessionService ?? createSessionService();
    router.post('/activate', async (req, res, next) => {
        // Activation flow aligns with project-documentation/architecture-output.md (Activation Flow – Step 1).
        const validation = activationSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });
        const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
        if (validation.error) {
            res.status(400).json(createErrorResponse({
                code: 'AUTH_INVALID_ACTIVATION_PAYLOAD',
                message: 'Invalid activation request',
                details: validation.error.details.map((detail) => detail.message),
                requestId,
            }));
            return;
        }
        try {
            const payload = validation.value;
            const ipAddress = typeof req.ip === 'string' ? req.ip : undefined;
            const activation = await activationService.requestActivation(payload, {
                ipAddress,
                userAgent: req.get('user-agent'),
            });
            res.status(200).json(activation);
        }
        catch (error) {
            if (error instanceof ActivationError) {
                res.status(error.status).json(createErrorResponse({
                    code: error.code,
                    message: error.expose ? error.message : undefined,
                    requestId,
                }));
                return;
            }
            next(error);
        }
    });
    router.post('/activate/complete', async (req, res, next) => {
        // Activation completion follows project-documentation/architecture-output.md (Activation Flow – Step 2).
        const validation = activationCompletionSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });
        const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
        if (validation.error) {
            res.status(400).json(createErrorResponse({
                code: 'AUTH_INVALID_ACTIVATION_COMPLETION_PAYLOAD',
                message: 'Invalid activation completion request',
                details: validation.error.details.map((detail) => detail.message),
                requestId,
            }));
            return;
        }
        try {
            const payload = validation.value;
            const ipAddress = typeof req.ip === 'string' ? req.ip : undefined;
            const tokens = await activationService.completeActivation(payload, {
                ipAddress,
                userAgent: req.get('user-agent'),
            });
            res.status(200).json(tokens);
        }
        catch (error) {
            if (error instanceof ActivationError) {
                res.status(error.status).json(createErrorResponse({
                    code: error.code,
                    message: error.expose ? error.message : undefined,
                    requestId,
                }));
                return;
            }
            next(error);
        }
    });
    router.post('/session/refresh', async (req, res, next) => {
        // Session refresh aligns with project-documentation/architecture-output.md – Session Management.
        const validation = sessionRefreshSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });
        const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
        if (validation.error) {
            res.status(400).json(createErrorResponse({
                code: 'AUTH_INVALID_SESSION_REFRESH_PAYLOAD',
                message: 'Invalid session refresh request',
                details: validation.error.details.map((detail) => detail.message),
                requestId,
            }));
            return;
        }
        try {
            const payload = validation.value;
            const ipAddress = typeof req.ip === 'string' ? req.ip : undefined;
            const tokens = await sessionService.refreshSession(payload, {
                ipAddress,
                userAgent: req.get('user-agent'),
            });
            res.status(200).json(tokens);
        }
        catch (error) {
            if (error instanceof SessionError) {
                res.status(error.status).json(createErrorResponse({
                    code: error.code,
                    message: error.expose ? error.message : undefined,
                    requestId,
                }));
                return;
            }
            next(error);
        }
    });
    router.post('/session/revoke', loadDeviceSession(sessionService), async (req, res, next) => {
        // Revocation flow aligns with project-documentation/architecture-output.md – Session Management.
        const validation = sessionRevokeSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });
        const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
        if (validation.error) {
            res.status(400).json(createErrorResponse({
                code: 'AUTH_INVALID_SESSION_REVOKE_PAYLOAD',
                message: 'Invalid session revoke request',
                details: validation.error.details.map((detail) => detail.message),
                requestId,
            }));
            return;
        }
        const authRequest = req;
        const deviceSession = authRequest.deviceSession;
        if (!deviceSession) {
            next(new Error('Device session context missing'));
            return;
        }
        const payload = validation.value;
        if (payload.deviceId !== deviceSession.id) {
            res.status(403).json(createErrorResponse({
                code: 'AUTH_DEVICE_MISMATCH',
                message: 'This request does not match the active device session.',
                requestId,
            }));
            return;
        }
        try {
            await sessionService.revokeSession(payload);
            res.status(200).json({ status: 'revoked' });
        }
        catch (error) {
            if (error instanceof SessionError) {
                res.status(error.status).json(createErrorResponse({
                    code: error.code,
                    message: error.expose ? error.message : undefined,
                    requestId,
                }));
                return;
            }
            next(error);
        }
    });
    return router;
};
