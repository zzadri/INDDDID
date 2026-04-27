import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { Edge, Node } from '../domain/entities';
import { AppError, ValidationError } from '../domain/errors';

function parseBoolean(value: string | undefined): boolean {
  if (value === undefined) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

const DOCKER_DEPLOY_ENABLED = parseBoolean(process.env.DOCKER_DEPLOY_ENABLED);
const DEPLOYMENTS_DIR = process.env.DEPLOYMENTS_DIR ?? '';

interface BuildSpec {
  context: string;
  dockerfile?: string;
}

interface ServiceSpec {
  name: string;
  image?: string;
  build?: BuildSpec;
  containerName: string;
  command?: string;
  ports: string[];
  dependsOn: string[];
  environment: Record<string, string>;
  volumes: string[];
  labels: Record<string, string>;
}

interface BuildResult {
  projectKey: string;
  compose: string;
  composeFile: string;
  serviceCount: number;
}

export interface DockerComposePreview {
  project_key: string;
  compose: string;
  compose_file: string;
  service_count: number;
  docker_enabled: boolean;
}

export interface DockerCommandResult {
  success: boolean;
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
}

export interface DockerStatusContainer {
  name: string;
  image: string;
  status: string;
}

export interface DockerStatusResult {
  project_key: string;
  containers: DockerStatusContainer[];
  docker_enabled: boolean;
}

function slug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'service';
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(lowered)) return true;
    if (['0', 'false', 'no', 'off'].includes(lowered)) return false;
  }
  return undefined;
}

function mergeEnv(target: Record<string, string>, value: unknown): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  for (const [key, envValue] of Object.entries(value as Record<string, unknown>)) {
    if (!key) continue;
    if (typeof envValue === 'string' || typeof envValue === 'number' || typeof envValue === 'boolean') {
      target[key] = String(envValue);
    }
  }
}

function toValidPort(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (value < 1 || value > 65535) return undefined;
  return value;
}

function toEnvKey(value: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
  return normalized || 'TARGET';
}

function parsePortFromLabel(label?: string): number | undefined {
  if (!label) return undefined;
  const match = label.match(/(?:^|[^0-9])(\d{2,5})(?!\d)/);
  if (!match) return undefined;
  return toValidPort(Number.parseInt(match[1], 10));
}

function normalizeGithubRepoContext(repo: string, ref?: string): string {
  let context = repo.trim();
  if (/^[\w.-]+\/[\w.-]+$/.test(context)) {
    context = `https://github.com/${context}.git`;
  }

  if (context.startsWith('git@github.com:')) {
    context = context.replace('git@github.com:', 'https://github.com/');
  }

  if (context.startsWith('https://github.com/') || context.startsWith('http://github.com/')) {
    const hashIndex = context.indexOf('#');
    const beforeHash = hashIndex >= 0 ? context.slice(0, hashIndex) : context;
    const afterHash = hashIndex >= 0 ? context.slice(hashIndex + 1) : '';
    const withGit = beforeHash.endsWith('.git') ? beforeHash : `${beforeHash.replace(/\/+$/, '')}.git`;
    context = afterHash ? `${withGit}#${afterHash}` : withGit;
  }

  if (ref && !context.includes('#')) {
    context = `${context}#${ref}`;
  }

  return context;
}

function resolveBuild(node: Node): BuildSpec | undefined {
  const props = asRecord(node.properties);
  if (node.type !== 'application') return undefined;

  const githubRepo = readString(props, 'github_repo') ?? readString(props, 'repo');
  if (!githubRepo) return undefined;

  const githubRef = readString(props, 'github_ref') ?? readString(props, 'ref');
  const dockerfile = readString(props, 'dockerfile_path') ?? readString(props, 'dockerfile');

  return {
    context: normalizeGithubRepoContext(githubRepo, githubRef),
    dockerfile,
  };
}

function resolveImage(node: Node): string | undefined {
  const props = asRecord(node.properties);
  const explicitImage = readString(props, 'image');
  if (explicitImage) return explicitImage;

  if (node.type === 'application') {
    const githubRepo = readString(props, 'github_repo') ?? readString(props, 'repo');
    if (githubRepo) return undefined;
  }

  if (node.type === 'database') {
    const engine = (readString(props, 'engine') ?? '').toLowerCase();
    if (engine.includes('postgres')) return 'postgres:16-alpine';
    if (engine.includes('mysql')) return 'mysql:8.0';
    if (engine.includes('mariadb')) return 'mariadb:11';
    if (engine.includes('mongo')) return 'mongo:7';
    if (engine.includes('redis')) return 'redis:7-alpine';
    if (engine.includes('sql server')) return 'mcr.microsoft.com/mssql/server:2022-latest';
    return 'postgres:16-alpine';
  }

  switch (node.type) {
    case 'server':
      return 'nginx:alpine';
    case 'application':
    case 'api':
      return 'node:20-alpine';
    default:
      return 'alpine:3.20';
  }
}

function resolveCommand(node: Node, image?: string): string | undefined {
  const props = asRecord(node.properties);
  const explicit = readString(props, 'command');
  if (explicit) return explicit;

  if (image?.startsWith('node:')) return 'sh -c "sleep infinity"';

  switch (node.type) {
    case 'cloud':
    case 'network':
    case 'router':
    case 'switch':
    case 'firewall':
    case 'workstation':
    case 'user':
    case 'service':
    case 'unknown':
      return 'sh -c "sleep infinity"';
    default:
      return undefined;
  }
}

function resolvePorts(record: Record<string, unknown>, usedHostPorts: Set<number>): string[] {
  const ports: string[] = [];

  const explicitPorts = record.ports;
  if (Array.isArray(explicitPorts)) {
    for (const entry of explicitPorts) {
      if (typeof entry === 'string' && entry.trim()) {
        ports.push(entry.trim());
      }
    }
  }

  const containerPort = toValidPort(readNumber(record, 'docker_port'))
    ?? toValidPort(readNumber(record, 'port'));
  if (containerPort !== undefined) {
    const hostPortFromProps = toValidPort(readNumber(record, 'expose_port'))
      ?? toValidPort(readNumber(record, 'host_port'));
    const publishPort = hostPortFromProps !== undefined
      || readBoolean(record, 'publish_port') === true
      || readBoolean(record, 'publish') === true;

    // Avoid binding host ports by default; publish only when explicitly requested.
    if (!publishPort) return ports;

    let hostPort = hostPortFromProps ?? containerPort;
    while (usedHostPorts.has(hostPort) && hostPort < 65535) hostPort += 1;
    if (hostPort <= 65535) {
      usedHostPorts.add(hostPort);
      ports.push(`${hostPort}:${containerPort}`);
    }
  }

  return ports;
}

function resolveEnvironment(
  node: Node,
  serviceName: string,
  image?: string,
): Record<string, string> {
  const props = asRecord(node.properties);
  const envVars: Record<string, string> = {};
  const containerPort = toValidPort(readNumber(props, 'docker_port'))
    ?? toValidPort(readNumber(props, 'port'));

  mergeEnv(envVars, props.environment);
  mergeEnv(envVars, props.env);

  if (containerPort !== undefined && (node.type === 'application' || node.type === 'api' || node.type === 'service')) {
    // Ensure app processes that rely on process.env.PORT bind to the same internal port as compose mapping.
    envVars.PORT = envVars.PORT ?? String(containerPort);
    envVars.HOST = envVars.HOST ?? '0.0.0.0';
  }

  if (image?.startsWith('postgres:')) {
    envVars.POSTGRES_DB = envVars.POSTGRES_DB ?? slug(readString(props, 'db_name') ?? `${serviceName}_db`);
    envVars.POSTGRES_USER = envVars.POSTGRES_USER ?? readString(props, 'db_user') ?? 'app';
    envVars.POSTGRES_PASSWORD = envVars.POSTGRES_PASSWORD ?? readString(props, 'db_password') ?? 'app_password';
  }

  if (image?.startsWith('mysql:') || image?.startsWith('mariadb:')) {
    envVars.MYSQL_DATABASE = envVars.MYSQL_DATABASE ?? slug(readString(props, 'db_name') ?? `${serviceName}_db`);
    envVars.MYSQL_USER = envVars.MYSQL_USER ?? readString(props, 'db_user') ?? 'app';
    envVars.MYSQL_PASSWORD = envVars.MYSQL_PASSWORD ?? readString(props, 'db_password') ?? 'app_password';
    envVars.MYSQL_ROOT_PASSWORD = envVars.MYSQL_ROOT_PASSWORD ?? 'root_password';
  }

  if (image?.includes('mssql/server')) {
    envVars.ACCEPT_EULA = envVars.ACCEPT_EULA ?? 'Y';
    envVars.MSSQL_SA_PASSWORD = envVars.MSSQL_SA_PASSWORD ?? 'Str0ng!Passw0rd';
  }

  return envVars;
}

function resolveVolumes(
  node: Node,
  serviceName: string,
  image?: string,
): { volumes: string[]; namedVolumes: string[] } {
  const props = asRecord(node.properties);
  const volumes: string[] = [];
  const namedVolumes: string[] = [];

  const explicitVolumes = props.volumes;
  if (Array.isArray(explicitVolumes)) {
    for (const entry of explicitVolumes) {
      if (typeof entry === 'string' && entry.trim()) {
        volumes.push(entry.trim());
      }
    }
  }

  if (image?.startsWith('postgres:')) {
    const volumeName = `${serviceName}_data`;
    volumes.push(`${volumeName}:/var/lib/postgresql/data`);
    namedVolumes.push(volumeName);
  }

  if (image?.startsWith('mysql:') || image?.startsWith('mariadb:')) {
    const volumeName = `${serviceName}_data`;
    volumes.push(`${volumeName}:/var/lib/mysql`);
    namedVolumes.push(volumeName);
  }

  if (image?.startsWith('mongo:')) {
    const volumeName = `${serviceName}_data`;
    volumes.push(`${volumeName}:/data/db`);
    namedVolumes.push(volumeName);
  }

  return { volumes, namedVolumes };
}

function buildProjectKey(projectName: string, projectId: string): string {
  const namePart = slug(projectName).slice(0, 24);
  const idPart = slug(projectId).slice(0, 8);
  return `inddid-${namePart}-${idPart}`.slice(0, 63);
}

function renderCompose(projectKey: string, services: ServiceSpec[], namedVolumes: Set<string>): string {
  const lines: string[] = [];

  lines.push(`name: ${quote(projectKey)}`);
  lines.push('services:');

  for (const service of services) {
    lines.push(`  ${service.name}:`);
    if (service.image) {
      lines.push(`    image: ${quote(service.image)}`);
    }
    if (service.build) {
      lines.push('    build:');
      lines.push(`      context: ${quote(service.build.context)}`);
      if (service.build.dockerfile) {
        lines.push(`      dockerfile: ${quote(service.build.dockerfile)}`);
      }
    }
    lines.push(`    container_name: ${quote(service.containerName)}`);
    lines.push('    restart: unless-stopped');

    if (service.command) lines.push(`    command: ${quote(service.command)}`);

    if (service.dependsOn.length > 0) {
      lines.push('    depends_on:');
      for (const dependency of service.dependsOn) {
        lines.push(`      - ${dependency}`);
      }
    }

    if (service.ports.length > 0) {
      lines.push('    ports:');
      for (const port of service.ports) {
        lines.push(`      - ${quote(port)}`);
      }
    }

    if (Object.keys(service.environment).length > 0) {
      lines.push('    environment:');
      for (const key of Object.keys(service.environment).sort()) {
        lines.push(`      ${key}: ${quote(service.environment[key])}`);
      }
    }

    if (service.volumes.length > 0) {
      lines.push('    volumes:');
      for (const volume of service.volumes) {
        lines.push(`      - ${quote(volume)}`);
      }
    }

    lines.push('    labels:');
    for (const key of Object.keys(service.labels).sort()) {
      lines.push(`      ${key}: ${quote(service.labels[key])}`);
    }

    lines.push('    networks:');
    lines.push('      - inddid_net');
  }

  if (namedVolumes.size > 0) {
    lines.push('volumes:');
    for (const volumeName of Array.from(namedVolumes).sort()) {
      lines.push(`  ${volumeName}:`);
    }
  }

  lines.push('networks:');
  lines.push('  inddid_net:');
  lines.push('    driver: bridge');

  return `${lines.join('\n')}\n`;
}

function buildComposeFromGraph(projectId: string, projectName: string, nodes: Node[], edges: Edge[]): BuildResult {
  if (nodes.length === 0) {
    throw new ValidationError('Cannot deploy an empty graph. Add at least one node first.');
  }

  const projectKey = buildProjectKey(projectName, projectId);
  const usedServiceNames = new Set<string>();
  const usedHostPorts = new Set<number>();
  const namedVolumes = new Set<string>();
  const nodeById = new Map<string, Node>();
  const nodeToService = new Map<string, string>();
  const serviceByName = new Map<string, ServiceSpec>();

  for (const node of nodes) {
    nodeById.set(node.id, node);
    const baseName = slug(node.label || node.type || 'service');
    let serviceName = baseName;
    let index = 2;
    while (usedServiceNames.has(serviceName)) {
      serviceName = `${baseName}-${index}`;
      index += 1;
    }
    usedServiceNames.add(serviceName);

    const build = resolveBuild(node);
    const image = resolveImage(node);
    if (!build && !image) {
      throw new ValidationError(`Node "${node.label}" does not define a deployable image or github_repo.`);
    }
    const command = resolveCommand(node, image);
    const props = asRecord(node.properties);
    const ports = resolvePorts(props, usedHostPorts);
    const environment = resolveEnvironment(node, serviceName, image);
    const volumeInfo = resolveVolumes(node, serviceName, image);
    for (const volumeName of volumeInfo.namedVolumes) namedVolumes.add(volumeName);

    const spec: ServiceSpec = {
      name: serviceName,
      image,
      build,
      containerName: `${projectKey}-${serviceName}`,
      command,
      ports,
      dependsOn: [],
      environment,
      volumes: volumeInfo.volumes,
      labels: {
        'inddid.project': projectId,
        'inddid.node_id': node.id,
        'inddid.node_type': node.type,
      },
    };

    nodeToService.set(node.id, serviceName);
    serviceByName.set(serviceName, spec);
  }

  for (const edge of edges) {
    const sourceService = nodeToService.get(edge.source_node_id);
    const targetService = nodeToService.get(edge.target_node_id);
    if (!sourceService || !targetService || sourceService === targetService) continue;

    const sourceSpec = serviceByName.get(sourceService);
    const sourceNode = nodeById.get(edge.source_node_id);
    const targetNode = nodeById.get(edge.target_node_id);
    if (!sourceSpec) continue;

    if (!sourceSpec.dependsOn.includes(targetService)) {
      sourceSpec.dependsOn.push(targetService);
    }

    const targetProps = asRecord(targetNode?.properties);
    const edgeProps = asRecord(edge.properties);
    const linkPort = toValidPort(readNumber(edgeProps, 'port'))
      ?? toValidPort(readNumber(targetProps, 'docker_port'))
      ?? toValidPort(readNumber(targetProps, 'port'))
      ?? parsePortFromLabel(edge.label);

    const targetKey = toEnvKey(targetService);
    sourceSpec.environment[`${targetKey}_HOST`] = targetService;
    if (linkPort !== undefined) {
      sourceSpec.environment[`${targetKey}_PORT`] = String(linkPort);
    }

    if (targetNode?.type === 'database') {
      sourceSpec.environment.DATABASE_HOST = sourceSpec.environment.DATABASE_HOST ?? targetService;
      if (linkPort !== undefined) {
        sourceSpec.environment.DATABASE_PORT = sourceSpec.environment.DATABASE_PORT ?? String(linkPort);
      }

      const dbName = readString(targetProps, 'db_name') ?? readString(targetProps, 'database');
      const dbUser = readString(targetProps, 'db_user');
      const dbPassword = readString(targetProps, 'db_password');

      if (dbName) sourceSpec.environment.DATABASE_NAME = sourceSpec.environment.DATABASE_NAME ?? dbName;
      if (dbUser) sourceSpec.environment.DATABASE_USER = sourceSpec.environment.DATABASE_USER ?? dbUser;
      if (dbPassword) sourceSpec.environment.DATABASE_PASSWORD = sourceSpec.environment.DATABASE_PASSWORD ?? dbPassword;

      const sourceType = sourceNode?.type;
      if ((sourceType === 'application' || sourceType === 'api') && linkPort !== undefined) {
        const defaultDb = dbName ?? 'app';
        const defaultUser = dbUser ?? 'app';
        const defaultPwd = dbPassword ?? 'app_password';
        sourceSpec.environment.DATABASE_URL = sourceSpec.environment.DATABASE_URL
          ?? `postgresql://${defaultUser}:${defaultPwd}@${targetService}:${linkPort}/${defaultDb}`;
      }
    }
  }

  for (const service of serviceByName.values()) {
    service.dependsOn.sort();
  }

  const services = Array.from(serviceByName.values()).sort((a, b) => a.name.localeCompare(b.name));
  const compose = renderCompose(projectKey, services, namedVolumes);
  const deployRoot = DEPLOYMENTS_DIR || path.join(os.tmpdir(), 'inddid-deployments');
  const composeFile = path.join(deployRoot, projectId, 'docker-compose.generated.yml');

  return {
    projectKey,
    compose,
    composeFile,
    serviceCount: services.length,
  };
}

async function persistCompose(composeFile: string, compose: string): Promise<void> {
  await fs.mkdir(path.dirname(composeFile), { recursive: true });
  await fs.writeFile(composeFile, compose, 'utf8');
}

function runDocker(args: string[]): Promise<DockerCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        reject(new AppError('Docker CLI not found in backend runtime', 500));
        return;
      }
      reject(err);
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        command: `docker ${args.join(' ')}`,
        exit_code: code ?? -1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

function assertDockerEnabled(): void {
  if (!DOCKER_DEPLOY_ENABLED) {
    throw new AppError('Docker deployment is disabled. Set DOCKER_DEPLOY_ENABLED=true.', 403);
  }
}

function parseContainerLines(raw: string): DockerStatusContainer[] {
  const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
  return lines
    .map((line) => {
      const [name, image, status] = line.split('|');
      if (!name || !image || !status) return null;
      return { name, image, status };
    })
    .filter((entry): entry is DockerStatusContainer => entry !== null);
}

export async function previewProjectDeployment(
  projectId: string,
  projectName: string,
  nodes: Node[],
  edges: Edge[],
): Promise<DockerComposePreview> {
  const build = buildComposeFromGraph(projectId, projectName, nodes, edges);
  await persistCompose(build.composeFile, build.compose);

  return {
    project_key: build.projectKey,
    compose: build.compose,
    compose_file: build.composeFile,
    service_count: build.serviceCount,
    docker_enabled: DOCKER_DEPLOY_ENABLED,
  };
}

export async function deployProjectUp(
  projectId: string,
  projectName: string,
  nodes: Node[],
  edges: Edge[],
): Promise<DockerCommandResult & { project_key: string; compose_file: string }> {
  assertDockerEnabled();

  const preview = await previewProjectDeployment(projectId, projectName, nodes, edges);
  const result = await runDocker(['compose', '-p', preview.project_key, '-f', preview.compose_file, 'up', '-d']);

  return {
    ...result,
    project_key: preview.project_key,
    compose_file: preview.compose_file,
  };
}

export async function deployProjectDown(
  projectId: string,
  projectName: string,
): Promise<DockerCommandResult & { project_key: string }> {
  assertDockerEnabled();

  const projectKey = buildProjectKey(projectName, projectId);
  const listResult = await runDocker([
    'ps',
    '-aq',
    '--filter',
    `label=inddid.project=${projectId}`,
  ]);

  if (!listResult.success) {
    return {
      ...listResult,
      project_key: projectKey,
    };
  }

  const containerIds = listResult.stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (containerIds.length === 0) {
    return {
      success: true,
      command: 'docker rm -f <none>',
      exit_code: 0,
      stdout: 'No deployment containers found for this project.',
      stderr: '',
      project_key: projectKey,
    };
  }

  const removeResult = await runDocker(['rm', '-f', ...containerIds]);
  return {
    ...removeResult,
    project_key: projectKey,
  };
}

export async function getDeploymentStatus(
  projectId: string,
  projectName: string,
): Promise<DockerStatusResult> {
  assertDockerEnabled();

  const projectKey = buildProjectKey(projectName, projectId);
  const statusResult = await runDocker([
    'ps',
    '--filter',
    `label=inddid.project=${projectId}`,
    '--format',
    '{{.Names}}|{{.Image}}|{{.Status}}',
  ]);

  if (!statusResult.success) {
    throw new AppError(statusResult.stderr || 'Cannot retrieve Docker status', 500);
  }

  return {
    project_key: projectKey,
    containers: parseContainerLines(statusResult.stdout),
    docker_enabled: DOCKER_DEPLOY_ENABLED,
  };
}
