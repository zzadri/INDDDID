import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import cytoscape, { Core, NodeSingular, EdgeSingular, ElementDefinition } from 'cytoscape';
import { ApiService } from '../../core/services/api.service';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Project,
  SiNode,
  SiEdge,
  ProjectGraph,
  NodeTemplate,
  NodeType,
  EdgeType,
  DockerStatusContainer,
  ProxmoxConfigPublic,
  ProxmoxConfigInput,
} from '../../domain/models';
import { NODE_ICONS, svgIcon, IconEntry } from '../../shared/icons';
import { NODE_SCHEMAS, PropertyField } from '../../shared/node-schemas';

type RightPanel      = 'properties' | 'templates';
type InteractionMode = 'select' | 'connect';

interface ShortcutItem  { label: string; keys: string[]; }
interface ShortcutGroup { group: string; items: ShortcutItem[]; }

@Component({
  selector: 'app-modeler',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './modeler.component.html',
  styleUrls: ['./modeler.component.scss'],
})
export class ModelerComponent implements OnInit, OnDestroy {

  // ViewChild setter — fires when *ngIf="!loading" puts element in DOM
  @ViewChild('cyContainer')
  set cyContainerRef(el: ElementRef<HTMLDivElement> | undefined) {
    if (el && !this.cy) {
      this._cyRef = el;
      setTimeout(() => this.initCy(), 0);
    }
  }
  private _cyRef!: ElementRef<HTMLDivElement>;

  // ── State ──────────────────────────────────────────────────────────────────
  project!: Project;
  graph: ProjectGraph = { nodes: [], edges: [] };
  templates: NodeTemplate[] = [];
  readonly paletteNodeTypes: NodeType[] = [
    'server', 'database', 'application', 'api', 'firewall',
    'network', 'router', 'switch', 'cloud', 'service',
    'workstation', 'user', 'vm', 'container',
  ];
  // Mirrors backend DEPLOYABLE_TYPES: VM_TYPES (incl. firewall) + container + network bridge
  readonly deployableTypes = new Set<NodeType>(['server', 'application', 'database', 'workstation', 'vm', 'firewall', 'container', 'network']);
  nodeIcons = NODE_ICONS.filter(icon => this.paletteNodeTypes.includes(icon.type));
  loading = true;
  saving  = false;
  error   = '';

  // ── Canvas ─────────────────────────────────────────────────────────────────
  private cy!: Core;
  connectSource: string | null = null;
  mode: InteractionMode = 'select';

  // ── Selection ──────────────────────────────────────────────────────────────
  selectedNode: SiNode | null = null;
  selectedEdge: SiEdge | null = null;
  rightPanel: RightPanel = 'properties';

  // ── Node properties form ───────────────────────────────────────────────────
  nodeForm: Record<string, any> = {};
  nodeLabel   = '';
  propFields: PropertyField[] = [];
  customKey   = '';
  customValue = '';

  // ── Edge form ──────────────────────────────────────────────────────────────
  edgeLabel  = '';
  edgeType: EdgeType = 'network';
  savingEdge = false;
  readonly edgeTypes: EdgeType[] = [
    'network', 'dependency', 'data_flow', 'hosts',
    'vpn', 'api_call', 'replication', 'unknown',
  ];
  readonly edgeTypeLabels: Record<EdgeType, string> = {
    network:     'Réseau',
    dependency:  'Dépendance',
    data_flow:   'Flux de données',
    hosts:       'Héberge',
    vpn:         'VPN',
    api_call:    'Appel API',
    replication: 'Réplication',
    unknown:     'Autre',
  };

  // ── Template form ──────────────────────────────────────────────────────────
  newTplName = '';
  savingTpl  = false;

  // ── Delete confirm modal ───────────────────────────────────────────────────
  showDeleteConfirm    = false;
  deleteConfirmLabel   = '';
  private deleteConfirmAction: (() => void) | null = null;

  // ── Quick-add modal ────────────────────────────────────────────────────────
  showQuickAdd  = false;
  quickAddIdx   = 0;

  // ── Deploy modal ──────────────────────────────────────────────────────────
  showDeployModal  = false;
  deployTab: 'docker' | 'proxmox' = 'docker';

  // Docker Desktop
  deployLoading    = false;
  deployRunning    = false;
  deployEnabled    = false;
  deployCompose    = '';
  deployProjectKey = '';
  deployOutput     = '';
  deployError      = '';
  deployContainers: DockerStatusContainer[] = [];

  // Proxmox / Terraform
  tfLoading          = false;
  tfRunning          = false;
  tfHcl              = '';
  tfDeployableCount  = 0;
  tfSkippedTypes:    string[] = [];
  tfOutput           = '';
  tfError            = '';

  // Proxmox config modal
  showProxmoxConfigModal = false;
  proxmoxConfig: ProxmoxConfigPublic | null = null;
  proxmoxConfigLoading = false;
  proxmoxConfigSaving  = false;
  proxmoxConfigError   = '';
  proxmoxConfigForm: ProxmoxConfigInput & { credential_mode: 'token' | 'password' } = {
    endpoint: '',
    username: 'terraform-prov@pve',
    api_token: '',
    password: '',
    node: 'pve',
    template_vm_id: 9000,
    storage: 'local-lvm',
    gateway: '192.168.1.1',
    lxc_template: 'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst',
    credential_mode: 'token',
  };

  // ── Keyboard help modal ────────────────────────────────────────────────────
  showHelp = false;
  readonly shortcuts: ShortcutGroup[] = [
    {
      group: 'Modes', items: [
        { label: 'Mode sélection',      keys: ['S'] },
        { label: 'Mode connexion',      keys: ['C'] },
      ],
    },
    {
      group: 'Navigation', items: [
        { label: 'Ajouter un composant', keys: ['A'] },
        { label: 'Nœud suivant',         keys: ['Tab'] },
        { label: 'Nœud précédent',       keys: ['Maj', 'Tab'] },
        { label: 'Ajuster la vue',       keys: ['F'] },
        { label: 'Recalculer layout',    keys: ['L'] },
        { label: 'Déplacer nœud',        keys: ['↑ ↓ ← →'] },
        { label: 'Déplacer (rapide)',    keys: ['Maj', '↑ ↓ ← →'] },
      ],
    },
    {
      group: 'Actions', items: [
        { label: 'Supprimer sélection', keys: ['Suppr'] },
        { label: 'Désélectionner',      keys: ['Échap'] },
      ],
    },
    {
      group: 'Interface', items: [
        { label: 'Aide / Raccourcis',   keys: ['Ctrl', 'Maj' ,'/'] },
        { label: 'Fermer modal',        keys: ['Échap'] },
      ],
    },
  ];

  // ── Safe HTML icon cache (bypasses Angular sanitizer for inline SVG) ───────
  private iconCache: Record<string, SafeHtml> = {};

  // ── Theme subscription (re-apply Cytoscape styles on theme change) ─────────
  private themeSub!: Subscription;


  readonly projectId: string;

  // Capture-phase keyboard handler (must be an arrow fn for removeEventListener)
  private readonly keyHandler = (e: KeyboardEvent) => this.onKey(e);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    readonly theme: ThemeService,
    readonly auth: AuthService,
    private sanitizer: DomSanitizer,
  ) {
    this.projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
  }

  ngOnInit(): void {
    // Capture phase ensures we see keydown before Cytoscape or browser consume it
    document.addEventListener('keydown', this.keyHandler, { capture: true });
    // Re-apply Cytoscape styles whenever theme changes (fix DT-03)
    this.themeSub = this.theme.isDark$.subscribe(() => {
      this.cy?.style(this.cyStyle()).update();
    });
    this.loadAll();
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.keyHandler, { capture: true });
    this.themeSub?.unsubscribe();
    this.cy?.destroy();
  }

  // ── Load ────────────────────────────────────────────────────────────────────

  loadAll(): void {
    this.loading = true;
    Promise.all([
      this.api.getProject(this.projectId).toPromise(),
      this.api.getProjectGraph(this.projectId).toPromise(),
      this.api.getTemplates().toPromise(),
    ]).then(([project, graph, templates]) => {
      this.project   = project!;
      this.graph     = graph!;
      this.templates = templates ?? [];
      this.loading   = false;
    }).catch(e => { this.error = e.message; this.loading = false; });
  }

  // ── Cytoscape ────────────────────────────────────────────────────────────────

  private initCy(): void {
    this.cy = cytoscape({
      container: this._cyRef.nativeElement,
      style: this.cyStyle(),
      layout: { name: 'preset' },
      wheelSensitivity: 0.3,
      boxSelectionEnabled: false,
    });

    this.cy.on('tap', 'node', (evt) => this.onNodeTap(evt.target as NodeSingular));
    this.cy.on('tap', 'edge', (evt) => this.onEdgeTap(evt.target as EdgeSingular));
    this.cy.on('tap', (evt)  => { if (evt.target === this.cy) this.clearSelection(); });
    this.cy.on('dragfree', 'node', (evt) => this.onNodeMoved(evt.target as NodeSingular));

    this.renderGraph();
  }

  private nodeSvgUri(type: string): string {
    const icon  = NODE_ICONS.find(i => i.type === type);
    const color = icon?.color ?? '#8b949e';
    const path  = icon?.svgPath ?? '';
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"` +
      ` fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"` +
      ` stroke-linejoin="round">${path}</svg>`,
    )}`;
  }

  private nodeColor(type: string): string {
    return NODE_ICONS.find(i => i.type === type)?.color ?? '#8b949e';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cyStyle(): any[] {
    const dark = this.theme.isDark;
    return [
      {
        selector: 'node',
        style: {
          'width': 44, 'height': 44,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          'background-color':  (ele: any) => this.nodeColor(ele.data('nodeType')),
          'background-opacity': 0.15,
          'border-width': 2,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          'border-color':      (ele: any) => this.nodeColor(ele.data('nodeType')),
          'label': 'data(label)',
          'color': dark ? '#e6edf3' : '#24292f',
          'text-valign': 'bottom',
          'text-halign': 'center',
          'font-size': '11px',
          'text-margin-y': 6,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          'background-image':             (ele: any) => this.nodeSvgUri(ele.data('nodeType')),
          'background-image-containment': 'inside',
          'background-image-opacity':     1,
          'background-fit':   'contain',
          'background-clip':  'node',
        },
      },
      { selector: 'node:selected',       style: { 'border-width': 3, 'border-color': '#58a6ff', 'background-opacity': 0.25 } },
      { selector: 'node.connect-source', style: { 'border-color': '#3fb950', 'border-width': 3 } },
      {
        selector: 'edge',
        style: {
          'width': 1.5,
          'line-color':          dark ? '#30363d' : '#d0d7de',
          'target-arrow-color':  dark ? '#30363d' : '#d0d7de',
          'target-arrow-shape':  'triangle',
          'curve-style':         'bezier',
          'label':               'data(label)',
          'font-size':           '10px',
          'color':               '#8b949e',
          'text-background-color':   dark ? '#161b22' : '#f6f8fa',
          'text-background-opacity': 0.9,
          'text-background-padding': '2px',
        },
      },
      { selector: 'edge:selected', style: { 'line-color': '#58a6ff', 'target-arrow-color': '#58a6ff' } },
    ];
  }

  renderGraph(): void {
    if (!this.cy) return;
    this.cy.elements().remove();

    const elems: ElementDefinition[] = [
      ...this.graph.nodes.map(n => ({
        data:     { id: n.id, label: n.label, nodeType: n.type },
        position: { x: n.position_x || 0, y: n.position_y || 0 },
      })),
      ...this.graph.edges.map(e => ({
        data: { id: e.id, source: e.source_node_id, target: e.target_node_id, label: e.label ?? '' },
      })),
    ];

    this.cy.add(elems);
    const hasPos = this.graph.nodes.some(n => n.position_x !== 0 || n.position_y !== 0);
    if (!hasPos && this.graph.nodes.length > 0) {
      this.cy.layout({ name: 'cose', animate: false } as cytoscape.LayoutOptions).run();
    }
    this.cy.fit(undefined, 60);
  }

  // ── Node interactions ─────────────────────────────────────────────────────

  private onNodeTap(node: NodeSingular): void {
    if (this.mode === 'connect') {
      this.handleConnectNode(node.id());
      return;
    }
    this.selectedEdge = null;
    const found = this.graph.nodes.find(n => n.id === node.id());
    if (found) this.selectNode(found);
  }

  /** Shared connect logic — used by mouse tap AND keyboard Enter/Space */
  private handleConnectNode(nodeId: string): void {
    if (!this.connectSource) {
      this.connectSource = nodeId;
      this.cy.$(`#${nodeId}`).addClass('connect-source');
    } else if (this.connectSource !== nodeId) {
      this.doConnect(this.connectSource, nodeId);
      this.cy.$(`#${this.connectSource}`).removeClass('connect-source');
      this.connectSource = null;
      this.mode = 'select';
    }
  }

  private onEdgeTap(edge: EdgeSingular): void {
    this.selectedNode = null;
    const found = this.graph.edges.find(e => e.id === edge.id()) ?? null;
    this.selectedEdge = found;
    if (found) {
      this.edgeLabel = found.label ?? '';
      this.edgeType  = found.type as EdgeType ?? 'network';
    }
    this.rightPanel = 'properties';
  }

  private onNodeMoved(node: NodeSingular): void {
    const pos = node.position();
    this.api.updateNode(this.projectId, node.id(), { position_x: pos.x, position_y: pos.y }).subscribe();
    const local = this.graph.nodes.find(n => n.id === node.id());
    if (local) { local.position_x = pos.x; local.position_y = pos.y; }
  }

  selectNode(n: SiNode): void {
    this.selectedNode = n;
    this.nodeLabel    = n.label;
    this.nodeForm     = { ...n.properties };
    if (n.type === 'application') {
      this.normalizeApplicationForm();
    }
    this.propFields   = NODE_SCHEMAS[n.type] ?? NODE_SCHEMAS['unknown'];
    this.rightPanel   = 'properties';
  }

  private normalizeApplicationForm(): void {
    const legacyRepo = this.nodeForm['repo'];
    if (this.nodeForm['github_repo'] === undefined && typeof legacyRepo === 'string' && legacyRepo.trim()) {
      this.nodeForm['github_repo'] = legacyRepo.trim();
    }

    const legacyDockerPort = this.nodeForm['port'];
    if (this.nodeForm['docker_port'] === undefined && typeof legacyDockerPort === 'number') {
      this.nodeForm['docker_port'] = legacyDockerPort;
    }

    const legacyExposePort = this.nodeForm['host_port'];
    if (this.nodeForm['expose_port'] === undefined && typeof legacyExposePort === 'number') {
      this.nodeForm['expose_port'] = legacyExposePort;
    }

    // Remove legacy/unwanted fields for Github App nodes.
    delete this.nodeForm['zone'];
    delete this.nodeForm['url'];
    delete this.nodeForm['language'];
    delete this.nodeForm['framework'];
    delete this.nodeForm['environment'];
    delete this.nodeForm['repo'];
    delete this.nodeForm['port'];
    delete this.nodeForm['host_port'];
    delete this.nodeForm['publish_port'];
  }

  clearSelection(): void {
    this.selectedNode = null;
    this.selectedEdge = null;
    if (this.connectSource) {
      this.cy.$(`#${this.connectSource}`).removeClass('connect-source');
      this.connectSource = null;
    }
    this.mode = 'select';
    // Remove Cytoscape visual selection (blue ring)
    this.cy?.elements().unselect();
  }

  // ── Drag & drop from palette ───────────────────────────────────────────────

  onCanvasDragOver(event: DragEvent): void { event.preventDefault(); }

  onCanvasDrop(event: DragEvent): void {
    event.preventDefault();
    if (!this.cy) return;

    const nodeType     = event.dataTransfer?.getData('nodeType') as NodeType | undefined;
    const fromTemplate = event.dataTransfer?.getData('templateId');

    const rect = this._cyRef.nativeElement.getBoundingClientRect();
    const pan  = this.cy.pan();
    const zoom = this.cy.zoom();
    const x    = (event.clientX - rect.left  - pan.x) / zoom;
    const y    = (event.clientY - rect.top   - pan.y) / zoom;

    if (fromTemplate) {
      const tpl = this.templates.find(t => t.id === fromTemplate);
      if (tpl) this.addNodeFromTemplate(tpl, x, y);
      return;
    }
    if (nodeType) this.addNode(nodeType, x, y);
  }

  onPaletteDragStart(event: DragEvent, type: NodeType): void {
    event.dataTransfer?.setData('nodeType', type);
  }

  onTemplateDragStart(event: DragEvent, tpl: NodeTemplate): void {
    event.dataTransfer?.setData('templateId', String(tpl.id));
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  addNode(type: NodeType, x = 200, y = 200, overrides?: Partial<SiNode>): void {
    const icon  = NODE_ICONS.find(i => i.type === type);
    const label = overrides?.label ?? (icon?.label ?? type);

    this.api.createNode(this.projectId, {
      label, type,
      properties: overrides?.properties ?? {},
      position_x: x, position_y: y,
    }).subscribe({
      next: (node) => {
        this.graph.nodes.push(node);
        this.cy.add({ data: { id: node.id, label: node.label, nodeType: node.type }, position: { x, y } });
        this.selectNode(node);
      },
    });
  }

  addNodeFromTemplate(tpl: NodeTemplate, x: number, y: number): void {
    this.addNode(tpl.type as NodeType, x, y, { label: tpl.name, properties: { ...tpl.properties } });
  }

  /** Add node at canvas center (used by quick-add modal) */
  addNodeAtCenter(type: NodeType): void {
    this.showQuickAdd = false;
    if (!this.cy) { this.addNode(type); return; }
    const ext  = this.cy.extent();
    const x    = (ext.x1 + ext.x2) / 2;
    const y    = (ext.y1 + ext.y2) / 2;
    this.addNode(type, x, y);
  }

  saveNode(): void {
    if (!this.selectedNode) return;
    if (this.selectedNode.type === 'application') {
      this.normalizeApplicationForm();
    }
    this.saving = true;
    this.api.updateNode(this.projectId, this.selectedNode.id, {
      label: this.nodeLabel, properties: { ...this.nodeForm },
    }).subscribe({
      next: (updated) => {
        Object.assign(this.selectedNode!, updated);
        this.graph.nodes = this.graph.nodes.map(n => n.id === updated.id ? updated : n);
        this.cy.$(`#${updated.id}`).data('label', updated.label);
        this.saving = false;
      },
      error: () => { this.saving = false; },
    });
  }

  saveEdge(): void {
    if (!this.selectedEdge) return;
    this.savingEdge = true;
    this.api.updateEdge(this.projectId, this.selectedEdge.id, {
      label: this.edgeLabel,
      type:  this.edgeType,
    }).subscribe({
      next: (updated) => {
        Object.assign(this.selectedEdge!, updated);
        this.graph.edges = this.graph.edges.map(e => e.id === updated.id ? updated : e);
        this.cy.$(`#${updated.id}`).data('label', updated.label ?? '');
        this.savingEdge = false;
      },
      error: () => { this.savingEdge = false; },
    });
  }

  deleteNode(): void {
    if (!this.selectedNode) return;
    this.openDeleteConfirm(this.selectedNode.label, () => {
      const id = this.selectedNode!.id;
      this.api.deleteNode(this.projectId, id).subscribe({
        next: () => {
          this.graph.nodes = this.graph.nodes.filter(n => n.id !== id);
          this.graph.edges = this.graph.edges.filter(
            e => e.source_node_id !== id && e.target_node_id !== id,
          );
          this.cy.remove(`#${id}`);
          this.clearSelection();
        },
      });
    });
  }

  deleteEdge(): void {
    if (!this.selectedEdge) return;
    const src = this.graph.nodes.find(n => n.id === this.selectedEdge!.source_node_id)?.label ?? '?';
    const tgt = this.graph.nodes.find(n => n.id === this.selectedEdge!.target_node_id)?.label ?? '?';
    this.openDeleteConfirm(`${src} → ${tgt}`, () => {
      const id = this.selectedEdge!.id;
      this.api.deleteEdge(this.projectId, id).subscribe({
        next: () => {
          this.graph.edges = this.graph.edges.filter(e => e.id !== id);
          this.cy.remove(`#${id}`);
          this.selectedEdge = null;
        },
      });
    });
  }

  private doConnect(sourceId: string, targetId: string): void {
    this.api.createEdge(this.projectId, { source_node_id: sourceId, target_node_id: targetId, type: 'network' })
      .subscribe({
        next: (edge) => {
          this.graph.edges.push(edge);
          this.cy.add({ data: { id: edge.id, source: edge.source_node_id, target: edge.target_node_id, label: '' } });
        },
      });
  }

  // ── Delete confirm modal ───────────────────────────────────────────────────

  openDeleteConfirm(label: string, action: () => void): void {
    this.deleteConfirmLabel  = label;
    this.deleteConfirmAction = action;
    this.showDeleteConfirm   = true;
  }

  confirmDelete(): void {
    this.deleteConfirmAction?.();
    this.showDeleteConfirm   = false;
    this.deleteConfirmAction = null;
  }

  cancelDelete(): void {
    this.showDeleteConfirm   = false;
    this.deleteConfirmAction = null;
  }

  // ── Custom properties ──────────────────────────────────────────────────────

  addCustomProp(): void {
    if (!this.customKey.trim()) return;
    this.nodeForm[this.customKey.trim()] = this.customValue;
    this.customKey = ''; this.customValue = '';
  }

  removeProp(key: string): void { delete this.nodeForm[key]; }

  customProps(): [string, unknown][] {
    if (!this.selectedNode) return [];
    const schemaKeys = new Set((NODE_SCHEMAS[this.selectedNode.type] ?? []).map(f => f.key));
    return Object.entries(this.nodeForm).filter(([k]) => !schemaKeys.has(k));
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  saveAsTemplate(): void {
    if (!this.selectedNode || !this.newTplName.trim()) return;
    this.savingTpl = true;
    this.api.createTemplate({
      name: this.newTplName.trim(),
      type: this.selectedNode.type,
      properties: { ...this.nodeForm },
    }).subscribe({
      next:  (t) => { this.templates.push(t); this.newTplName = ''; this.savingTpl = false; },
      error: () => { this.savingTpl = false; },
    });
  }

  deleteTemplate(id: string): void {
    this.api.deleteTemplate(id).subscribe({
      next: () => { this.templates = this.templates.filter(t => t.id !== id); },
    });
  }

  // ── Keyboard shortcuts (capture phase — registered in ngOnInit) ────────────

  private onKey(e: KeyboardEvent): void {
    // ── Ctrl+/ : toggle help (global, highest priority) ──
    if (e.ctrlKey && (e.key === '/' || e.code === 'Slash')) {
      e.preventDefault();
      e.stopPropagation();
      this.showHelp = !this.showHelp;
      return;
    }

    // ── Escape : close modals in priority order ──
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (this.showHelp)              { this.showHelp = false; return; }
      if (this.showDeleteConfirm)     { this.cancelDelete(); return; }
      if (this.showQuickAdd)          { this.showQuickAdd = false; return; }
      if (this.showProxmoxConfigModal){ this.showProxmoxConfigModal = false; return; }
      if (this.showDeployModal)       { this.showDeployModal = false; return; }
      this.clearSelection();
      return;
    }

    // ── Enter in quick-add ──
    if (e.key === 'Enter' && this.showQuickAdd) {
      e.preventDefault();
      e.stopPropagation();
      this.addNodeAtCenter(this.nodeIcons[this.quickAddIdx].type);
      return;
    }

    // ── Arrow keys in quick-add ──
    if (this.showQuickAdd && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      e.stopPropagation();
      const len = this.nodeIcons.length;
      this.quickAddIdx = e.key === 'ArrowDown'
        ? (this.quickAddIdx + 1) % len
        : (this.quickAddIdx - 1 + len) % len;
      return;
    }

    // ── Block modifier combos (Ctrl/Meta + any key) from reaching shortcuts ──
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // ── Block when typing in a form field ──
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    switch (e.key) {
      case 's': case 'S':
        e.preventDefault();
        this.mode = 'select';
        break;

      case 'c': case 'C':
        e.preventDefault();
        this.mode = 'connect';
        break;

      case 'f': case 'F':
        e.preventDefault();
        this.fitView();
        break;

      case 'l': case 'L':
        e.preventDefault();
        this.resetLayout();
        break;

      case 'a': case 'A':
        e.preventDefault();
        this.quickAddIdx  = 0;
        this.showQuickAdd = true;
        break;

      // Connect mode: Enter or Space confirms the currently focused node as source/target
      case 'Enter': case ' ':
        if (this.mode === 'connect' && this.selectedNode) {
          e.preventDefault();
          this.handleConnectNode(this.selectedNode.id);
        }
        break;

      case 'Delete': case 'Backspace':
        if (this.selectedNode) { e.preventDefault(); this.deleteNode(); }
        else if (this.selectedEdge) { e.preventDefault(); this.deleteEdge(); }
        break;

      case 'Tab':
        e.preventDefault();
        this.selectNextNode(e.shiftKey);
        break;

      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        if (this.selectedNode) {
          e.preventDefault();
          const step = e.shiftKey ? 20 : 5;
          const dx   = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy   = e.key === 'ArrowUp'   ? -step : e.key === 'ArrowDown'  ? step : 0;
          this.moveSelectedNode(dx, dy);
        }
        break;
    }
  }

  private selectNextNode(reverse = false): void {
    if (this.graph.nodes.length === 0) return;
    const nodes = this.graph.nodes;
    const idx   = this.selectedNode ? nodes.findIndex(n => n.id === this.selectedNode!.id) : -1;
    const next  = reverse
      ? (idx <= 0 ? nodes.length - 1 : idx - 1)
      : (idx >= nodes.length - 1 ? 0 : idx + 1);
    const target = nodes[next];
    this.cy.elements().unselect();
    this.cy.$(`#${target.id}`).select();
    this.selectNode(target);
    this.cy.animate({ center: { eles: this.cy.$(`#${target.id}`) }, duration: 150 });
  }

  private moveSelectedNode(dx: number, dy: number): void {
    if (!this.selectedNode) return;
    const cyNode = this.cy.$(`#${this.selectedNode.id}`);
    const pos    = cyNode.position();
    cyNode.position({ x: pos.x + dx, y: pos.y + dy });
    this.onNodeMoved(cyNode as unknown as NodeSingular);
  }

  // ── Icon helpers ──────────────────────────────────────────────────────────

  /**
   * Returns sanitized SafeHtml for inline SVG icons.
   * Angular strips <svg> from [innerHTML] without bypassSecurityTrustHtml.
   */
  safeIcon(type: string, size = 18): SafeHtml {
    const key = `${type}-${size}`;
    if (!this.iconCache[key]) {
      this.iconCache[key] = this.sanitizer.bypassSecurityTrustHtml(svgIcon(type, size));
    }
    return this.iconCache[key];
  }

  // ── Misc helpers ──────────────────────────────────────────────────────────

  getIcon(type: string): IconEntry  { return NODE_ICONS.find(i => i.type === type) ?? NODE_ICONS[0]; }
  getNodeLabel(id: string): string  { return this.graph.nodes.find(n => n.id === id)?.label ?? id; }
  svgIcon(type: string, size = 16): string { return svgIcon(type, size); }
  fitView(): void                   { this.cy?.fit(undefined, 60); }
  resetLayout(): void {
    if (!this.cy) return;
    this.cy.layout({ name: 'cose', animate: true } as cytoscape.LayoutOptions).run();
  }
  trackById(_: number, item: { id: string }): string { return item.id; }
  getTemplatesByType(type: string): NodeTemplate[] { return this.templates.filter(t => t.type === type); }

  // ── Docker deploy helpers ──────────────────────────────────────────────────

  openDeployModal(): void {
    this.showDeployModal = true;
    if (this.deployTab === 'docker')  this.refreshDeployPreview();
    else { this.refreshProxmoxConfigStatus(); this.loadTerraformPreview(); }
  }

  switchDeployTab(tab: 'docker' | 'proxmox'): void {
    this.deployTab = tab;
    if (tab === 'docker')  this.refreshDeployPreview();
    if (tab === 'proxmox') { this.refreshProxmoxConfigStatus(); this.loadTerraformPreview(); }
  }

  private refreshProxmoxConfigStatus(): void {
    this.api.getProxmoxConfig(this.projectId).subscribe({
      next: (resp) => { this.proxmoxConfig = resp.config; },
      error: () => { this.proxmoxConfig = null; },
    });
  }

  refreshDeployPreview(): void {
    this.deployLoading = true;
    this.deployError = '';
    this.deployOutput = '';
    this.api.getDeploymentCompose(this.projectId).subscribe({
      next: (preview) => {
        this.deployCompose = preview.compose;
        this.deployProjectKey = preview.project_key;
        this.deployEnabled = preview.docker_enabled;
        this.deployLoading = false;
        this.refreshDeployStatus();
      },
      error: (err) => {
        this.deployLoading = false;
        this.deployError = err?.error?.error ?? 'Impossible de générer le docker-compose';
      },
    });
  }

  refreshDeployStatus(): void {
    this.api.getDeploymentStatus(this.projectId).subscribe({
      next: (status) => {
        this.deployContainers = status.containers;
        this.deployEnabled = status.docker_enabled;
      },
      error: (err) => {
        this.deployContainers = [];
        this.deployError = err?.error?.error ?? 'Impossible de récupérer le statut Docker';
      },
    });
  }

  deployUp(): void {
    this.deployRunning = true;
    this.deployError = '';
    this.api.deployProjectUp(this.projectId).subscribe({
      next: (result) => {
        this.deployRunning = false;
        this.deployOutput = [
          result.command,
          result.stdout,
          result.stderr,
        ].filter(Boolean).join('\n\n');
        this.refreshDeployStatus();
      },
      error: (err) => {
        this.deployRunning = false;
        const payload = err?.error;
        if (payload?.command || payload?.stdout || payload?.stderr) {
          this.deployOutput = [
            payload.command,
            payload.stdout,
            payload.stderr,
          ].filter(Boolean).join('\n\n');
        }
        this.deployError = payload?.error ?? 'Echec du déploiement Docker';
      },
    });
  }

  deployDown(): void {
    this.deployRunning = true;
    this.deployError = '';
    this.api.deployProjectDown(this.projectId).subscribe({
      next: (result) => {
        this.deployRunning = false;
        this.deployOutput = [
          result.command,
          result.stdout,
          result.stderr,
        ].filter(Boolean).join('\n\n');
        this.refreshDeployStatus();
      },
      error: (err) => {
        this.deployRunning = false;
        const payload = err?.error;
        if (payload?.command || payload?.stdout || payload?.stderr) {
          this.deployOutput = [
            payload.command,
            payload.stdout,
            payload.stderr,
          ].filter(Boolean).join('\n\n');
        }
        this.deployError = payload?.error ?? 'Echec de l arrêt Docker';
      },
    });
  }

  // ── Terraform / Proxmox helpers ────────────────────────────────────────────

  loadTerraformPreview(): void {
    this.tfLoading = true;
    this.tfError   = '';
    this.api.terraformPreview(this.projectId).subscribe({
      next: (p) => {
        this.tfHcl             = p.hcl;
        this.tfDeployableCount = p.deployable_count;
        this.tfSkippedTypes    = p.skipped_types;
        this.tfLoading         = false;
      },
      error: (err) => {
        this.tfLoading = false;
        this.tfError   = err?.error?.error ?? 'Impossible de générer le HCL Terraform';
      },
    });
  }

  terraformPlan(): void {
    this.tfRunning = true; this.tfError = ''; this.tfOutput = '';
    this.api.terraformPlan(this.projectId).subscribe({
      next:  (r) => { this.tfRunning = false; this.tfOutput = r.output; if (!r.success) this.tfError = this.humanizeTfError(r.error ?? 'Plan échoué'); },
      error: (err) => { this.tfRunning = false; this.tfError = this.humanizeTfError(err?.error?.error ?? 'Echec du terraform plan'); },
    });
  }

  terraformApply(): void {
    this.tfRunning = true; this.tfError = ''; this.tfOutput = '';
    this.api.terraformApply(this.projectId).subscribe({
      next:  (r) => { this.tfRunning = false; this.tfOutput = r.output; if (!r.success) this.tfError = this.humanizeTfError(r.error ?? 'Apply échoué'); },
      error: (err) => { this.tfRunning = false; this.tfError = this.humanizeTfError(err?.error?.error ?? 'Echec du terraform apply'); },
    });
  }

  /**
   * Translates raw Terraform/Proxmox error messages into actionable user messages.
   * Covers the most common connectivity failures when running terraform plan/apply.
   */
  private humanizeTfError(raw: string): string {
    const s = raw.toLowerCase();
    // Network unreachable — most common: wrong port (443 instead of 8006)
    if (s.includes('connection refused') || s.includes('econnrefused') || s.includes('connect: connection refused') || s.includes('no such host') || s.includes('unreachable') || s.includes('injoignable'))
      return `❌ Proxmox injoignable — endpoint incorrect ou service arrêté.\n` +
             `→ L'endpoint DOIT inclure le port :8006 — ex: https://192.168.1.92:8006\n` +
             `→ Ouvrez "Config Proxmox" et corrigez l'URL.\nDétail: ${raw.slice(0, 200)}`;
    // fetch() network error (no connectivity at all)
    if (s.includes('fetch failed') || s.includes('failed to fetch') || s.includes('network error'))
      return `❌ Connexion réseau impossible vers Proxmox.\n` +
             `→ Vérifiez l'endpoint (format: https://IP:8006)\n` +
             `→ Vérifiez que Proxmox est démarré et accessible depuis le container Blueprint.\nDétail: ${raw.slice(0, 200)}`;
    if (s.includes('certificate') || s.includes('x509') || s.includes('tls'))
      return `❌ Erreur TLS/certificat — connexion chiffrée refusée.\nDétail: ${raw.slice(0, 200)}`;
    if (s.includes('401') || s.includes('unauthorized') || s.includes('invalid credentials') || s.includes('permission denied'))
      return `❌ Credentials Proxmox incorrects — vérifiez le token API ou le mot de passe.\nDétail: ${raw.slice(0, 200)}`;
    if (s.includes('timeout') || s.includes('context deadline exceeded'))
      return `❌ Timeout Proxmox — opération trop longue ou endpoint lent.\nDétail: ${raw.slice(0, 200)}`;
    if (s.includes('no deployable'))
      return '❌ Aucun nœud déployable — ajoutez un serveur, VM, container, firewall ou réseau.';
    return raw;
  }

  /** Returns true if the value matches the given regex pattern string. */
  isPatternValid(pattern: string, value: unknown): boolean {
    if (value === undefined || value === null || value === '') return true;
    try { return new RegExp(pattern).test(String(value)); }
    catch { return true; }
  }

  terraformDestroyConfirm(): void {
    this.openDeleteConfirm(
      `Détruire toutes les ressources Proxmox du projet "${this.project.name}" ?`,
      () => this.terraformDestroy(),
    );
  }

  private terraformDestroy(): void {
    this.tfRunning = true; this.tfError = ''; this.tfOutput = '';
    this.api.terraformDestroy(this.projectId).subscribe({
      next:  (r) => { this.tfRunning = false; this.tfOutput = r.output; if (!r.success) this.tfError = this.humanizeTfError(r.error ?? 'Destroy échoué'); },
      error: (err) => { this.tfRunning = false; this.tfError = this.humanizeTfError(err?.error?.error ?? 'Echec du terraform destroy'); },
    });
  }

  // ── Proxmox config modal ──────────────────────────────────────────────────

  openProxmoxConfigModal(): void {
    this.showProxmoxConfigModal = true;
    this.proxmoxConfigError     = '';
    this.proxmoxConfigLoading   = true;
    this.api.getProxmoxConfig(this.projectId).subscribe({
      next: (resp) => {
        this.proxmoxConfig        = resp.config;
        this.proxmoxConfigLoading = false;
        if (resp.config) {
          this.proxmoxConfigForm = {
            endpoint:        resp.config.endpoint,
            username:        resp.config.username,
            api_token:       '',
            password:        '',
            node:            resp.config.node,
            template_vm_id:  resp.config.template_vm_id,
            storage:         resp.config.storage,
            gateway:         resp.config.gateway,
            lxc_template:    resp.config.lxc_template,
            credential_mode: resp.config.has_api_token ? 'token' : 'password',
          };
        } else {
          this.proxmoxConfigForm = {
            endpoint:        '',
            username:        'terraform-prov@pve',
            api_token:       '',
            password:        '',
            node:            'pve',
            template_vm_id:  9000,
            storage:         'local-lvm',
            gateway:         '192.168.1.1',
            lxc_template:    'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst',
            credential_mode: 'token',
          };
        }
      },
      error: (err) => {
        this.proxmoxConfigLoading = false;
        this.proxmoxConfigError   = err?.error?.error ?? 'Impossible de charger la config Proxmox';
      },
    });
  }

  saveProxmoxConfig(): void {
    this.proxmoxConfigSaving = true;
    this.proxmoxConfigError  = '';
    const f = this.proxmoxConfigForm;
    const payload: ProxmoxConfigInput = {
      endpoint:       f.endpoint.trim(),
      username:       f.username.trim(),
      node:           f.node?.trim() || 'pve',
      template_vm_id: Number(f.template_vm_id) || 9000,
      storage:        f.storage?.trim() || 'local-lvm',
      gateway:        f.gateway?.trim() || '192.168.1.1',
      lxc_template:   f.lxc_template?.trim() || 'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst',
    };
    // Only send the credential the user selected — leaves the other cleared.
    if (f.credential_mode === 'token') {
      payload.api_token = f.api_token?.trim() || null;
      payload.password  = null;
    } else {
      payload.password  = f.password?.trim() || null;
      payload.api_token = null;
    }
    this.api.upsertProxmoxConfig(this.projectId, payload).subscribe({
      next: (saved) => {
        this.proxmoxConfigSaving = false;
        this.proxmoxConfig       = saved;
        this.showProxmoxConfigModal = false;
        // refresh HCL preview with the fresh config
        this.loadTerraformPreview();
      },
      error: (err) => {
        this.proxmoxConfigSaving = false;
        this.proxmoxConfigError  = err?.error?.error ?? 'Echec enregistrement config Proxmox';
      },
    });
  }

  deleteProxmoxConfig(): void {
    this.api.deleteProxmoxConfig(this.projectId).subscribe({
      next: () => {
        this.proxmoxConfig = null;
        this.showProxmoxConfigModal = false;
      },
      error: (err) => {
        this.proxmoxConfigError = err?.error?.error ?? 'Echec suppression config';
      },
    });
  }
}
