import { Router, Request, Response, NextFunction, CookieOptions } from 'express';
import * as authService from '../../application/auth.service';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { authRateLimiter } from '../middleware/security';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { JwtPayload } from '../../domain/entities';

const router = Router();

const COOKIE_NAME = 'auth_token';
const COOKIE_SECURE = ['1', 'true', 'yes', 'on'].includes((process.env.COOKIE_SECURE ?? '').trim().toLowerCase());
const COOKIE_OPTS: CookieOptions = {
  httpOnly:  true,
  sameSite:  'strict',
  secure:    COOKIE_SECURE,
  path:      '/',
  maxAge:    7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

router.post('/register',
  authRateLimiter,
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(
        req.body.email, req.body.password, req.body.display_name,
      );
      res.cookie(COOKIE_NAME, result.token, COOKIE_OPTS);
      res.status(201).json({ user: result.user });
    } catch (err) { next(err); }
  },
);

router.post('/login',
  authRateLimiter,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body.email, req.body.password);
      res.cookie(COOKIE_NAME, result.token, COOKIE_OPTS);
      res.json({ user: result.user });
    } catch (err) { next(err); }
  },
);

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: '/', sameSite: 'strict', secure: COOKIE_SECURE });
  res.status(204).send();
});

router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = (req as Request & { user: JwtPayload }).user!;
    const profile = await authService.getUserById(userId);
    if (!profile) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(profile);
  } catch (err) { next(err); }
});

export default router;
