import { z } from 'zod';

const NODE_TYPES = [
  'server', 'application', 'database', 'network', 'workstation',
  'firewall', 'router', 'switch', 'cloud', 'user', 'service', 'api', 'unknown',
] as const;

// is_global intentionally excluded — users cannot create global templates via API.
// Global templates are managed directly in DB by administrators only.
export const createTemplateSchema = z.object({
  name:       z.string().min(1).max(100).trim(),
  type:       z.enum(NODE_TYPES),
  properties: z.record(z.unknown()).optional().default({}),
});
