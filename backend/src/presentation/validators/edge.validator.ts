import { z } from 'zod';

const uuid = z.string().uuid();

const EDGE_TYPES = [
  'network', 'dependency', 'data_flow', 'hosts',
  'vpn', 'api_call', 'replication', 'unknown',
] as const;

export const updateEdgeSchema = z.object({
  label: z.string().max(200).optional(),
  type:  z.enum(EDGE_TYPES).optional(),
});

export const createEdgeSchema = z.object({
  id:             uuid.optional(),
  source_node_id: uuid,
  target_node_id: uuid,
  type:           z.enum(EDGE_TYPES).optional().default('network'),
  label:          z.string().max(200).optional(),
  properties:     z.record(z.unknown()).optional().default({}),
});
