import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project, ProjectGraph, SiNode, SiEdge, NodeTemplate, NodeIconEntry, NodeType, EdgeType } from '../models/topology.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // Projects
  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>('/api/projects');
  }
  getProject(id: string): Observable<Project> {
    return this.http.get<Project>(`/api/projects/${id}`);
  }
  getProjectGraph(id: string): Observable<ProjectGraph> {
    return this.http.get<ProjectGraph>(`/api/projects/${id}/graph`);
  }
  createProject(data: { name: string; description?: string }): Observable<Project> {
    return this.http.post<Project>('/api/projects', data);
  }
  updateProject(id: string, data: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`/api/projects/${id}`, data);
  }
  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`/api/projects/${id}`);
  }

  // Nodes
  createNode(projectId: string, data: Partial<SiNode> & { label: string; type: NodeType }): Observable<SiNode> {
    return this.http.post<SiNode>(`/api/projects/${projectId}/nodes`, data);
  }
  updateNode(projectId: string, nodeId: string, data: Partial<SiNode>): Observable<SiNode> {
    return this.http.put<SiNode>(`/api/projects/${projectId}/nodes/${nodeId}`, data);
  }
  deleteNode(projectId: string, nodeId: string): Observable<void> {
    return this.http.delete<void>(`/api/projects/${projectId}/nodes/${nodeId}`);
  }

  // Edges
  createEdge(projectId: string, data: { source_node_id: string; target_node_id: string; type?: EdgeType; label?: string }): Observable<SiEdge> {
    return this.http.post<SiEdge>(`/api/projects/${projectId}/edges`, data);
  }
  deleteEdge(projectId: string, edgeId: string): Observable<void> {
    return this.http.delete<void>(`/api/projects/${projectId}/edges/${edgeId}`);
  }

  // Templates
  getTemplates(): Observable<NodeTemplate[]> {
    return this.http.get<NodeTemplate[]>('/api/templates');
  }
  createTemplate(data: { name: string; type: NodeType; properties: Record<string, unknown> }): Observable<NodeTemplate> {
    return this.http.post<NodeTemplate>('/api/templates', data);
  }
  deleteTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`/api/templates/${id}`);
  }

  // Icons registry
  getIcons(): Observable<NodeIconEntry[]> {
    return this.http.get<NodeIconEntry[]>('/api/icons');
  }
}
