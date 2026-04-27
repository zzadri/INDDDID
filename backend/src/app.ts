import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { helmetMiddleware, globalRateLimiter } from './presentation/middleware/security';
import { errorHandler } from './presentation/middleware/error-handler';
import { env } from './config/env';

import authRouter      from './presentation/routes/auth.routes';
import projectsRouter  from './presentation/routes/project.routes';
import nodesRouter     from './presentation/routes/node.routes';
import edgesRouter     from './presentation/routes/edge.routes';
import templatesRouter from './presentation/routes/template.routes';
import iconsRouter     from './presentation/routes/icons.routes';

const app = express();

// Trust nginx reverse proxy — required for correct IP in rate-limit and logs
app.set('trust proxy', 1);

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmetMiddleware);
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(globalRateLimiter);

// ── Body / cookie parsing ────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',                          authRouter);
app.use('/api/projects',                      projectsRouter);
app.use('/api/projects/:projectId/nodes',     nodesRouter);
app.use('/api/projects/:projectId/edges',     edgesRouter);
app.use('/api/templates',                     templatesRouter);
app.use('/api/icons',                         iconsRouter);

// ── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

export default app;
