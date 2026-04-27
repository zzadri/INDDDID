import prisma from '../config/database';
import { Project } from '../domain/entities';
import { mapEdge, mapNode, mapProject } from './prisma-mappers';

export async function getProjectsByUser(
  userId: string,
): Promise<(Project & { node_count: number; edge_count: number })[]> {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { owner_id: userId },
        { project_permissions: { some: { user_id: userId } } },
      ],
    },
    include: {
      _count: {
        select: {
          nodes: true,
          edges: true,
        },
      },
    },
    orderBy: {
      updated_at: 'desc',
    },
  });

  return projects.map((project) => ({
    ...mapProject(project),
    node_count: project._count.nodes,
    edge_count: project._count.edges,
  }));
}

export async function getProjectById(id: string, userId: string): Promise<Project | null> {
  const project = await prisma.project.findFirst({
    where: {
      id,
      OR: [
        { owner_id: userId },
        { project_permissions: { some: { user_id: userId } } },
      ],
    },
  });
  return project ? mapProject(project) : null;
}

export async function createProject(
  userId: string,
  data: { name: string; description?: string; version?: string; color?: string; tags?: string },
): Promise<Project> {
  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      version: data.version ?? '1.0',
      color: data.color ?? '#58a6ff',
      tags: data.tags ?? '',
      owner_id: userId,
    },
  });
  return mapProject(project);
}

export async function updateProject(
  id: string,
  userId: string,
  data: { name?: string; description?: string; version?: string; color?: string; tags?: string },
): Promise<Project | null> {
  const updateData: {
    name?: string;
    description?: string | null;
    version?: string;
    color?: string;
    tags?: string;
  } = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description ?? null;
  if (data.version !== undefined) updateData.version = data.version;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.tags !== undefined) updateData.tags = data.tags;

  if (Object.keys(updateData).length === 0) {
    return getProjectById(id, userId);
  }

  const updated = await prisma.project.updateMany({
    where: { id, owner_id: userId },
    data: updateData,
  });

  if (updated.count === 0) return null;

  const project = await prisma.project.findUnique({ where: { id } });
  return project ? mapProject(project) : null;
}

export async function deleteProject(id: string, userId: string): Promise<boolean> {
  const result = await prisma.project.deleteMany({
    where: { id, owner_id: userId },
  });
  return result.count > 0;
}

export async function getProjectGraph(
  projectId: string,
): Promise<{ nodes: unknown[]; edges: unknown[] }> {
  const [nodes, edges] = await Promise.all([
    prisma.node.findMany({ where: { project_id: projectId }, orderBy: { created_at: 'asc' } }),
    prisma.edge.findMany({ where: { project_id: projectId }, orderBy: { created_at: 'asc' } }),
  ]);
  return {
    nodes: nodes.map(mapNode),
    edges: edges.map(mapEdge),
  };
}
