import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { JwtPayload } from '../../domain/entities';
import { AuthError } from '../../domain/errors';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });

    if (
      typeof decoded !== 'object'
      || decoded === null
      || !('userId' in decoded)
      || !('email' in decoded)
      || typeof decoded.userId !== 'string'
      || typeof decoded.email !== 'string'
    ) {
      throw new AuthError('Invalid token payload');
    }

    return { userId: decoded.userId, email: decoded.email };
  } catch {
    throw new AuthError('Invalid or expired token');
  }
}
