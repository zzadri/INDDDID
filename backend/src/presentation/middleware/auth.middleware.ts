import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../infrastructure/security/jwt';
import { JwtPayload } from '../../domain/entities';
import { AuthError } from '../../domain/errors';

/** Injects `req.user` from HttpOnly cookie `auth_token`. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token: string | undefined = (req as Request & { cookies: Record<string, string> }).cookies?.auth_token;
  if (!token) {
    next(new AuthError('Not authenticated'));
    return;
  }
  try {
    const payload = verifyToken(token);
    (req as Request & { user: JwtPayload }).user = payload;
    next();
  } catch (err) {
    next(err);
  }
}
