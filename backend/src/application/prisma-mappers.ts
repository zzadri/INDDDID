import { Prisma } from '@prisma/client';
import {
  Edge,
  Node,
  NodeTemplate,
  Project,
  User,
  UserPublic,
} from '../domain/entities';

type PrismaUserRecord = {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  created_at: Date;
};

type PrismaUserPublicRecord = {
  id: string;
  email: string;
  display_name: string | null;
};

type PrismaProjectRecord = {
  id: string;
  name: string;
  description: string | null;
  version: string;
  color: string;
  tags: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
};

type PrismaNodeRecord = {
  id: string;
  label: string;
  type: string;
  project_id: string;
  properties: Prisma.JsonValue;
  position_x: number;
  position_y: number;
  created_at: Date;
  updated_at: Date;
};

type PrismaEdgeRecord = {
  id: string;
  source_node_id: string;
  target_node_id: string;
  type: string;
  label: string | null;
  properties: Prisma.JsonValue;
  project_id: string;
  created_at: Date;
};

type PrismaTemplateRecord = {
  id: string;
  name: string;
  type: string;
  properties: Prisma.JsonValue;
  is_global: boolean;
  created_by: string | null;
  created_at: Date;
};

function toRecord(value: Prisma.JsonValue): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function mapUser(row: PrismaUserRecord): User {
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    display_name: row.display_name ?? undefined,
    created_at: row.created_at,
  };
}

export function mapUserPublic(row: PrismaUserPublicRecord): UserPublic {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name ?? undefined,
  };
}

export function mapProject(row: PrismaProjectRecord): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    version: row.version,
    color: row.color || undefined,
    tags: row.tags || undefined,
    owner_id: row.owner_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapNode(row: PrismaNodeRecord): Node {
  return {
    id: row.id,
    label: row.label,
    type: row.type as Node['type'],
    project_id: row.project_id,
    properties: toRecord(row.properties),
    position_x: row.position_x,
    position_y: row.position_y,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapEdge(row: PrismaEdgeRecord): Edge {
  return {
    id: row.id,
    source_node_id: row.source_node_id,
    target_node_id: row.target_node_id,
    type: row.type as Edge['type'],
    label: row.label ?? undefined,
    properties: toRecord(row.properties),
    project_id: row.project_id,
    created_at: row.created_at,
  };
}

export function mapTemplate(row: PrismaTemplateRecord): NodeTemplate {
  return {
    id: row.id,
    name: row.name,
    type: row.type as NodeTemplate['type'],
    properties: toRecord(row.properties),
    is_global: row.is_global,
    created_by: row.created_by ?? undefined,
    created_at: row.created_at,
  };
}
