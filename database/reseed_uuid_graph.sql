-- Re-seed a demo graph in UUID schema without deleting existing users/projects.
-- Safe to rerun: inserts graph only if the target project has no nodes.
--
-- Run with:
--   docker exec -i inddid-postgres psql -v ON_ERROR_STOP=1 -U inddid -d inddid < database/reseed_uuid_graph.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id    UUID;
  v_project_id UUID;
  v_fw_dmz     UUID;
  v_srv_web01  UUID;
  v_app_api    UUID;
  v_db_pg01    UUID;
BEGIN
  -- Ensure demo user exists
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'demo@inddid.local'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    INSERT INTO users (email, password_hash, display_name)
    VALUES ('demo@inddid.local', crypt('demo1234', gen_salt('bf', 10)), 'Demo User')
    RETURNING id INTO v_user_id;
  END IF;

  -- Reuse latest demo project if exists, else create one
  SELECT id INTO v_project_id
  FROM projects
  WHERE owner_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    INSERT INTO projects (name, description, version, owner_id)
    VALUES (
      'SI Corporate - Reseau principal',
      'Architecture principale du systeme d''information de l''entreprise',
      '1.0',
      v_user_id
    )
    RETURNING id INTO v_project_id;
  END IF;

  -- Seed graph only if project is still empty
  IF NOT EXISTS (SELECT 1 FROM nodes WHERE project_id = v_project_id) THEN
    INSERT INTO nodes (label, type, project_id, properties, position_x, position_y)
    VALUES (
      'Firewall DMZ',
      'firewall',
      v_project_id,
      '{"ip":"203.0.113.1","zone":"DMZ","vendor":"Fortinet","model":"FortiGate 100F"}',
      200,
      120
    )
    RETURNING id INTO v_fw_dmz;

    INSERT INTO nodes (label, type, project_id, properties, position_x, position_y)
    VALUES (
      'Web Server 01',
      'server',
      v_project_id,
      '{"ip":"10.0.1.10","os":"Ubuntu 22.04","role":"web","zone":"DMZ"}',
      420,
      120
    )
    RETURNING id INTO v_srv_web01;

    INSERT INTO nodes (label, type, project_id, properties, position_x, position_y)
    VALUES (
      'API REST',
      'api',
      v_project_id,
      '{"url":"https://api.corp.local","protocol":"HTTPS","auth_type":"JWT","version":"v2"}',
      640,
      120
    )
    RETURNING id INTO v_app_api;

    INSERT INTO nodes (label, type, project_id, properties, position_x, position_y)
    VALUES (
      'PostgreSQL Primary',
      'database',
      v_project_id,
      '{"engine":"PostgreSQL 16","role":"primary","port":5432,"zone":"DATA"}',
      860,
      120
    )
    RETURNING id INTO v_db_pg01;

    INSERT INTO edges (source_node_id, target_node_id, type, label, properties, project_id)
    VALUES
      (v_fw_dmz, v_srv_web01, 'network', 'HTTP :8080', '{"port":8080}', v_project_id),
      (v_srv_web01, v_app_api, 'api_call', 'REST API', '{"port":443}', v_project_id),
      (v_app_api, v_db_pg01, 'data_flow', 'SQL :5432', '{"port":5432}', v_project_id);
  END IF;

  -- Ensure a minimal template bank exists
  IF NOT EXISTS (
    SELECT 1 FROM node_templates
    WHERE is_global = true
      AND name = 'Serveur Web Ubuntu'
      AND type = 'server'
  ) THEN
    INSERT INTO node_templates (name, type, properties, is_global, created_by)
    VALUES ('Serveur Web Ubuntu', 'server', '{"os":"Ubuntu 22.04","role":"web"}', true, NULL);
  END IF;
END $$;

COMMIT;
