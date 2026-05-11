import { z } from 'zod';

export const upsertProxmoxConfigSchema = z.object({
  endpoint:       z.string().url('Must be a valid URL').max(500),
  username:       z.string().min(1, 'Username required').max(200).trim(),
  api_token:      z.string().max(500).nullable().optional(),
  password:       z.string().max(500).nullable().optional(),
  node:           z.string().max(100).trim().optional(),
  template_vm_id: z.number().int().positive().optional(),
  storage:        z.string().max(100).trim().optional(),
  gateway:        z.string().max(100).trim().optional(),
  lxc_template:   z.string().max(300).trim().optional(),
  // VM cloud-init credentials
  vm_user:        z.string().max(100).trim().optional(),
  vm_password:    z.string().max(500).nullable().optional(),
  vm_ssh_key:     z.string().max(4096).nullable().optional(),
});
// Note: the service layer enforces "at least one credential" taking into
// account existing encrypted values (user may PATCH without resending token).
