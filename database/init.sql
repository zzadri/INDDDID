-- ============================================================
-- INDDID POC V1 — Schéma PostgreSQL v3 (UUID PKs)
-- Cartographie dynamique du Système d'Information
-- ============================================================

-- UUID generation (native depuis PostgreSQL 13)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(100),
    created_at    TIMESTAMP DEFAULT NOW()
);

-- Projets (chaque schéma SI appartient à un user)
CREATE TABLE IF NOT EXISTS projects (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    version     VARCHAR(20)  DEFAULT '1.0',
    color       VARCHAR(20)  DEFAULT '#58a6ff',
    tags        TEXT         DEFAULT '',
    owner_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Permissions sur les projets partagés
CREATE TABLE IF NOT EXISTS project_permissions (
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    PRIMARY KEY (project_id, user_id)
);

-- Noeuds (composants SI)
CREATE TABLE IF NOT EXISTS nodes (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    label       VARCHAR(200) NOT NULL,
    type        VARCHAR(50)  NOT NULL CHECK (type IN (
                    'server', 'application', 'database', 'network',
                    'workstation', 'firewall', 'router', 'switch',
                    'cloud', 'user', 'service', 'api',
                    'vm', 'container',
                    'unknown'
                )),
    project_id  UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    properties  JSONB   DEFAULT '{}',
    position_x  FLOAT   DEFAULT 0,
    position_y  FLOAT   DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Liens entre noeuds
CREATE TABLE IF NOT EXISTS edges (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    source_node_id UUID         NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_node_id UUID         NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    type           VARCHAR(50)  NOT NULL DEFAULT 'network' CHECK (type IN (
                       'network', 'dependency', 'data_flow',
                       'hosts', 'vpn', 'api_call', 'replication', 'unknown'
                   )),
    label          VARCHAR(200),
    properties     JSONB DEFAULT '{}',
    project_id     UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at     TIMESTAMP DEFAULT NOW()
);

-- Configuration Proxmox par projet (secrets chiffrés AES-256-GCM côté backend)
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

-- Templates de noeuds (banque de composants réutilisables)
CREATE TABLE IF NOT EXISTS node_templates (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    type        VARCHAR(50)  NOT NULL,
    properties  JSONB   DEFAULT '{}',
    is_global   BOOLEAN DEFAULT false,
    created_by  UUID    REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_nodes_project    ON nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type       ON nodes(type);
CREATE INDEX IF NOT EXISTS idx_edges_project    ON edges(project_id);
CREATE INDEX IF NOT EXISTS idx_edges_source     ON edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_target     ON edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner   ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_templates_global ON node_templates(is_global);

-- Triggers updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nodes_updated_at
    BEFORE UPDATE ON nodes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER project_proxmox_configs_updated_at
    BEFORE UPDATE ON project_proxmox_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
