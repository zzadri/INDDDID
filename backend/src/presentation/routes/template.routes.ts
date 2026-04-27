import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { createTemplateSchema } from '../validators/template.validator';
import { templateParamsSchema } from '../validators/params.validator';
import * as templateService from '../../application/template.service';
import { JwtPayload } from '../../domain/entities';

const router = Router();
router.use(requireAuth);

const uid = (req: Request): string => (req as Request & { user: JwtPayload }).user!.userId;

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await templateService.getTemplates(uid(req))); }
  catch (err) { next(err); }
});

router.post('/', validate(createTemplateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const t = await templateService.createTemplate({ ...req.body, userId: uid(req) });
    res.status(201).json(t);
  } catch (err) { next(err); }
});

router.delete('/:id', validate(templateParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await templateService.deleteTemplate(req.params.id, uid(req));
    if (!ok) { res.status(404).json({ error: 'Template not found or not yours' }); return; }
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
