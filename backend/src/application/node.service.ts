import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { Node, NodeType } from '../domain/entities';
import { mapNode } from './prisma-mappers';

export async function getNodesByProject(projectId: string): Promise<Node[]> {
  const nodes = await prisma.node.findMany({
    where: { project_id: projectId },
    orderBy: { created_at: 'asc' },
  });
  return nodes.map(mapNode);
}

export async function getNodeById(id: string): Promise<Node | null> {
  const node = await prisma.node.findUnique({ where: { id } });
  return node ? mapNode(node) : null;
}

export async function createNode(data: {
  id?: string;
  label: string;
  type: NodeType;
  project_id: string;
  properties?: Record<string, unknown>;
  position_x?: number;
  position_y?: number;
}): Promise<Node> {
  const id = data.id ?? uuidv4();
  const node = await prisma.node.create({
    data: {
      id,
      label: data.label,
      type: data.type,
      project_id: data.project_id,
      properties: (data.properties ?? {}) as Prisma.InputJsonValue,
      position_x: data.position_x ?? 0,
      position_y: data.position_y ?? 0,
    },
  });
  return mapNode(node);
}

export async function updateNode(
  id: string,
  projectId: string,
  data: Partial<{
    label: string; type: NodeType;
    properties: Record<string, unknown>;
    position_x: number; position_y: number;
  }>,
): Promise<Node | null> {
  const updateData: {
    label?: string;
    type?: NodeType;
    properties?: Prisma.InputJsonValue;
    position_x?: number;
    position_y?: number;
  } = {};

  if (data.label !== undefined)      updateData.label      = data.label;
  if (data.type !== undefined)       updateData.type       = data.type;
  if (data.properties !== undefined) updateData.properties = data.properties as Prisma.InputJsonValue;
  if (data.position_x !== undefined) updateData.position_x = data.position_x;
  if (data.position_y !== undefined) updateData.position_y = data.position_y;

  if (Object.keys(updateData).length === 0) return getNodeById(id);

  const updated = await prisma.node.updateMany({
    where: { id, project_id: projectId },
    data: updateData,
  });

  if (updated.count === 0) return null;

  const node = await prisma.node.findUnique({ where: { id } });
  return node ? mapNode(node) : null;
}

export async function deleteNode(id: string, projectId: string): Promise<boolean> {
  const result = await prisma.node.deleteMany({
    where: { id, project_id: projectId },
  });
  return result.count > 0;
}
