import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { Project } from '../../domain/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  projects: Project[] = [];
  loading   = true;
  error     = '';
  creating  = false;
  showModal = false;

  // ── New project form state ─────────────────────────────────────────────────
  newName  = '';
  newDesc  = '';
  newColor = '#58a6ff';
  newTags  = '';

  // ── Delete confirm state ───────────────────────────────────────────────────
  showDeleteConfirm    = false;
  deleteConfirmLabel   = '';
  private pendingDelete: Project | null = null;

  constructor(
    private api: ApiService,
    readonly auth: AuthService,
    readonly theme: ThemeService,
    private router: Router,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.api.getProjects().subscribe({
      next:  (p) => { this.projects = p; this.loading = false; },
      error: (e) => { this.error = e.message; this.loading = false; },
    });
  }

  open(id: string): void { this.router.navigate(['/modeler', id]); }

  openModal(): void {
    this.newName  = '';
    this.newDesc  = '';
    this.newColor = '#58a6ff';
    this.newTags  = '';
    this.showModal = true;
  }

  create(): void {
    if (!this.newName.trim()) return;
    this.creating = true;
    this.api.createProject({
      name:        this.newName.trim(),
      description: this.newDesc.trim() || undefined,
      color:       this.newColor,
      tags:        this.newTags.trim() || undefined,
    }).subscribe({
      next:  (p) => this.router.navigate(['/modeler', p.id]),
      error: (e) => { this.error = e.error?.error ?? e.message; this.creating = false; },
    });
  }

  delete(p: Project, event: MouseEvent): void {
    event.stopPropagation();
    this.pendingDelete      = p;
    this.deleteConfirmLabel = p.name;
    this.showDeleteConfirm  = true;
  }

  confirmDelete(): void {
    if (!this.pendingDelete) return;
    this.api.deleteProject(this.pendingDelete.id).subscribe({ next: () => this.load() });
    this.showDeleteConfirm = false;
    this.pendingDelete     = null;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.pendingDelete     = null;
  }

  parseTags(tags?: string): string[] {
    if (!tags) return [];
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  logout(): void { this.auth.logout().subscribe(() => this.router.navigate(['/auth/login'])); }
}
