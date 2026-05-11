-- ============================================================
-- Blueprint — Seed data v3 (UUID PKs)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id    UUID;
  v_project_id UUID;
  -- node IDs
  v_fw_dmz     UUID;
  v_lb_web     UUID;
  v_srv_web01  UUID;
  v_srv_web02  UUID;
  v_srv_app01  UUID;
  v_app_api    UUID;
  v_db_pg01    UUID;
  v_db_pg02    UUID;
  v_sw_core    UUID;
  v_srv_cdn    UUID;
BEGIN

  -- ── Utilisateur démo (password: demo1234) ──────────────────────────────
  INSERT INTO users (email, password_hash, display_name) VALUES
    ('demo@blueprint.local', crypt('demo1234', gen_salt('bf', 10)), 'Demo User')
  RETURNING id INTO v_user_id;

  -- ── Projet démo ────────────────────────────────────────────────────────
  INSERT INTO projects (name, description, version, owner_id) VALUES
    ('SI Corporate – Réseau principal',
     'Architecture principale du système d''information de l''entreprise',
     '1.0', v_user_id)
  RETURNING id INTO v_project_id;

  -- ── Noeuds ─────────────────────────────────────────────────────────────
  INSERT INTO nodes (label, type, project_id, properties, position_x, position_y) VALUES
    ('Firewall DMZ', 'firewall', v_project_id,
     '{"ip":"203.0.113.1","zone":"DMZ","vendor":"Fortinet","model":"FortiGate 100F"}',
     400, 60)
  RETURNING id INTO v_fw_dmz;

  INSERT INTO nodes (label, type, project_id, properties, position_x, position_y) VALUES
    ('Load Balancer Web', 'network', v_project_id,
     '{"ip":"10.0.1.1","zone":"DMZ","vendor":"HAProxy","version":"2.8"}',
     400, 160)
  RETURNING id INTO v_lb_web;

  INSERT INTO nodes (label, type, project_id, properties, position_x, position_y) VALUES
    ('Web Server 01', 'server', v_project_id,
     '{"ip":"10.0.1.10","os":"Ubuntu 22.04","role":"web","zone":"DMZ","cpu":"4 vCPU","ram":"8 GB"}',
     240, 270)
  RETURNING id INTO v_srv_web01;

  INSERT INTO nodes (label, type, project_id, properties, position_x, position_y) VALUES
    ('Web Server 02', 'server', v_project_id,
     '{"ip":"10.0.1.11","os":"Ubuntu 22.04","role":"web","zone":"DMZ","cpu":"4 vCPU","ram":"8 GB"}',
     560, 270)
  RETURNING id INTO v_srv_web02;

  INSERT INTO nodes (label, type, project_id, properties, position_x, position_y) VALUES
    ('App Server 01', 'server', v_project_id,
     '{"ip":"10.0.2.10","os":"Debian 12","role":"application","zone":"APP","cpu":"8 vCPU","ram":"16 GB"}',
     290, 390)
  RETURNING id INTO v_srv_app01;

  INSERT INTO nodes (label, type, project_id, properties, position_x, position_y) VALUES
    ('API REST', 'api', v_project_id,
     '{"url":"https://api.corp.local","protocol":"HTTPS","auth_type":"JWT","version":"v2","port":443,"zone":"APP"}',
     510, 390)
  RETURNING id INTO v_app_api;

  INSERT INTO nodes (label, type, project_id, properties, position_x, position_y) VALUES
    ('PostgreSQL Primary', 'database', v_project_id,
     '{"ip":"10.0.3.10","engine":"PostgreSQL 16","zone":"DATA","role":"primary","port":5432,"backup_enabled":true}',
     290, 510)
  RETURNING id INTO v_db_pg01;

  INSERT INTO nodes (label, type, project_id, properties, position_x, position_y) VALUES
    ('PostgreSQL Replica', 'database', v_project_id,
     '{"ip":"10.0.3.11","engine":"PostgreSQL 16","zone":"DATA","role":"replica","port":5432}',
     510, 510)
  RETURNING id INTO v_db_pg02;

  INSERT INTO nodes (label, type, project_id, properties, position_x, position_y) VALUES
    ('Core Switch', 'switch', v_project_id,
     '{"ip":"10.0.0.1","zone":"CORE","vendor":"Cisco","model":"Catalyst 9300","port_count":48,"vlans":"10,20,30,40"}',
     400, 630)
  RETURNING id INTO v_sw_core;

  INSERT INTO nodes (label, type, project_id, properties, position_x, position_y) VALUES
    ('CDN Azure', 'cloud', v_project_id,
     '{"provider":"Azure","service":"Azure CDN","region":"West Europe","zone":"EXTERNAL"}',
     400, -60)
  RETURNING id INTO v_srv_cdn;

  -- ── Liens ──────────────────────────────────────────────────────────────
  INSERT INTO edges (source_node_id, target_node_id, type, label, properties, project_id) VALUES
    (v_srv_cdn,   v_fw_dmz,    'network',     'HTTPS :443',  '{"port":443,"protocol":"HTTPS"}', v_project_id),
    (v_fw_dmz,    v_lb_web,    'network',     'HTTP :80',    '{"port":80}',                     v_project_id),
    (v_lb_web,    v_srv_web01, 'network',     'HTTP :8080',  '{"port":8080}',                   v_project_id),
    (v_lb_web,    v_srv_web02, 'network',     'HTTP :8080',  '{"port":8080}',                   v_project_id),
    (v_srv_web01, v_srv_app01, 'api_call',    'REST API',    '{"port":3000}',                   v_project_id),
    (v_srv_web02, v_app_api,   'api_call',    'REST API',    '{"port":443}',                    v_project_id),
    (v_srv_app01, v_db_pg01,   'data_flow',   'SQL :5432',   '{"port":5432}',                   v_project_id),
    (v_app_api,   v_db_pg01,   'data_flow',   'SQL :5432',   '{"port":5432}',                   v_project_id),
    (v_db_pg01,   v_db_pg02,   'replication', 'Replication', '{"mode":"streaming"}',            v_project_id),
    (v_sw_core,   v_db_pg01,   'network',     'VLAN DATA',   '{"vlan":40}',                     v_project_id),
    (v_sw_core,   v_db_pg02,   'network',     'VLAN DATA',   '{"vlan":40}',                     v_project_id);

  -- ── Templates globaux ──────────────────────────────────────────────────
  INSERT INTO node_templates (name, type, properties, is_global, created_by) VALUES
    ('Firewall Standard',  'firewall',  '{"vendor":"Fortinet","model":"FortiGate 100F","zone":"DMZ"}',                                    true, null),
    ('Serveur Web Ubuntu', 'server',    '{"os":"Ubuntu 22.04","role":"web","cpu":"4 vCPU","ram":"8 GB"}',                                  true, null),
    ('PostgreSQL Primary', 'database',  '{"engine":"PostgreSQL 16","role":"primary","port":5432,"backup_enabled":true}',                   true, null),
    ('API REST HTTPS',     'api',       '{"protocol":"HTTPS","auth_type":"JWT","version":"v1"}',                                           true, null),
    ('Azure Resource Grp', 'cloud',     '{"provider":"Azure","region":"West Europe"}',                                                     true, null);

END $$;
