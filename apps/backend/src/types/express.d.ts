import type { AuthenticatedRequestUser } from '../auth/middleware';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedRequestUser;
    }
  }
}

export {};
