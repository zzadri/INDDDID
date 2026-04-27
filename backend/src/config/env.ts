/**
 * Centralised, typed environment configuration.
 * Import `env` everywhere instead of reading process.env directly.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePort(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid PORT value: ${value}`);
  }
  return parsed;
}

export const env = {
  NODE_ENV:    process.env.NODE_ENV ?? 'development',
  PORT:        parsePort(process.env.PORT ?? '3000'),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  JWT_SECRET:  requireEnv('JWT_SECRET'),
} as const;