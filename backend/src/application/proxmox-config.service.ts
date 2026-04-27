/**
 * Proxmox configuration per project.
 *
 * Secrets (api_token, password) are encrypted with AES-256-GCM before being
 * persisted. The plaintext form never hits the database.
 */

import prisma from '../config/database';
import { encrypt, decrypt } from '../infrastructure/security/crypto';
import { NotFoundError, ValidationError } from '../domain/errors';

// ── Public types ────────────────────────────────────────────────────────────

export interface ProxmoxConfigInput {
  endpoint:        string;
  username:        string;
  api_token?:      string | null;
  password?:       string | null;
  node?:           string;
  template_vm_id?: number;
  storage?:        string;
  gateway?:        string;
  lxc_template?:   string;
}

/** Safe DTO for the frontend — secrets are never returned in clear. */
export interface ProxmoxConfigPublic {
  project_id:        string;
  endpoint:          string;
  username:          string;
  node:              string;
  template_vm_id:    number;
  storage:           string;
  gateway:           string;
  lxc_template:      string;
  has_api_token:     boolean;
  has_password:      boolean;
  updated_at:        Date;
}

/** Decrypted runtime form, used by terraform service. */
export interface ProxmoxConfigResolved {
  endpoint:          string;
  username:          string;
  api_token:         string | null;
  password:          string | null;
  node:              string;
  template_vm_id:    number;
  storage:           string;
  gateway:           string;
  lxc_template:      string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizeUsername(u: string): string {
  const trimmed = u.trim();
  if (!trimmed) throw new ValidationError('Proxmox username is required');
  return /@(pam|pve)$/i.test(trimmed) ? trimmed : `${trimmed}@pam`;
}

function toPublic(row: {
  project_id:     string;
  endpoint:       string;
  username:       string;
  api_token_enc:  string | null;
  password_enc:   string | null;
  node:           string;
  template_vm_id: number;
  storage:        string;
  gateway:        string;
  lxc_template:   string;
  updated_at:     Date;
}): ProxmoxConfigPublic {
  return {
    project_id:     row.project_id,
    endpoint:       row.endpoint,
    username:       row.username,
    node:           row.node,
    template_vm_id: row.template_vm_id,
    storage:        row.storage,
    gateway:        row.gateway,
    lxc_template:   row.lxc_template,
    has_api_token:  !!row.api_token_enc,
    has_password:   !!row.password_enc,
    updated_at:     row.updated_at,
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function getPublicConfig(projectId: string): Promise<ProxmoxConfigPublic | null> {
  const row = await prisma.projectProxmoxConfig.findUnique({ where: { project_id: projectId } });
  return row ? toPublic(row) : null;
}

export async function getResolvedConfig(projectId: string): Promise<ProxmoxConfigResolved> {
  const row = await prisma.projectProxmoxConfig.findUnique({ where: { project_id: projectId } });
  if (!row) {
    throw new NotFoundError('Proxmox configuration');
  }
  return {
    endpoint:       row.endpoint,
    username:       row.username,
    api_token:      decrypt(row.api_token_enc),
    password:       decrypt(row.password_enc),
    node:           row.node,
    template_vm_id: row.template_vm_id,
    storage:        row.storage,
    gateway:        row.gateway,
    lxc_template:   row.lxc_template,
  };
}

export async function upsertConfig(
  projectId: string,
  input:     ProxmoxConfigInput,
): Promise<ProxmoxConfigPublic> {
  const endpoint = input.endpoint?.trim();
  if (!endpoint) throw new ValidationError('Proxmox endpoint is required');

  const username = normalizeUsername(input.username ?? '');

  // At least one credential must be provided on creation; on update, existing
  // encrypted values are preserved when the caller sends null/undefined.
  const existing = await prisma.projectProxmoxConfig.findUnique({ where: { project_id: projectId } });

  const apiTokenEnc = input.api_token !== undefined
    ? (input.api_token ? encrypt(input.api_token) : null)
    : existing?.api_token_enc ?? null;

  const passwordEnc = input.password !== undefined
    ? (input.password ? encrypt(input.password) : null)
    : existing?.password_enc ?? null;

  if (!apiTokenEnc && !passwordEnc) {
    throw new ValidationError('A Proxmox API token or password is required');
  }

  const data = {
    endpoint,
    username,
    api_token_enc:  apiTokenEnc,
    password_enc:   passwordEnc,
    node:           input.node?.trim()          || 'pve',
    template_vm_id: input.template_vm_id        ?? 9000,
    storage:        input.storage?.trim()       || 'local-lvm',
    gateway:        input.gateway?.trim()       || '192.168.1.1',
    lxc_template:   input.lxc_template?.trim()  || 'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst',
  };

  const row = await prisma.projectProxmoxConfig.upsert({
    where:  { project_id: projectId },
    create: { project_id: projectId, ...data },
    update: data,
  });

  return toPublic(row);
}

export async function deleteConfig(projectId: string): Promise<boolean> {
  try {
    await prisma.projectProxmoxConfig.delete({ where: { project_id: projectId } });
    return true;
  } catch {
    return false;
  }
}
