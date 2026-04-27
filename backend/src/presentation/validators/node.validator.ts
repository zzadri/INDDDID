import { z } from 'zod';

const uuid = z.string().uuid();

const NODE_TYPES = [
  'server', 'application', 'database', 'network', 'workstation',
  'firewall', 'router', 'switch', 'cloud', 'user', 'service', 'api',
  'vm', 'container',
  'unknown',
] as const;

export const createNodeSchema = z.object({
  id:         uuid.optional(),
  label:      z.string().min(1).max(200).trim(),
  type:       z.enum(NODE_TYPES),
  properties: z.record(z.unknown()).optional().default({}),
  position_x: z.number().optional().default(0),
  position_y: z.number().optional().default(0),
});

export const updateNodeSchema = z.object({
  label:      z.string().min(1).max(200).trim().optional(),
  type:       z.enum(NODE_TYPES).optional(),
  properties: z.record(z.unknown()).optional(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
});
