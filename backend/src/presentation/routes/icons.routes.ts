import { Router } from 'express';

const router = Router();

// Lucide icons — MIT License — https://lucide.dev
export const NODE_ICON_REGISTRY = [
  { type: 'server',      label: 'Serveur',          color: '#58a6ff', svgPath: '<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>' },
  { type: 'database',    label: 'Base de données',  color: '#d2a00e', svgPath: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.657 4.03 3 9 3s9-1.343 9-3V5"/><path d="M3 12c0 1.657 4.03 3 9 3s9-1.343 9-3"/>' },
  { type: 'application', label: 'Github App',       color: '#3fb950', svgPath: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>' },
  { type: 'api',         label: 'API',              color: '#3fb950', svgPath: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>' },
  { type: 'firewall',    label: 'Firewall',         color: '#f78166', svgPath: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
  { type: 'network',     label: 'Réseau',           color: '#8b949e', svgPath: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>' },
  { type: 'router',      label: 'Routeur',          color: '#ffd43b', svgPath: '<rect width="20" height="8" x="2" y="8" rx="2"/><path d="M6 12h.01"/><path d="M10 12h.01"/><path d="M2 8l2-4h16l2 4"/><path d="M6 16v4"/><path d="M18 16v4"/>' },
  { type: 'switch',      label: 'Switch',           color: '#4fc0ff', svgPath: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M6 21v-3a6 6 0 0 0 6-6V9"/><path d="m21 3-3 3 3 3"/>' },
  { type: 'cloud',       label: 'Cloud',            color: '#bc8cff', svgPath: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>' },
  { type: 'service',     label: 'Service',          color: '#3fb950', svgPath: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
  { type: 'workstation', label: 'Poste de travail', color: '#8b949e', svgPath: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>' },
  { type: 'user',        label: 'Utilisateur',      color: '#58a6ff', svgPath: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
];

router.get('/', (_req, res) => res.json(NODE_ICON_REGISTRY));

export default router;
