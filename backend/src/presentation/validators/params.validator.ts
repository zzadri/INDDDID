import { z } from 'zod';

const uuid = z.string().uuid();

export const projectIdParamsSchema = z.object({
  id: uuid,
});

export const projectParamsSchema = z.object({
  projectId: uuid,
});

export const nodeParamsSchema = z.object({
  projectId: uuid,
  nodeId:    uuid,
});

export const edgeParamsSchema = z.object({
  projectId: uuid,
  edgeId:    uuid,
});

export const templateParamsSchema = z.object({
  id: uuid,
});
