-- Migrate legacy integer/varchar identifiers to UUID while preserving data.
-- Scope: users, projects, project_permissions, nodes, edges, node_templates.
--
-- Run with:
--   docker exec -i inddid-postgres psql -v ON_ERROR_STOP=1 -U inddid -d inddid < database/migrate_legacy_ids_to_uuid.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Add UUID shadow columns
ALTER TABLE users ADD COLUMN id_uuid UUID;
ALTER TABLE projects ADD COLUMN id_uuid UUID;
ALTER TABLE projects ADD COLUMN owner_id_uuid UUID;
ALTER TABLE nodes ADD COLUMN id_uuid UUID;
ALTER TABLE nodes ADD COLUMN project_id_uuid UUID;
ALTER TABLE edges ADD COLUMN id_uuid UUID;
ALTER TABLE edges ADD COLUMN source_node_id_uuid UUID;
ALTER TABLE edges ADD COLUMN target_node_id_uuid UUID;
ALTER TABLE edges ADD COLUMN project_id_uuid UUID;
ALTER TABLE node_templates ADD COLUMN id_uuid UUID;
ALTER TABLE node_templates ADD COLUMN created_by_uuid UUID;
ALTER TABLE project_permissions ADD COLUMN project_id_uuid UUID;
ALTER TABLE project_permissions ADD COLUMN user_id_uuid UUID;

-- 2) Populate UUID IDs and references
UPDATE users
SET id_uuid = gen_random_uuid()
WHERE id_uuid IS NULL;

UPDATE projects
SET id_uuid = gen_random_uuid()
WHERE id_uuid IS NULL;

UPDATE projects p
SET owner_id_uuid = u.id_uuid
FROM users u
WHERE p.owner_id = u.id;

UPDATE nodes
SET id_uuid = gen_random_uuid()
WHERE id_uuid IS NULL;

UPDATE nodes n
SET project_id_uuid = p.id_uuid
FROM projects p
WHERE n.project_id = p.id;

UPDATE edges
SET id_uuid = gen_random_uuid()
WHERE id_uuid IS NULL;

UPDATE edges e
SET source_node_id_uuid = n.id_uuid
FROM nodes n
WHERE e.source_node_id = n.id;

UPDATE edges e
SET target_node_id_uuid = n.id_uuid
FROM nodes n
WHERE e.target_node_id = n.id;

UPDATE edges e
SET project_id_uuid = p.id_uuid
FROM projects p
WHERE e.project_id = p.id;

UPDATE node_templates
SET id_uuid = gen_random_uuid()
WHERE id_uuid IS NULL;

UPDATE node_templates t
SET created_by_uuid = u.id_uuid
FROM users u
WHERE t.created_by = u.id;

UPDATE project_permissions pp
SET project_id_uuid = p.id_uuid
FROM projects p
WHERE pp.project_id = p.id;

UPDATE project_permissions pp
SET user_id_uuid = u.id_uuid
FROM users u
WHERE pp.user_id = u.id;

-- 3) Safety checks before constraint switch
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM projects WHERE owner_id_uuid IS NULL) THEN
    RAISE EXCEPTION 'Unresolved FK: projects.owner_id';
  END IF;

  IF EXISTS (SELECT 1 FROM nodes WHERE project_id_uuid IS NULL) THEN
    RAISE EXCEPTION 'Unresolved FK: nodes.project_id';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM edges
    WHERE source_node_id_uuid IS NULL
       OR target_node_id_uuid IS NULL
       OR project_id_uuid IS NULL
  ) THEN
    RAISE EXCEPTION 'Unresolved FK(s): edges.*';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM project_permissions
    WHERE project_id_uuid IS NULL OR user_id_uuid IS NULL
  ) THEN
    RAISE EXCEPTION 'Unresolved FK(s): project_permissions.*';
  END IF;
END $$;

-- 4) Drop old constraints/indexes tied to legacy IDs
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_project_id_fkey;
ALTER TABLE edges DROP CONSTRAINT IF EXISTS edges_project_id_fkey;
ALTER TABLE edges DROP CONSTRAINT IF EXISTS edges_source_node_id_fkey;
ALTER TABLE edges DROP CONSTRAINT IF EXISTS edges_target_node_id_fkey;
ALTER TABLE node_templates DROP CONSTRAINT IF EXISTS node_templates_created_by_fkey;
ALTER TABLE project_permissions DROP CONSTRAINT IF EXISTS project_permissions_project_id_fkey;
ALTER TABLE project_permissions DROP CONSTRAINT IF EXISTS project_permissions_user_id_fkey;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_pkey;
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_pkey;
ALTER TABLE edges DROP CONSTRAINT IF EXISTS edges_pkey;
ALTER TABLE node_templates DROP CONSTRAINT IF EXISTS node_templates_pkey;
ALTER TABLE project_permissions DROP CONSTRAINT IF EXISTS project_permissions_pkey;

DROP INDEX IF EXISTS idx_projects_owner;
DROP INDEX IF EXISTS idx_nodes_project;
DROP INDEX IF EXISTS idx_edges_project;
DROP INDEX IF EXISTS idx_edges_source;
DROP INDEX IF EXISTS idx_edges_target;

-- 5) Swap UUID columns into canonical names
ALTER TABLE users RENAME COLUMN id TO id_legacy;
ALTER TABLE users RENAME COLUMN id_uuid TO id;

ALTER TABLE projects RENAME COLUMN id TO id_legacy;
ALTER TABLE projects RENAME COLUMN id_uuid TO id;
ALTER TABLE projects RENAME COLUMN owner_id TO owner_id_legacy;
ALTER TABLE projects RENAME COLUMN owner_id_uuid TO owner_id;

ALTER TABLE nodes RENAME COLUMN id TO id_legacy;
ALTER TABLE nodes RENAME COLUMN id_uuid TO id;
ALTER TABLE nodes RENAME COLUMN project_id TO project_id_legacy;
ALTER TABLE nodes RENAME COLUMN project_id_uuid TO project_id;

ALTER TABLE edges RENAME COLUMN id TO id_legacy;
ALTER TABLE edges RENAME COLUMN id_uuid TO id;
ALTER TABLE edges RENAME COLUMN source_node_id TO source_node_id_legacy;
ALTER TABLE edges RENAME COLUMN source_node_id_uuid TO source_node_id;
ALTER TABLE edges RENAME COLUMN target_node_id TO target_node_id_legacy;
ALTER TABLE edges RENAME COLUMN target_node_id_uuid TO target_node_id;
ALTER TABLE edges RENAME COLUMN project_id TO project_id_legacy;
ALTER TABLE edges RENAME COLUMN project_id_uuid TO project_id;

ALTER TABLE node_templates RENAME COLUMN id TO id_legacy;
ALTER TABLE node_templates RENAME COLUMN id_uuid TO id;
ALTER TABLE node_templates RENAME COLUMN created_by TO created_by_legacy;
ALTER TABLE node_templates RENAME COLUMN created_by_uuid TO created_by;

ALTER TABLE project_permissions RENAME COLUMN project_id TO project_id_legacy;
ALTER TABLE project_permissions RENAME COLUMN project_id_uuid TO project_id;
ALTER TABLE project_permissions RENAME COLUMN user_id TO user_id_legacy;
ALTER TABLE project_permissions RENAME COLUMN user_id_uuid TO user_id;

-- 6) Enforce UUID defaults and nullability
ALTER TABLE users
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE projects
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN owner_id SET NOT NULL;

ALTER TABLE nodes
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE edges
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN source_node_id SET NOT NULL,
  ALTER COLUMN target_node_id SET NOT NULL,
  ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE node_templates
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE project_permissions
  ALTER COLUMN project_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL;

-- 7) Recreate primary keys, foreign keys, and indexes
ALTER TABLE users
  ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE projects
  ADD CONSTRAINT projects_pkey PRIMARY KEY (id),
  ADD CONSTRAINT projects_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE nodes
  ADD CONSTRAINT nodes_pkey PRIMARY KEY (id),
  ADD CONSTRAINT nodes_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE edges
  ADD CONSTRAINT edges_pkey PRIMARY KEY (id),
  ADD CONSTRAINT edges_source_node_id_fkey
    FOREIGN KEY (source_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  ADD CONSTRAINT edges_target_node_id_fkey
    FOREIGN KEY (target_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  ADD CONSTRAINT edges_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE node_templates
  ADD CONSTRAINT node_templates_pkey PRIMARY KEY (id),
  ADD CONSTRAINT node_templates_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE project_permissions
  ADD CONSTRAINT project_permissions_pkey PRIMARY KEY (project_id, user_id),
  ADD CONSTRAINT project_permissions_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  ADD CONSTRAINT project_permissions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_nodes_project ON nodes(project_id);
CREATE INDEX idx_edges_project ON edges(project_id);
CREATE INDEX idx_edges_source ON edges(source_node_id);
CREATE INDEX idx_edges_target ON edges(target_node_id);

-- 8) Drop legacy columns now replaced by UUID columns
ALTER TABLE users DROP COLUMN id_legacy;

ALTER TABLE projects
  DROP COLUMN id_legacy,
  DROP COLUMN owner_id_legacy;

ALTER TABLE nodes
  DROP COLUMN id_legacy,
  DROP COLUMN project_id_legacy;

ALTER TABLE edges
  DROP COLUMN id_legacy,
  DROP COLUMN source_node_id_legacy,
  DROP COLUMN target_node_id_legacy,
  DROP COLUMN project_id_legacy;

ALTER TABLE node_templates
  DROP COLUMN id_legacy,
  DROP COLUMN created_by_legacy;

ALTER TABLE project_permissions
  DROP COLUMN project_id_legacy,
  DROP COLUMN user_id_legacy;

COMMIT;
