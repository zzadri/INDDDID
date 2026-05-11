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
  // VM cloud-init credentials
  vm_user?:        string;
  vm_password?:    string | null;
  vm_ssh_key?:     string | null;
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
  vm_user:           string;
  has_vm_password:   boolean;
  vm_ssh_key:        string | null;  // public key — not secret
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
  vm_user:           string;
  vm_password:       string | null;
  vm_ssh_key:        string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizeUsername(u: string): string {
  const trimmed = u.trim();
  if (!trimmed) throw new ValidationError('Proxmox username is required');
  return /@(pam|pve)$/i.test(trimmed) ? trimmed : `${trimmed}@pam`;
}

function toPublic(row: {
  project_id:      string;
  endpoint:        string;
  username:        string;
  api_token_enc:   string | null;
  password_enc:    string | null;
  node:            string;
  template_vm_id:  number;
  storage:         string;
  gateway:         string;
  lxc_template:    string;
  vm_user:         string;
  vm_password_enc: string | null;
  vm_ssh_key:      string | null;
  updated_at:      Date;
}): ProxmoxConfigPublic {
  return {
    project_id:      row.project_id,
    endpoint:        row.endpoint,
    username:        row.username,
    node:            row.node,
    template_vm_id:  row.template_vm_id,
    storage:         row.storage,
    gateway:         row.gateway,
    lxc_template:    row.lxc_template,
    has_api_token:   !!row.api_token_enc,
    has_password:    !!row.password_enc,
    vm_user:         row.vm_user,
    has_vm_password: !!row.vm_password_enc,
    vm_ssh_key:      row.vm_ssh_key,
    updated_at:      row.updated_at,
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
    vm_user:        row.vm_user,
    vm_password:    decrypt(row.vm_password_enc),
    vm_ssh_key:     row.vm_ssh_key,
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

  const vmPasswordEnc = input.vm_password !== undefined
    ? (input.vm_password ? encrypt(input.vm_password) : null)
    : existing?.vm_password_enc ?? null;

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
    vm_user:        input.vm_user?.trim()       || 'ubuntu',
    vm_password_enc: vmPasswordEnc,
    vm_ssh_key:     input.vm_ssh_key !== undefined
                      ? (input.vm_ssh_key?.trim() || null)
                      : existing?.vm_ssh_key ?? null,
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
