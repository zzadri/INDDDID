import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { createEdgeSchema, updateEdgeSchema } from '../validators/edge.validator';
import { projectParamsSchema, edgeParamsSchema } from '../validators/params.validator';
import * as edgeService from '../../application/edge.service';
import * as projectService from '../../application/project.service';
import { JwtPayload } from '../../domain/entities';

const router = Router({ mergeParams: true });
router.use(requireAuth);

const uid = (req: Request): string => (req as Request & { user: JwtPayload }).user!.userId;
const pid = (req: Request): string => req.params.projectId;

router.post('/', validate(projectParamsSchema, 'params'), validate(createEdgeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.getProjectById(pid(req), uid(req));
    if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
    const edge = await edgeService.createEdge({ ...req.body, project_id: pid(req) });
    res.status(201).json(edge);
  } catch (err) { next(err); }
});

router.put('/:edgeId', validate(edgeParamsSchema, 'params'), validate(updateEdgeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.getProjectById(pid(req), uid(req));
    if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
    const edge = await edgeService.updateEdge(req.params.edgeId, pid(req), req.body);
    if (!edge) { res.status(404).json({ error: 'Edge not found' }); return; }
    res.json(edge);
  } catch (err) { next(err); }
});

router.delete('/:edgeId', validate(edgeParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.getProjectById(pid(req), uid(req));
    if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
    const ok = await edgeService.deleteEdge(req.params.edgeId, pid(req));
    if (!ok) { res.status(404).json({ error: 'Edge not found' }); return; }
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
