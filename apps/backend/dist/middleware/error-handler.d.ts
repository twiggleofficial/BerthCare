import type { NextFunction, Request, Response } from 'express';
interface HttpError extends Error {
    status?: number;
    expose?: boolean;
    details?: unknown;
    code?: string;
}
export declare const errorHandler: (error: HttpError, req: Request, res: Response, next: NextFunction) => void;
export {};
