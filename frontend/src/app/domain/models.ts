/** Pure domain interfaces — no Angular dependencies. */

export type NodeType =
  | 'server' | 'application' | 'database' | 'network'
  | 'workstation' | 'firewall' | 'router' | 'switch'
  | 'cloud' | 'user' | 'service' | 'api'
  | 'vm' | 'container'
  | 'unknown';

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
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  version: string;
  color?: string;
  tags?: string;
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

export interface DockerComposePreview {
  project_key: string;
  compose: string;
  compose_file: string;
  service_count: number;
  docker_enabled: boolean;
}

export interface DockerDeployResult {
  success: boolean;
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  project_key: string;
  compose_file?: string;
}

export interface DockerStatusContainer {
  name: string;
  image: string;
  status: string;
}

export interface DockerStatusResponse {
  project_key: string;
  containers: DockerStatusContainer[];
  docker_enabled: boolean;
}

// ── Terraform / Proxmox ──────────────────────────────────────────────────────

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

// ── Proxmox config per project ───────────────────────────────────────────────

export interface ProxmoxConfigPublic {
  project_id:      string;
  endpoint:        string;
  username:        string;
  node:            string;
  template_vm_id:  number;
  storage:         string;
  gateway:         string;
  lxc_template:    string;
  has_api_token:   boolean;
  has_password:    boolean;
  vm_user:         string;
  has_vm_password: boolean;
  vm_ssh_key:      string | null;
  updated_at:      string;
}

export interface ProxmoxConfigResponse {
  config: ProxmoxConfigPublic | null;
}

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
  vm_user?:        string;
  vm_password?:    string | null;
  vm_ssh_key?:     string | null;
}

export interface ProxmoxTemplateStatus {
  vm_id:      number;
  exists:     boolean;
  image_url:  string;
  image_name: string;
  has_cred:   boolean;
}

export interface ProxmoxTemplateEnsureResult {
  created: boolean;
  message: string;
}
