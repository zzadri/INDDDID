import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../domain/errors';

/** Centralised Express error handler — must be registered last. */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  // Unknown errors — log and hide detail from client
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal server error' });
}
