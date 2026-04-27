/** Pure domain types — no external dependencies. */

export type NodeType =
  | 'server' | 'application' | 'database' | 'network'
  | 'workstation' | 'firewall' | 'router' | 'switch'
  | 'cloud' | 'user' | 'service' | 'api'
  | 'vm' | 'container'
  | 'unknown';

export type EdgeType =
  | 'network' | 'dependency' | 'data_flow'
  | 'hosts' | 'vpn' | 'api_call' | 'replication' | 'unknown';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name?: string;
  created_at: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  display_name?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  version: string;
  color?: string;
  tags?: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Node {
  id: string;
  label: string;
  type: NodeType;
  project_id: string;
  properties: Record<string, unknown>;
  position_x: number;
  position_y: number;
  created_at: Date;
  updated_at: Date;
}

export interface Edge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  type: EdgeType;
  label?: string;
  properties: Record<string, unknown>;
  project_id: string;
  created_at: Date;
}

export interface NodeTemplate {
  id: string;
  name: string;
  type: NodeType;
  properties: Record<string, unknown>;
  is_global: boolean;
  created_by?: string;
  created_at: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
}
