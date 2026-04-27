import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { Edge, EdgeType } from '../domain/entities';
import { mapEdge } from './prisma-mappers';

export async function getEdgesByProject(projectId: string): Promise<Edge[]> {
  const edges = await prisma.edge.findMany({
    where: { project_id: projectId },
    orderBy: { created_at: 'asc' },
  });
  return edges.map(mapEdge);
}

export async function createEdge(data: {
  id?: string;
  source_node_id: string;
  target_node_id: string;
  type?: EdgeType;
  label?: string;
  properties?: Record<string, unknown>;
  project_id: string;
}): Promise<Edge> {
  // Security: verify both nodes belong to this project (prevent cross-project IDOR)
  const [sourceNode, targetNode] = await Promise.all([
    prisma.node.findFirst({ where: { id: data.source_node_id, project_id: data.project_id } }),
    prisma.node.findFirst({ where: { id: data.target_node_id, project_id: data.project_id } }),
  ]);
  if (!sourceNode || !targetNode) {
    throw new Error('One or both nodes do not belong to this project');
  }

  const id = data.id ?? uuidv4();
  const edge = await prisma.edge.create({
    data: {
      id,
      source_node_id: data.source_node_id,
      target_node_id: data.target_node_id,
      type: data.type ?? 'network',
      label: data.label ?? null,
      properties: (data.properties ?? {}) as Prisma.InputJsonValue,
      project_id: data.project_id,
    },
  });
  return mapEdge(edge);
}

export async function updateEdge(
  id: string,
  projectId: string,
  data: { label?: string; type?: EdgeType },
): Promise<Edge | null> {
  const updateData: { label?: string | null; type?: EdgeType } = {};

  if (data.label !== undefined) updateData.label = data.label || null;
  if (data.type !== undefined)  updateData.type  = data.type;

  if (Object.keys(updateData).length === 0) return null;

  const updated = await prisma.edge.updateMany({
    where: { id, project_id: projectId },
    data: updateData,
  });

  if (updated.count === 0) return null;

  const edge = await prisma.edge.findUnique({ where: { id } });
  return edge ? mapEdge(edge) : null;
}

export async function deleteEdge(id: string, projectId: string): Promise<boolean> {
  const result = await prisma.edge.deleteMany({
    where: { id, project_id: projectId },
  });
  return result.count > 0;
}
