/**
 * Terraform + Proxmox deployment service.
 *
 * Maps deployable SI node types (server, application, database, workstation,
 * vm → VM; container → LXC) to bpg/proxmox resources. All Proxmox
 * connection parameters are sourced from a per-project configuration
 * (ProxmoxConfigResolved) provided by the caller — there is no longer a
 * global .env fallback for credentials.
 *
 * Destroy strategy: VMs are STOPPED (not gracefully shutdown) since the
 * resource is about to be deleted anyway. This is faster and avoids
 * shutdown timeouts on unresponsive guests.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Node } from '../domain/entities';
import type { ProxmoxConfigResolved } from './proxmox-config.service';
import { ensureTemplate } from './proxmox-template.service';

const execAsync = promisify(exec);

const TF_WORKDIR = path.join(process.env.DEPLOYMENTS_DIR ?? '/tmp/blueprint-deployments', 'terraform');

// Long-running terraform ops (clone + cloud-init boot can take >5 min).
const TF_EXEC_OPTS = { maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000 } as const;

// ── Node types that map to Proxmox resources ─────────────────────────────────
const VM_TYPES         = new Set(['server', 'application', 'database', 'workstation', 'vm']);
const CONTAINER_TYPES  = new Set(['container']);
const DEPLOYABLE_TYPES = new Set([...VM_TYPES, ...CONTAINER_TYPES]);

export interface TerraformPreview {
  hcl:              string;
  deployable_count: number;
  skipped_types:    string[];
}

export interface TerraformResult {
  success: boolean;
  output:  string;
  error?:  string;
}

// ── HCL generation helpers ──────────────────────────────────────────────────

function sanitizeResourceName(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^[^a-zA-Z_]/, '_$&');
}

/** Proxmox VM/LXC name must be a valid DNS label: lowercase [a-z0-9-], start/end alphanumeric, max 63 chars. */
function slugifyDnsName(label: string, fallbackId: string): string {
  let s = label.toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 63)
    .replace(/^-+|-+$/g, '');
  if (!s || !/^[a-z0-9]/.test(s)) {
    s = `vm-${fallbackId.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8) || 'node'}`;
  }
  return s;
}

function parseCpuCores(val: unknown): number {
  if (typeof val === 'number') return Math.max(1, val);
  const s = String(val ?? '');
  const m = s.match(/(\d+)/);
  return m ? Math.max(1, parseInt(m[1], 10)) : 2;
}

function parseRamMB(val: unknown): number {
  if (val === undefined || val === null || val === '') return 2048;
  if (typeof val === 'number') return val < 64 ? val * 1024 : val;

  const s = String(val).trim();
  const gb = s.match(/^(\d+(?:\.\d+)?)\s*(?:GB|G|Go|Gio)\b/i);
  if (gb) return Math.round(parseFloat(gb[1]) * 1024);
  const mb = s.match(/^(\d+(?:\.\d+)?)\s*(?:MB|M|Mo|Mio)\b/i);
  if (mb) return Math.round(parseFloat(mb[1]));
  const bare = s.match(/^(\d+(?:\.\d+)?)$/);
  if (bare) {
    const n = parseFloat(bare[1]);
    return n < 64 ? Math.round(n * 1024) : Math.round(n);
  }
  return 2048;
}

// ── HCL block generators ────────────────────────────────────────────────────

function generateProviderBlock(cfg: ProxmoxConfigResolved): string {
  const authBlock = cfg.api_token
    ? `  api_token = var.proxmox_api_token`
    : `  username  = var.proxmox_username\n  password  = var.proxmox_password`;

  return `terraform {
  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = "~> 0.66"
    }
  }
}

provider "proxmox" {
  endpoint = var.proxmox_endpoint
${authBlock}
  insecure  = true  # self-signed cert on local Proxmox
}`;
}

function generateVariables(cfg: ProxmoxConfigResolved): string {
  const authVars = cfg.api_token
    ? `variable "proxmox_api_token" {
  type      = string
  sensitive = true
}`
    : `variable "proxmox_username" {
  type    = string
  default = "${cfg.username}"
}

variable "proxmox_password" {
  type      = string
  sensitive = true
}`;

  return `variable "proxmox_endpoint" {
  type = string
}

${authVars}

variable "proxmox_node" {
  type    = string
  default = "${cfg.node}"
}

variable "template_vm_id" {
  type    = number
  default = ${cfg.template_vm_id}
}

variable "storage" {
  type    = string
  default = "${cfg.storage}"
}

variable "gateway_ip" {
  type    = string
  default = "${cfg.gateway}"
}

variable "lxc_template" {
  type    = string
  default = "${cfg.lxc_template}"
}

variable "ssh_public_key" {
  type    = string
  default = ""
}`;
}

function generateVmResource(node: Node): string {
  const props  = node.properties as Record<string, unknown>;
  const name   = sanitizeResourceName(node.id);
  const cores  = parseCpuCores(props.cpu ?? props.cores ?? 2);
  const ramMB  = Math.max(64, parseRamMB(props.ram ?? props.memory ?? 2048));
  const ip     = typeof props.ip === 'string' ? props.ip : null;
  const ipConfig = ip
    ? `      ipv4 {
        address = "${ip}/24"
        gateway = var.gateway_ip
      }`
    : `      ipv4 { address = "dhcp" }`;

  const dnsName = slugifyDnsName(node.label, node.id);

  return `resource "proxmox_virtual_environment_vm" "${name}" {
  name        = "${dnsName}"
  description = "Blueprint – ${node.type} – ${node.label.replace(/"/g, '\\"')}"
  node_name   = var.proxmox_node
  tags        = ["blueprint", "${node.type}"]
  on_boot     = true

  # Destroy = stop (brutal). Resource is deleted right after, no need for graceful shutdown.
  stop_on_destroy = true

  # qemu-guest-agent not installed in default cloud-image template.
  # Enable only once you have installed it inside the template (apt install qemu-guest-agent).
  agent {
    enabled = false
  }

  timeout_clone        = 1800
  timeout_create       = 1800
  timeout_start_vm     = 600
  timeout_stop_vm      = 120
  timeout_shutdown_vm  = 120

  clone {
    vm_id = var.template_vm_id
    full  = true
  }

  cpu {
    cores   = ${cores}
    sockets = 1
    type    = "x86-64-v2-AES"
  }

  memory {
    dedicated = ${ramMB}
  }

  scsi_hardware = "virtio-scsi-single"
  boot_order    = ["scsi0"]

  disk {
    datastore_id = var.storage
    interface    = "scsi0"
    size         = 20
    iothread     = true
    discard      = "on"
  }

  network_device {
    bridge = "vmbr0"
    model  = "virtio"
  }

  initialization {
    datastore_id = var.storage
    interface    = "ide2"

    ip_config {
${ipConfig}
    }
    user_account {
      username = "ubuntu"
      keys     = var.ssh_public_key != "" ? [var.ssh_public_key] : []
    }
  }

  lifecycle {
    ignore_changes = [
      initialization[0].user_account,
      network_device,
    ]
  }
}`;
}

function generateLxcResource(node: Node, cfg: ProxmoxConfigResolved): string {
  const props = node.properties as Record<string, unknown>;
  const name  = sanitizeResourceName(node.id);
  const cores = parseCpuCores(props.cpu ?? props.cores ?? 1);
  const ramMB = Math.max(64, parseRamMB(props.ram ?? props.memory ?? 512));
  const ip    = typeof props.ip === 'string' ? props.ip : null;
  const image = typeof props.image === 'string' ? props.image : null;
  const lxcTemplate = image ? `local:vztmpl/${image}` : cfg.lxc_template;
  const ipConfig = ip
    ? `      ipv4 {
        address = "${ip}/24"
        gateway = var.gateway_ip
      }`
    : `      ipv4 {
        address = "dhcp"
      }`;

  const dnsName = slugifyDnsName(node.label, node.id);

  return `resource "proxmox_virtual_environment_container" "${name}" {
  description = "Blueprint – container – ${node.label.replace(/"/g, '\\"')}"
  node_name   = var.proxmox_node
  tags        = ["blueprint", "container"]

  # Destroy = stop (brutal) — container is deleted right after.
  start_on_boot = true
  unprivileged  = true

  initialization {
    hostname = "${dnsName}"

    ip_config {
${ipConfig}
    }
  }

  network_interface {
    name   = "eth0"
    bridge = "vmbr0"
  }

  operating_system {
    template_file_id = "${lxcTemplate}"
    type             = "ubuntu"
  }

  cpu   { cores = ${cores} }
  memory { dedicated = ${ramMB} }

  disk {
    datastore_id = var.storage
    size         = 8
  }
}`;
}

function generateHCL(
  projectId:   string,
  projectName: string,
  nodes:       Node[],
  cfg:         ProxmoxConfigResolved,
): string {
  const deployable = nodes.filter(n => DEPLOYABLE_TYPES.has(n.type));
  const resources  = deployable.map(n =>
    CONTAINER_TYPES.has(n.type) ? generateLxcResource(n, cfg) : generateVmResource(n),
  ).join('\n\n');

  return `# ============================================================
# Blueprint — Proxmox Terraform deployment
# Project : ${projectName}
# ID      : ${projectId}
# Generated: ${new Date().toISOString()}
# Provider: bpg/proxmox ~> 0.66
# ============================================================

${generateProviderBlock(cfg)}

# ── Variables ────────────────────────────────────────────────────────────────
${generateVariables(cfg)}

# ── VM / LXC resources (${deployable.length} node(s)) ────────────────────────────────
${resources}
`;
}

// ── Workdir helpers ─────────────────────────────────────────────────────────

async function getWorkdir(projectId: string): Promise<string> {
  const dir = path.join(TF_WORKDIR, projectId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function writeTfvars(workdir: string, cfg: ProxmoxConfigResolved): Promise<void> {
  const lines: string[] = [`proxmox_endpoint = "${cfg.endpoint}"`];
  if (cfg.api_token) {
    lines.push(`proxmox_api_token = "${cfg.api_token}"`);
  } else {
    lines.push(`proxmox_username = "${cfg.username}"`);
    lines.push(`proxmox_password = "${cfg.password ?? ''}"`);
  }
  await fs.writeFile(path.join(workdir, 'terraform.tfvars'), lines.join('\n') + '\n', 'utf-8');
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function previewTerraform(
  projectId:   string,
  projectName: string,
  nodes:       Node[],
  cfg:         ProxmoxConfigResolved,
): Promise<TerraformPreview> {
  const deployable = nodes.filter(n => DEPLOYABLE_TYPES.has(n.type));
  const skippedSet = new Set(nodes.filter(n => !DEPLOYABLE_TYPES.has(n.type)).map(n => n.type));
  return {
    hcl:              generateHCL(projectId, projectName, nodes, cfg),
    deployable_count: deployable.length,
    skipped_types:    [...skippedSet],
  };
}

export async function planTerraform(
  projectId:   string,
  projectName: string,
  nodes:       Node[],
  cfg:         ProxmoxConfigResolved,
): Promise<TerraformResult> {
  const workdir = await getWorkdir(projectId);
  await fs.writeFile(path.join(workdir, 'main.tf'), generateHCL(projectId, projectName, nodes, cfg), 'utf-8');
  await writeTfvars(workdir, cfg);

  try {
    const tpl = await ensureTemplate(cfg);
    const { stdout: initOut } = await execAsync('terraform init -input=false -no-color', { cwd: workdir, ...TF_EXEC_OPTS });
    const { stdout: planOut } = await execAsync('terraform plan -input=false -no-color', { cwd: workdir, ...TF_EXEC_OPTS });
    return { success: true, output: `[preflight] ${tpl.message}\n\n${initOut}\n${planOut}` };
  } catch (e: unknown) {
    const ex = e as { stdout?: string; stderr?: string; message?: string };
    return { success: false, output: ex.stdout ?? '', error: ex.stderr ?? ex.message ?? 'Unknown error' };
  }
}

export async function applyTerraform(
  projectId:   string,
  projectName: string,
  nodes:       Node[],
  cfg:         ProxmoxConfigResolved,
): Promise<TerraformResult> {
  const workdir = await getWorkdir(projectId);
  await fs.writeFile(path.join(workdir, 'main.tf'), generateHCL(projectId, projectName, nodes, cfg), 'utf-8');
  await writeTfvars(workdir, cfg);

  try {
    const tpl = await ensureTemplate(cfg);
    await execAsync('terraform init -input=false -no-color', { cwd: workdir, ...TF_EXEC_OPTS });
    const { stdout } = await execAsync('terraform apply -auto-approve -input=false -no-color', { cwd: workdir, ...TF_EXEC_OPTS });
    return { success: true, output: `[preflight] ${tpl.message}\n\n${stdout}` };
  } catch (e: unknown) {
    const ex = e as { stdout?: string; stderr?: string; message?: string };
    return { success: false, output: ex.stdout ?? '', error: ex.stderr ?? ex.message ?? 'Unknown error' };
  }
}

export async function destroyTerraform(
  projectId: string,
  cfg:       ProxmoxConfigResolved,
): Promise<TerraformResult> {
  const workdir = await getWorkdir(projectId);

  try { await fs.access(path.join(workdir, 'main.tf')); }
  catch { return { success: false, output: '', error: 'No Terraform state for this project' }; }

  // Refresh tfvars with current credentials (in case the config changed since apply).
  await writeTfvars(workdir, cfg);

  try {
    const { stdout } = await execAsync('terraform destroy -auto-approve -input=false -no-color', { cwd: workdir, ...TF_EXEC_OPTS });
    return { success: true, output: stdout };
  } catch (e: unknown) {
    const ex = e as { stdout?: string; stderr?: string; message?: string };
    return { success: false, output: ex.stdout ?? '', error: ex.stderr ?? ex.message ?? 'Unknown error' };
  }
}
