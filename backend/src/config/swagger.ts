/**
 * Blueprint — OpenAPI 3.0 specification
 * Auto-served at GET /api/docs
 */
export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Blueprint API',
    version: '2.0.0',
    description:
      'REST API for Blueprint — DevOps infrastructure deployment tool.\n\n' +
      'Draw your infrastructure schema, configure each component, click Deploy.\n\n' +
      '**Auth:** All protected routes require a valid JWT cookie (`auth_token`) ' +
      'obtained via `POST /api/auth/login`.',
    contact: { name: 'Blueprint', email: 'adrien.lafargue.adri@gmail.com' },
  },
  servers: [
    { url: '/api', description: 'Current server (via nginx proxy)' },
    { url: 'http://localhost:3000/api', description: 'Backend direct (dev)' },
  ],
  tags: [
    { name: 'Auth',       description: 'Authentication & session management' },
    { name: 'Projects',   description: 'Infrastructure projects (schemas)' },
    { name: 'Nodes',      description: 'Graph nodes (servers, VMs, containers…)' },
    { name: 'Edges',      description: 'Graph edges (connections between nodes)' },
    { name: 'Templates',  description: 'Reusable node templates' },
    { name: 'Docker',     description: 'Docker Compose deployment (local)' },
    { name: 'Terraform',  description: 'Terraform / Proxmox deployment' },
    { name: 'Proxmox',    description: 'Per-project Proxmox configuration' },
    { name: 'Icons',      description: 'Lucide SVG icon registry' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in:   'cookie',
        name: 'auth_token',
        description: 'JWT token set by POST /auth/login (httpOnly, SameSite=Strict)',
      },
    },
    schemas: {
      // ── Auth ────────────────────────────────────────────────────────────────
      RegisterBody: {
        type: 'object', required: ['email', 'password'],
        properties: {
          email:        { type: 'string', format: 'email', example: 'devops@acme.com' },
          password:     { type: 'string', minLength: 8, example: 'strongpass' },
          display_name: { type: 'string', example: 'Alice DevOps' },
        },
      },
      LoginBody: {
        type: 'object', required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id:           { type: 'string', format: 'uuid' },
          email:        { type: 'string', format: 'email' },
          display_name: { type: 'string', nullable: true },
          created_at:   { type: 'string', format: 'date-time' },
        },
      },
      // ── Projects ─────────────────────────────────────────────────────────────
      Project: {
        type: 'object',
        properties: {
          id:          { type: 'string', format: 'uuid' },
          name:        { type: 'string' },
          description: { type: 'string', nullable: true },
          version:     { type: 'string', example: '1.0' },
          color:       { type: 'string', example: '#58a6ff' },
          tags:        { type: 'string', example: 'production,k8s' },
          owner_id:    { type: 'string', format: 'uuid' },
          created_at:  { type: 'string', format: 'date-time' },
          updated_at:  { type: 'string', format: 'date-time' },
        },
      },
      ProjectWithCounts: {
        allOf: [{ '$ref': '#/components/schemas/Project' }],
        properties: {
          node_count: { type: 'integer' },
          edge_count: { type: 'integer' },
        },
      },
      CreateProjectBody: {
        type: 'object', required: ['name'],
        properties: {
          name:        { type: 'string', example: 'Production Infra' },
          description: { type: 'string' },
          version:     { type: 'string', example: '1.0' },
          color:       { type: 'string', example: '#58a6ff' },
          tags:        { type: 'string', example: 'prod,aws' },
        },
      },
      // ── Nodes ────────────────────────────────────────────────────────────────
      NodeType: {
        type: 'string',
        enum: ['server', 'application', 'database', 'network', 'workstation',
               'firewall', 'router', 'switch', 'cloud', 'user', 'service',
               'api', 'vm', 'container', 'unknown'],
      },
      Node: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          label:      { type: 'string', example: 'web-server-01' },
          type:       { '$ref': '#/components/schemas/NodeType' },
          project_id: { type: 'string', format: 'uuid' },
          properties: { type: 'object', additionalProperties: true,
            example: { ip: '10.0.0.1', cpu: '4', ram: '8', os: 'Ubuntu 22.04' } },
          position_x: { type: 'number' },
          position_y: { type: 'number' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateNodeBody: {
        type: 'object', required: ['label', 'type'],
        properties: {
          label:      { type: 'string' },
          type:       { '$ref': '#/components/schemas/NodeType' },
          properties: { type: 'object', additionalProperties: true },
          position_x: { type: 'number', default: 0 },
          position_y: { type: 'number', default: 0 },
        },
      },
      // ── Edges ────────────────────────────────────────────────────────────────
      EdgeType: {
        type: 'string',
        enum: ['network', 'dependency', 'data_flow', 'hosts', 'vpn',
               'api_call', 'replication', 'unknown'],
      },
      Edge: {
        type: 'object',
        properties: {
          id:             { type: 'string', format: 'uuid' },
          source_node_id: { type: 'string', format: 'uuid' },
          target_node_id: { type: 'string', format: 'uuid' },
          type:           { '$ref': '#/components/schemas/EdgeType' },
          label:          { type: 'string', nullable: true },
          properties:     { type: 'object', additionalProperties: true },
          project_id:     { type: 'string', format: 'uuid' },
          created_at:     { type: 'string', format: 'date-time' },
        },
      },
      CreateEdgeBody: {
        type: 'object', required: ['source_node_id', 'target_node_id'],
        properties: {
          source_node_id: { type: 'string', format: 'uuid' },
          target_node_id: { type: 'string', format: 'uuid' },
          type:           { '$ref': '#/components/schemas/EdgeType' },
          label:          { type: 'string' },
        },
      },
      // ── Graph ────────────────────────────────────────────────────────────────
      ProjectGraph: {
        type: 'object',
        properties: {
          nodes: { type: 'array', items: { '$ref': '#/components/schemas/Node' } },
          edges: { type: 'array', items: { '$ref': '#/components/schemas/Edge' } },
        },
      },
      // ── Templates ────────────────────────────────────────────────────────────
      NodeTemplate: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          name:       { type: 'string', example: 'PostgreSQL Standard' },
          type:       { '$ref': '#/components/schemas/NodeType' },
          properties: { type: 'object', additionalProperties: true },
          is_global:  { type: 'boolean' },
          created_by: { type: 'string', format: 'uuid', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      // ── Proxmox Config ────────────────────────────────────────────────────────
      ProxmoxConfig: {
        type: 'object', required: ['endpoint', 'username', 'node'],
        properties: {
          endpoint:       { type: 'string', example: 'https://192.168.1.100:8006' },
          username:       { type: 'string', example: 'root@pam' },
          credential_mode:{ type: 'string', enum: ['token', 'password'] },
          api_token:      { type: 'string', description: 'PVE API token (token mode)', example: 'root@pam!blueprint=abc123' },
          password:       { type: 'string', description: 'PVE password (password mode)' },
          node:           { type: 'string', example: 'pve' },
          template_vm_id: { type: 'integer', example: 9000 },
          storage:        { type: 'string', example: 'local-lvm' },
          gateway:        { type: 'string', example: '192.168.1.1' },
          lxc_template:   { type: 'string', example: 'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst' },
        },
      },
      // ── Deploy responses ──────────────────────────────────────────────────────
      CommandResult: {
        type: 'object',
        properties: {
          success:     { type: 'boolean' },
          command:     { type: 'string' },
          exit_code:   { type: 'integer' },
          output:      { type: 'string' },
          error:       { type: 'string', nullable: true },
          project_key: { type: 'string' },
        },
      },
      TerraformPreview: {
        type: 'object',
        properties: {
          hcl:             { type: 'string', description: 'Generated Terraform HCL' },
          deployable_count:{ type: 'integer' },
          skipped_types:   { type: 'array', items: { type: 'string' } },
        },
      },
      // ── Error ─────────────────────────────────────────────────────────────────
      Error: {
        type: 'object',
        properties: {
          error:   { type: 'string' },
          details: { type: 'object', nullable: true },
        },
      },
    },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    // ── Auth ──────────────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Register new user', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/RegisterBody' } } } },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/User' } } } },
          '409': { description: 'Email already exists', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Login — sets httpOnly auth_token cookie', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/LoginBody' } } } },
        responses: {
          '200': { description: 'Authenticated', content: { 'application/json': { schema: { '$ref': '#/components/schemas/User' } } } },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'], summary: 'Logout — clears auth_token cookie',
        responses: { '204': { description: 'Cookie cleared' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'], summary: 'Get current authenticated user',
        responses: {
          '200': { description: 'Current user', content: { 'application/json': { schema: { '$ref': '#/components/schemas/User' } } } },
          '401': { description: 'Not authenticated' },
        },
      },
    },
    // ── Projects ──────────────────────────────────────────────────────────────
    '/projects': {
      get: {
        tags: ['Projects'], summary: 'List all projects for current user',
        responses: { '200': { description: 'Project list', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/ProjectWithCounts' } } } } } },
      },
      post: {
        tags: ['Projects'], summary: 'Create project',
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateProjectBody' } } } },
        responses: { '201': { description: 'Created project', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Project' } } } } },
      },
    },
    '/projects/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: {
        tags: ['Projects'], summary: 'Get project by ID',
        responses: {
          '200': { description: 'Project', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Project' } } } },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['Projects'], summary: 'Update project',
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateProjectBody' } } } },
        responses: { '200': { description: 'Updated project', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Project' } } } } },
      },
      delete: {
        tags: ['Projects'], summary: 'Delete project (cascades nodes/edges)',
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
    '/projects/{id}/graph': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: {
        tags: ['Projects'], summary: 'Get full project graph (nodes + edges)',
        responses: { '200': { description: 'Graph', content: { 'application/json': { schema: { '$ref': '#/components/schemas/ProjectGraph' } } } } },
      },
    },
    // ── Nodes ─────────────────────────────────────────────────────────────────
    '/projects/{projectId}/nodes': {
      parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      post: {
        tags: ['Nodes'], summary: 'Create node in project',
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateNodeBody' } } } },
        responses: { '201': { description: 'Created node', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Node' } } } } },
      },
    },
    '/projects/{projectId}/nodes/{nodeId}': {
      parameters: [
        { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'nodeId',    in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      put: {
        tags: ['Nodes'], summary: 'Update node (label, properties, position)',
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateNodeBody' } } } },
        responses: { '200': { description: 'Updated node', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Node' } } } } },
      },
      delete: {
        tags: ['Nodes'], summary: 'Delete node (cascades connected edges)',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    // ── Edges ─────────────────────────────────────────────────────────────────
    '/projects/{projectId}/edges': {
      parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      post: {
        tags: ['Edges'], summary: 'Create edge between two nodes',
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateEdgeBody' } } } },
        responses: { '201': { description: 'Created edge', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Edge' } } } } },
      },
    },
    '/projects/{projectId}/edges/{edgeId}': {
      parameters: [
        { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'edgeId',    in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      put: {
        tags: ['Edges'], summary: 'Update edge (label, type)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { label: { type: 'string' }, type: { '$ref': '#/components/schemas/EdgeType' } } } } } },
        responses: { '200': { description: 'Updated edge', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Edge' } } } } },
      },
      delete: {
        tags: ['Edges'], summary: 'Delete edge',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    // ── Templates ─────────────────────────────────────────────────────────────
    '/templates': {
      get: {
        tags: ['Templates'], summary: 'List accessible templates (global + own)',
        responses: { '200': { description: 'Templates', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/NodeTemplate' } } } } } },
      },
      post: {
        tags: ['Templates'], summary: 'Create template from node configuration',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'type'], properties: { name: { type: 'string' }, type: { '$ref': '#/components/schemas/NodeType' }, properties: { type: 'object' } } } } } },
        responses: { '201': { description: 'Created template', content: { 'application/json': { schema: { '$ref': '#/components/schemas/NodeTemplate' } } } } },
      },
    },
    '/templates/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      delete: {
        tags: ['Templates'], summary: 'Delete template (own templates only)',
        responses: { '204': { description: 'Deleted' }, '403': { description: 'Cannot delete global template' } },
      },
    },
    // ── Docker Deploy ──────────────────────────────────────────────────────────
    '/projects/{id}/deploy/compose': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: {
        tags: ['Docker'], summary: 'Preview generated docker-compose.yml',
        responses: { '200': { description: 'Compose YAML preview', content: { 'application/json': { schema: { type: 'object', properties: { compose: { type: 'string' }, service_count: { type: 'integer' } } } } } } },
      },
    },
    '/projects/{id}/deploy/up': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      post: {
        tags: ['Docker'], summary: 'Deploy project (docker compose up)',
        responses: { '200': { description: 'Result', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CommandResult' } } } } },
      },
    },
    '/projects/{id}/deploy/down': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      post: {
        tags: ['Docker'], summary: 'Stop & remove project containers (docker compose down)',
        responses: { '200': { description: 'Result', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CommandResult' } } } } },
      },
    },
    '/projects/{id}/deploy/status': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: {
        tags: ['Docker'], summary: 'List running containers for project',
        responses: { '200': { description: 'Container list', content: { 'application/json': { schema: { type: 'object', properties: { containers: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, image: { type: 'string' }, status: { type: 'string' } } } } } } } } } },
      },
    },
    // ── Proxmox Config ─────────────────────────────────────────────────────────
    '/projects/{id}/proxmox-config': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: {
        tags: ['Proxmox'], summary: 'Get Proxmox config (secrets never returned in clear)',
        responses: { '200': { description: 'Config or null', content: { 'application/json': { schema: { type: 'object', properties: { config: { '$ref': '#/components/schemas/ProxmoxConfig', nullable: true } } } } } } },
      },
      put: {
        tags: ['Proxmox'], summary: 'Create or update Proxmox config (upsert)',
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/ProxmoxConfig' } } } },
        responses: { '200': { description: 'Saved config (without secrets)' } },
      },
      delete: {
        tags: ['Proxmox'], summary: 'Delete Proxmox config for project',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    // ── Terraform ──────────────────────────────────────────────────────────────
    '/projects/{id}/terraform/preview': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: {
        tags: ['Terraform'], summary: 'Preview generated Terraform HCL (no execution)',
        responses: { '200': { description: 'HCL preview', content: { 'application/json': { schema: { '$ref': '#/components/schemas/TerraformPreview' } } } } },
      },
    },
    '/projects/{id}/terraform/plan': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      post: {
        tags: ['Terraform'], summary: 'Run terraform plan',
        responses: { '200': { description: 'Plan output', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CommandResult' } } } } },
      },
    },
    '/projects/{id}/terraform/apply': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      post: {
        tags: ['Terraform'], summary: 'Run terraform apply (creates/updates Proxmox resources)',
        responses: { '200': { description: 'Apply output', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CommandResult' } } } } },
      },
    },
    '/projects/{id}/terraform/destroy': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      post: {
        tags: ['Terraform'], summary: 'Run terraform destroy (removes all Proxmox resources for project)',
        responses: { '200': { description: 'Destroy output', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CommandResult' } } } } },
      },
    },
    // ── Icons ──────────────────────────────────────────────────────────────────
    '/icons': {
      get: {
        tags: ['Icons'], summary: 'List all node type icons (Lucide SVG)', security: [],
        responses: { '200': { description: 'Icon list', content: { 'application/json': { schema: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, label: { type: 'string' }, color: { type: 'string' }, svgPath: { type: 'string' } } } } } } } },
      },
    },
    // ── Health ─────────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: [], summary: 'Health check', security: [],
        servers: [{ url: 'http://localhost:3000', description: 'Backend direct' }],
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, version: { type: 'string' }, timestamp: { type: 'string' } } } } } } },
      },
    },
  },
};
