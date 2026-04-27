import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Returns an Express middleware that validates `req[source]` against `schema`.
 * On success, replaces `req[source]` with the parsed (and coerced) value.
 * On failure, responds 400 with Zod field errors.
 */
export function validate(
  schema: ZodSchema,
  source: 'body' | 'params' | 'query' = 'body',
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      res.status(400).json({
        error:   'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    // Replace with coerced/defaulted values from Zod
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}
