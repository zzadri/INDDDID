import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { createNodeSchema, updateNodeSchema } from '../validators/node.validator';
import { projectParamsSchema, nodeParamsSchema } from '../validators/params.validator';
import * as nodeService from '../../application/node.service';
import * as projectService from '../../application/project.service';
import { JwtPayload } from '../../domain/entities';

const router = Router({ mergeParams: true });
router.use(requireAuth);

const uid = (req: Request): string => (req as Request & { user: JwtPayload }).user!.userId;
const pid = (req: Request): string => req.params.projectId;

async function checkAccess(req: Request, res: Response): Promise<boolean> {
  const p = await projectService.getProjectById(pid(req), uid(req));
  if (!p) { res.status(404).json({ error: 'Project not found' }); return false; }
  return true;
}

router.get('/', validate(projectParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!await checkAccess(req, res)) return;
    res.json(await nodeService.getNodesByProject(pid(req)));
  } catch (err) { next(err); }
});

router.post('/', validate(projectParamsSchema, 'params'), validate(createNodeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!await checkAccess(req, res)) return;
    const node = await nodeService.createNode({ ...req.body, project_id: pid(req) });
    res.status(201).json(node);
  } catch (err) { next(err); }
});

router.put('/:nodeId', validate(nodeParamsSchema, 'params'), validate(updateNodeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!await checkAccess(req, res)) return;
    const node = await nodeService.updateNode(req.params.nodeId, pid(req), req.body);
    if (!node) { res.status(404).json({ error: 'Node not found' }); return; }
    res.json(node);
  } catch (err) { next(err); }
});

router.delete('/:nodeId', validate(nodeParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!await checkAccess(req, res)) return;
    const ok = await nodeService.deleteNode(req.params.nodeId, pid(req));
    if (!ok) { res.status(404).json({ error: 'Node not found' }); return; }
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
