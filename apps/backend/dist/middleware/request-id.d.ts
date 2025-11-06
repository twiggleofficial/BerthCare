import type { NextFunction, Request, Response } from 'express';
export declare const requestId: (req: Request, res: Response, next: NextFunction) => void;
