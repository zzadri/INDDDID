import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator';
import { projectIdParamsSchema } from '../validators/params.validator';
import { upsertProxmoxConfigSchema } from '../validators/proxmox-config.validator';
import * as projectService from '../../application/project.service';
import * as dockerDeployService     from '../../application/docker-deploy.service';
import * as terraformProxmoxService from '../../application/terraform-proxmox.service';
import * as proxmoxConfigService    from '../../application/proxmox-config.service';
import { Edge, JwtPayload, Node } from '../../domain/entities';

const router = Router();
router.use(requireAuth);

const uid = (req: Request): string => (req as Request & { user: JwtPayload }).user!.userId;
const pid = (req: Request): string => req.params.id;

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await projectService.getProjectsByUser(uid(req))); }
  catch (err) { next(err); }
});

router.get('/:id', validate(projectIdParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.getProjectById(pid(req), uid(req));
    if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json(p);
  } catch (err) { next(err); }
});

router.get('/:id/graph', validate(projectIdParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.getProjectById(pid(req), uid(req));
    if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json(await projectService.getProjectGraph(pid(req)));
  } catch (err) { next(err); }
});

router.get('/:id/deploy/compose', validate(projectIdParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.getProjectById(pid(req), uid(req));
    if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
    const graph = await projectService.getProjectGraph(pid(req));
    const preview = await dockerDeployService.previewProjectDeployment(
      p.id,
      p.name,
      graph.nodes as Node[],
      graph.edges as Edge[],
    );
    res.json(preview);
  } catch (err) { next(err); }
});

router.post('/:id/deploy/up', validate(projectIdParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.getProjectById(pid(req), uid(req));
    if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
    const graph = await projectService.getProjectGraph(pid(req));
    const result = await dockerDeployService.deployProjectUp(
      p.id,
      p.name,
      graph.nodes as Node[],
      graph.edges as Edge[],
    );
    res.status(result.success ? 200 : 500).json(result);
  } catch (err) { next(err); }
});

router.post('/:id/deploy/down', validate(projectIdParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.getProjectById(pid(req), uid(req));
    if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
    const result = await dockerDeployService.deployProjectDown(p.id, p.name);
    res.status(result.success ? 200 : 500).json(result);
  } catch (err) { next(err); }
});

router.get('/:id/deploy/status', validate(projectIdParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.getProjectById(pid(req), uid(req));
    if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json(await dockerDeployService.getDeploymentStatus(p.id, p.name));
  } catch (err) { next(err); }
});

// ── Proxmox config (per project) ─────────────────────────────────────────────

router.get('/:id/proxmox-config', validate(projectIdParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.getProjectById(pid(req), uid(req));
    if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
    const cfg = await proxmoxConfigService.getPublicConfig(pid(req));
    res.json({ config: cfg });
  } catch (err) { next(err); }
});

router.put('/:id/proxmox-config',
  validate(projectIdParamsSchema, 'params'),
  validate(upsertProxmoxConfigSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const p = await projectService.getProjectById(pid(req), uid(req));
      if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
      const saved = await proxmoxConfigService.upsertConfig(pid(req), req.body);
      res.json(saved);
    } catch (err) { next(err); }
  },
);

router.delete('/:id/proxmox-config', validate(projectIdParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.getProjectById(pid(req), uid(req));
    if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
    const ok = await proxmoxConfigService.deleteConfig(pid(req));
    if (!ok) { res.status(404).json({ error: 'No Proxmox config for this project' }); return; }
    res.status(204).send();
  } catch (err) { next(err); }
});

// ── Terraform / Proxmox ──────────────────────────────────────────────────────

router.get('/:id/terraform/preview', validate(projectIdParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.getProjectById(pid(req), uid(req));
    if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
    const cfg     = await proxmoxConfigService.getResolvedConfig(pid(req));
    const graph   = await projectService.getProjectGraph(pid(req));
    const preview = await terraformProxmoxService.previewTerraform(p.id, p.name, graph.nodes as Node[], cfg);
    res.json(preview);
  } catch (err) { next(err); }
});

router.post('/:id/terraform/plan', validate(projectIdParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.getProjectById(pid(req), uid(req));
    if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
    const cfg    = await proxmoxConfigService.getResolvedConfig(pid(req));
    const graph  = await projectService.getProjectGraph(pid(req));
    const result = await terraformProxmoxService.planTerraform(p.id, p.name, graph.nodes as Node[], cfg);
    res.status(result.success ? 200 : 500).json(result);
  } catch (err) { next(err); }
});

router.post('/:id/terraform/apply', validate(projectIdParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.getProjectById(pid(req), uid(req));
    if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
    const cfg    = await proxmoxConfigService.getResolvedConfig(pid(req));
    const graph  = await projectService.getProjectGraph(pid(req));
    const result = await terraformProxmoxService.applyTerraform(p.id, p.name, graph.nodes as Node[], cfg);
    res.status(result.success ? 200 : 500).json(result);
  } catch (err) { next(err); }
});

router.post('/:id/terraform/destroy', validate(projectIdParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.getProjectById(pid(req), uid(req));
    if (!p) { res.status(404).json({ error: 'Project not found' }); return; }
    const cfg    = await proxmoxConfigService.getResolvedConfig(pid(req));
    const result = await terraformProxmoxService.destroyTerraform(p.id, cfg);
    res.status(result.success ? 200 : 500).json(result);
  } catch (err) { next(err); }
});

router.post('/', validate(createProjectSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await projectService.createProject(uid(req), req.body));
  } catch (err) { next(err); }
});

router.put('/:id', validate(projectIdParamsSchema, 'params'), validate(updateProjectSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await projectService.updateProject(pid(req), uid(req), req.body);
    if (!p) { res.status(404).json({ error: 'Project not found or not owner' }); return; }
    res.json(p);
  } catch (err) { next(err); }
});

router.delete('/:id', validate(projectIdParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await projectService.deleteProject(pid(req), uid(req));
    if (!ok) { res.status(404).json({ error: 'Project not found or not owner' }); return; }
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
