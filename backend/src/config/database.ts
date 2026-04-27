import { PrismaClient } from '@prisma/client';

function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const name = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!host || !port || !name || !user || !password) {
    throw new Error('Database configuration is missing: set DATABASE_URL or DB_* variables');
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${name}?schema=public`;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: buildDatabaseUrl(),
    },
  },
});

export async function waitForDb(retries = 10, delayMs = 2000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connected');
      return;
    } catch {
      console.log(`DB not ready, retry ${i + 1}/${retries}...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error('Cannot connect to database after retries');
}

export default prisma;
