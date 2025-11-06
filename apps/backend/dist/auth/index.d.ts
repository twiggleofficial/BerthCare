import { Router } from 'express';
import { type ActivationService } from './activation-service.js';
import { type SessionService } from './session-service.js';
type CreateAuthV1RouterOptions = {
    activationService?: ActivationService;
    sessionService?: SessionService;
};
export declare const createAuthRouter: () => Router;
export declare const createAuthV1Router: (options?: CreateAuthV1RouterOptions) => Router;
export {};
