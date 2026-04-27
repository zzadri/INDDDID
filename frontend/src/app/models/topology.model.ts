export type NodeType =
  | 'server' | 'application' | 'database' | 'network'
  | 'workstation' | 'firewall' | 'router' | 'switch'
  | 'cloud' | 'user' | 'service' | 'api' | 'unknown';

export type EdgeType =
  | 'network' | 'dependency' | 'data_flow'
  | 'hosts' | 'vpn' | 'api_call' | 'replication' | 'unknown';

export interface UserPublic {
  id: string;
  email: string;
  display_name?: string;
}

export interface AuthResponse {
  user: UserPublic;
  token: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  version: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  node_count?: number;
  edge_count?: number;
}

export interface SiNode {
  id: string;
  label: string;
  type: NodeType;
  project_id: string;
  properties: Record<string, unknown>;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

export interface SiEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  type: EdgeType;
  label?: string;
  properties: Record<string, unknown>;
  project_id: string;
  created_at: string;
}

export interface ProjectGraph {
  nodes: SiNode[];
  edges: SiEdge[];
}

export interface NodeTemplate {
  id: string;
  name: string;
  type: NodeType;
  properties: Record<string, unknown>;
  is_global: boolean;
  created_by?: string;
  created_at: string;
}

export interface NodeIconEntry {
  type: NodeType;
  label: string;
  color: string;
  svgPath: string;
}
