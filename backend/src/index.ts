import { waitForDb } from './config/database';
import { env } from './config/env';
import app from './app';

async function bootstrap(): Promise<void> {
  await waitForDb();
  app.listen(env.PORT, () => {
    console.log(`INDDID backend v2 on :${env.PORT} [${env.NODE_ENV}]`);
  });
}

bootstrap().catch(err => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
