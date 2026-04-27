import { z } from 'zod';

export const registerSchema = z.object({
  email:        z.string().email('Invalid email format').max(254),
  password:     z.string().min(8, 'Password must be at least 8 characters').max(128),
  display_name: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email:    z.string().email().max(254),
  password: z.string().min(1, 'Password required').max(128),
});
