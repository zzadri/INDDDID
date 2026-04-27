-- ============================================================
-- INDDID POC V1.1 — Proxmox config per project
-- Each project can define its own Proxmox environment.
-- Secrets (api_token, password) are stored encrypted at rest
-- (AES-256-GCM) — the backend handles encryption/decryption.
-- ============================================================

CREATE TABLE IF NOT EXISTS project_proxmox_configs (
    project_id         UUID         PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    endpoint           VARCHAR(500) NOT NULL,
    username           VARCHAR(200) NOT NULL,
    api_token_enc      TEXT,
    password_enc       TEXT,
    node               VARCHAR(100) NOT NULL DEFAULT 'pve',
    template_vm_id     INTEGER      NOT NULL DEFAULT 9000,
    storage            VARCHAR(100) NOT NULL DEFAULT 'local-lvm',
    gateway            VARCHAR(100) NOT NULL DEFAULT '192.168.1.1',
    lxc_template       VARCHAR(300) NOT NULL DEFAULT 'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst',
    created_at         TIMESTAMP    DEFAULT NOW(),
    updated_at         TIMESTAMP    DEFAULT NOW(),
    CONSTRAINT project_proxmox_has_credential
      CHECK (api_token_enc IS NOT NULL OR password_enc IS NOT NULL)
);

CREATE TRIGGER project_proxmox_configs_updated_at
    BEFORE UPDATE ON project_proxmox_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
