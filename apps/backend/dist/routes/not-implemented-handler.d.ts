import type { Request, Response } from 'express';
import type { Logger as WinstonLogger } from 'winston';
import { type KnownErrorCode } from '../errors/error-codes.js';
type NotImplementedHandlerOptions = {
    logger: WinstonLogger;
    message: string;
    code?: KnownErrorCode;
};
export declare const createNotImplementedHandler: ({ logger, message, code }: NotImplementedHandlerOptions) => (_req: Request, res: Response) => void;
export {};
