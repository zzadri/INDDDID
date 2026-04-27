import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { NodeTemplate, NodeType } from '../domain/entities';
import { mapTemplate } from './prisma-mappers';

export async function getTemplates(userId: string): Promise<NodeTemplate[]> {
  const templates = await prisma.nodeTemplate.findMany({
    where: {
      OR: [
        { is_global: true },
        { created_by: userId },
      ],
    },
    orderBy: [
      { is_global: 'desc' },
      { name: 'asc' },
    ],
  });
  return templates.map(mapTemplate);
}

export async function createTemplate(data: {
  name: string;
  type: NodeType;
  properties: Record<string, unknown>;
  userId: string;
  // is_global NOT accepted from user input — always forced false via API.
  // Admin inserts only via direct DB access.
}): Promise<NodeTemplate> {
  const template = await prisma.nodeTemplate.create({
    data: {
      name: data.name,
      type: data.type,
      properties: data.properties as Prisma.InputJsonValue,
      is_global: false,          // hard-coded: users never create global templates
      created_by: data.userId,
    },
  });
  return mapTemplate(template);
}

export async function deleteTemplate(id: string, userId: string): Promise<boolean> {
  const result = await prisma.nodeTemplate.deleteMany({
    where: {
      id,
      created_by: userId,
      is_global: false,
    },
  });
  return result.count > 0;
}
