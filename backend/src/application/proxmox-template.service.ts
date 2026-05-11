/**
 * Ensures the Proxmox template VM exists on the target node.
 *
 * Called before any terraform plan/apply. If the template VM (default 9000) is
 * missing, this service recreates it from scratch using the Proxmox REST API:
 *   1. Downloads the Ubuntu 22.04 cloud image as an ISO on the node
 *   2. Creates a VM with the cloud image imported as scsi0 disk + cloudinit
 *   3. Converts the VM to a template
 *
 * Uses the `import-from` parameter of the PVE 8.x VM create endpoint to inline
 * the importdisk step (no shell access required).
 */

import type { ProxmoxConfigResolved } from './proxmox-config.service';

const CLOUD_IMAGE_URL  = 'https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img';
const CLOUD_IMAGE_NAME = 'jammy-server-cloudimg-amd64.img';
const TEMPLATE_NAME    = 'ubuntu-2204-template';
const ISO_STORAGE      = 'local';

// ── HTTP client ─────────────────────────────────────────────────────────────

interface ApiOpts {
  method?:  'GET' | 'POST' | 'DELETE';
  body?:    Record<string, unknown>;
  expect?:  'json' | 'text';
}

async function pveApi(cfg: ProxmoxConfigResolved, path: string, opts: ApiOpts = {}): Promise<unknown> {
  const url = `${cfg.endpoint.replace(/\/+$/, '')}/api2/json${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };

  if (cfg.api_token) {
    headers.Authorization = `PVEAPIToken=${cfg.api_token}`;
  } else if (cfg.password) {
    // Ticket-based auth would require a separate login round-trip; the POC relies
    // on api_token auth for preflight. Password flow falls through to terraform only.
    throw new Error('Template preflight requires a Proxmox API token (password auth not supported)');
  } else {
    throw new Error('Proxmox config has no credential');
  }

  const body = opts.body
    ? new URLSearchParams(Object.entries(opts.body).map(([k, v]) => [k, String(v)] as [string, string])).toString()
    : undefined;

  const res = await fetch(url, { method: opts.method ?? 'GET', headers, body });

  if (opts.expect === 'text') return await res.text();
  const text = await res.text();
  if (!res.ok) throw new Error(`Proxmox API ${path} → ${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function waitTask(cfg: ProxmoxConfigResolved, upid: string, timeoutMs = 10 * 60 * 1000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await pveApi(cfg, `/nodes/${cfg.node}/tasks/${encodeURIComponent(upid)}/status`) as {
      data: { status: string; exitstatus?: string };
    };
    if (r.data.status === 'stopped') {
      if (r.data.exitstatus !== 'OK') throw new Error(`PVE task ${upid} failed: ${r.data.exitstatus}`);
      return;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`PVE task ${upid} timed out`);
}

// ── Template lifecycle ──────────────────────────────────────────────────────

async function templateExists(cfg: ProxmoxConfigResolved): Promise<boolean> {
  try {
    const r = await pveApi(cfg, `/nodes/${cfg.node}/qemu/${cfg.template_vm_id}/config`) as {
      data: { template?: number; scsi0?: string; name?: string };
    };
    if (!r.data?.template) return false;
    // Verify it's our cloud-image template, not a stale ISO-based VM.
    const isCloudTemplate =
      r.data.name === TEMPLATE_NAME ||
      String(r.data.scsi0 ?? '').includes(CLOUD_IMAGE_NAME.replace('.img', '')) ||
      String(r.data.scsi0 ?? '').includes('cloudimg');
    if (!isCloudTemplate) {
      console.warn(
        `[blueprint] Template VM ${cfg.template_vm_id} exists but does not look like a cloud-image template ` +
        `(name=${r.data.name}, scsi0=${r.data.scsi0}). ` +
        `Delete VM ${cfg.template_vm_id} in Proxmox and re-run Plan to force a clean cloud-image rebuild.`,
      );
    }
    return true;
  } catch (e) {
    const msg = (e as Error).message;
    if (/\b404\b/.test(msg) || /does not exist/i.test(msg)) return false;
    throw e;
  }
}

async function isoExists(cfg: ProxmoxConfigResolved): Promise<boolean> {
  const r = await pveApi(cfg, `/nodes/${cfg.node}/storage/${ISO_STORAGE}/content?content=iso`) as {
    data: Array<{ volid: string }>;
  };
  return (r.data ?? []).some(v => v.volid.endsWith(`/${CLOUD_IMAGE_NAME}`));
}

async function downloadCloudImage(cfg: ProxmoxConfigResolved): Promise<void> {
  if (await isoExists(cfg)) return;
  const r = await pveApi(cfg, `/nodes/${cfg.node}/storage/${ISO_STORAGE}/download-url`, {
    method: 'POST',
    body: {
      url:     CLOUD_IMAGE_URL,
      content: 'iso',
      filename: CLOUD_IMAGE_NAME,
    },
  }) as { data: string };
  await waitTask(cfg, r.data, 15 * 60 * 1000);
}

async function createTemplateVm(cfg: ProxmoxConfigResolved): Promise<void> {
  const r = await pveApi(cfg, `/nodes/${cfg.node}/qemu`, {
    method: 'POST',
    body: {
      vmid:      cfg.template_vm_id,
      name:      TEMPLATE_NAME,
      memory:    2048,
      cores:     2,
      sockets:   1,
      cpu:       'x86-64-v2-AES',
      net0:      'virtio,bridge=vmbr0',
      scsihw:    'virtio-scsi-single',
      serial0:   'socket',
      vga:       'serial0',
      agent:     'enabled=1',
      scsi0:     `${cfg.storage}:0,import-from=${ISO_STORAGE}:iso/${CLOUD_IMAGE_NAME},iothread=1,discard=on`,
      ide2:      `${cfg.storage}:cloudinit`,
      boot:      'order=scsi0',
    },
  }) as { data: string };
  await waitTask(cfg, r.data, 15 * 60 * 1000);
}

async function convertToTemplate(cfg: ProxmoxConfigResolved): Promise<void> {
  await pveApi(cfg, `/nodes/${cfg.node}/qemu/${cfg.template_vm_id}/template`, { method: 'POST' });
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function ensureTemplate(cfg: ProxmoxConfigResolved): Promise<{ created: boolean; message: string }> {
  if (!cfg.api_token) {
    // Password auth not implemented for preflight; let terraform fail with its
    // own error message so the user can diagnose.
    return { created: false, message: 'Template preflight skipped (password auth, token required)' };
  }

  if (await templateExists(cfg)) {
    return {
      created: false,
      message: `Template VM ${cfg.template_vm_id} already present (Ubuntu 22.04 cloud-image). ` +
               `If the VM boots to a blank console, delete VM ${cfg.template_vm_id} in Proxmox ` +
               `and re-run Plan — Blueprint will recreate a clean cloud-image template automatically.`,
    };
  }

  await downloadCloudImage(cfg);
  await createTemplateVm(cfg);
  await convertToTemplate(cfg);

  return { created: true, message: `Template VM ${cfg.template_vm_id} recreated from ${CLOUD_IMAGE_URL}` };
}
