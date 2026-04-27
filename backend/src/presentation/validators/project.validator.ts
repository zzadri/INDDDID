import { z } from 'zod';

export const createProjectSchema = z.object({
  name:        z.string().min(1, 'Name required').max(200).trim(),
  description: z.string().max(1000).optional(),
  version:     z.string().max(50).optional(),
  color:       z.string().max(20).regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  tags:        z.string().max(500).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();
