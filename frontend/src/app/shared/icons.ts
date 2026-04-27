import { NodeType } from '../domain/models';

// Lucide icons — MIT License — https://lucide.dev
export interface IconEntry {
  type: NodeType;
  label: string;
  color: string;
  svgPath: string;
}

export const NODE_ICONS: IconEntry[] = [
  {
    type: 'server', label: 'Serveur', color: '#58a6ff',
    svgPath: '<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>',
  },
  {
    type: 'database', label: 'Base de données', color: '#d2a00e',
    svgPath: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.657 4.03 3 9 3s9-1.343 9-3V5"/><path d="M3 12c0 1.657 4.03 3 9 3s9-1.343 9-3"/>',
  },
  {
    type: 'application', label: 'Github App', color: '#3fb950',
    svgPath: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  },
  {
    type: 'api', label: 'API', color: '#3fb950',
    svgPath: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  },
  {
    type: 'firewall', label: 'Firewall', color: '#f78166',
    svgPath: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  },
  {
    type: 'network', label: 'Réseau', color: '#8b949e',
    svgPath: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
  },
  {
    type: 'router', label: 'Routeur', color: '#ffd43b',
    svgPath: '<rect width="20" height="8" x="2" y="8" rx="2"/><path d="M6 12h.01"/><path d="M10 12h.01"/><path d="M2 8l2-4h16l2 4"/><path d="M6 16v4"/><path d="M18 16v4"/>',
  },
  {
    type: 'switch', label: 'Switch', color: '#4fc0ff',
    svgPath: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M6 21v-3a6 6 0 0 0 6-6V9"/><path d="m21 3-3 3 3 3"/>',
  },
  {
    type: 'cloud', label: 'Cloud', color: '#bc8cff',
    svgPath: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  },
  {
    type: 'service', label: 'Service', color: '#3fb950',
    svgPath: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  },
  {
    type: 'workstation', label: 'Poste de travail', color: '#8b949e',
    svgPath: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
  },
  {
    type: 'user', label: 'Utilisateur', color: '#58a6ff',
    svgPath: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  },
  {
    type: 'vm', label: 'Machine virtuelle', color: '#a371f7',
    svgPath: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
  },
  {
    type: 'container', label: 'Conteneur', color: '#1d9bf0',
    svgPath: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/>',
  },
];

export const ICON_MAP = new Map<string, IconEntry>(NODE_ICONS.map(i => [i.type, i]));

export function getIcon(type: string): IconEntry {
  return ICON_MAP.get(type) ?? NODE_ICONS[NODE_ICONS.length - 1];
}

export function svgIcon(type: string, size = 20, color?: string): string {
  const entry = getIcon(type);
  const c = color ?? entry.color;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${entry.svgPath}</svg>`;
}
