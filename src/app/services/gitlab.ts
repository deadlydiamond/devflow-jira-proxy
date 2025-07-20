import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LocalStorageService } from './local-storage';
import { map } from 'rxjs/operators';

export interface GitLabBranch {
  name: string;
  commit: {
    id: string;
    short_id: string;
    title: string;
    created_at: string;
    parent_ids: string[];
    message: string;
    author_name: string;
    author_email: string;
  };
  merged: boolean;
  protected: boolean;
  developers_can_push: boolean;
  developers_can_merge: boolean;
  can_push: boolean;
  default: boolean;
  web_url: string;
}

export interface GitLabMergeRequest {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  state: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  closed_at: string | null;
  target_branch: string;
  source_branch: string;
  user_notes_count: number;
  upvotes: number;
  downvotes: number;
  author: {
    id: number;
    name: string;
    username: string;
    state: string;
    avatar_url: string;
    web_url: string;
  };
  assignees: Array<{
    id: number;
    name: string;
    username: string;
    state: string;
    avatar_url: string;
    web_url: string;
  }>;
  assignee: {
    id: number;
    name: string;
    username: string;
    state: string;
    avatar_url: string;
    web_url: string;
  } | null;
  reviewers: Array<{
    id: number;
    name: string;
    username: string;
    state: string;
    avatar_url: string;
    web_url: string;
  }>;
  source_project_id: number;
  target_project_id: number;
  labels: string[];
  work_in_progress: boolean;
  milestone: {
    id: number;
    iid: number;
    project_id: number;
    title: string;
    description: string;
    state: string;
    created_at: string;
    updated_at: string;
    due_date: string;
    start_date: string;
    web_url: string;
  } | null;
  merge_when_pipeline_succeeds: boolean;
  merge_status: string;
  sha: string;
  merge_commit_sha: string | null;
  squash_commit_sha: string | null;
  discussion_locked: boolean | null;
  should_remove_source_branch: boolean;
  force_remove_source_branch: boolean;
  reference: string;
  references: {
    short: string;
    relative: string;
    full: string;
  };
  web_url: string;
  time_stats: {
    time_estimate: number;
    total_time_spent: number;
    human_time_estimate: string | null;
    human_total_time_spent: string | null;
  };
  squash: boolean;
  task_completion_status: {
    count: number;
    completed_count: number;
  };
  has_conflicts: boolean;
  blocking_discussions_resolved: boolean;
  approvals_before_merge: number | null;
  subscribed: boolean;
  changes_count: string;
  latest_build_started_at: string | null;
  latest_build_finished_at: string | null;
  first_deployed_to_production_at: string | null;
  pipeline: {
    id: number;
    sha: string;
    ref: string;
    status: string;
    web_url: string;
  } | null;
  head_pipeline: {
    id: number;
    sha: string;
    ref: string;
    status: string;
    web_url: string;
  } | null;
  diff_refs: {
    base_sha: string;
    head_sha: string;
    start_sha: string;
  };
  merge_error: string | null;
  user: {
    can_merge: boolean;
  };
}

export interface CreateBranchRequest {
  branch: string;
  ref: string;
}

export interface CreateMergeRequestRequest {
  source_branch: string;
  target_branch: string;
  title: string;
  description?: string;
  assignee_id?: number;
  assignee_ids?: number[];
  reviewer_ids?: number[];
  labels?: string;
  remove_source_branch?: boolean;
  squash?: boolean;
  squash_commit_message?: string;
  discussion_locked?: boolean;
  allow_collaboration?: boolean;
  allow_maintainer_to_push?: boolean;
}

export interface CherryPickRequest {
  branch: string;
  commit: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GitLabService {
  private readonly http = inject(HttpClient);
  private readonly localStorage = inject(LocalStorageService);
  
  private readonly GITLAB_TOKEN_KEY = 'gitlab_token';
  private readonly GITLAB_URL_KEY = 'gitlab_url';
  private readonly GITLAB_PROJECT_ID_KEY = 'gitlab_project_id';
  private readonly DEFAULT_GITLAB_URL = 'https://gitlab.com';

  /**
   * Get the stored GitLab token from localStorage
   */
  getToken(): string | null {
    return this.localStorage.get<string>(this.GITLAB_TOKEN_KEY, undefined);
  }

  /**
   * Save GitLab token to localStorage
   */
  setToken(token: string): void {
    this.localStorage.set(this.GITLAB_TOKEN_KEY, token);
  }

  /**
   * Get the stored GitLab URL from localStorage
   */
  getGitLabUrl(): string {
    let url = this.localStorage.get<string>(this.GITLAB_URL_KEY, this.DEFAULT_GITLAB_URL) || this.DEFAULT_GITLAB_URL;
    // Ensure URL doesn't end with trailing slash
    return url.replace(/\/$/, '');
  }

  /**
   * Save GitLab URL to localStorage
   */
  setGitLabUrl(url: string): void {
    // Remove trailing slash before saving
    const cleanUrl = url.replace(/\/$/, '');
    this.localStorage.set(this.GITLAB_URL_KEY, cleanUrl);
  }

  /**
   * Get the stored GitLab project ID from localStorage
   */
  getProjectId(): string | null {
    return this.localStorage.get<string>(this.GITLAB_PROJECT_ID_KEY, undefined);
  }

  /**
   * Save GitLab project ID to localStorage
   */
  setProjectId(projectId: string): void {
    this.localStorage.set(this.GITLAB_PROJECT_ID_KEY, projectId);
  }

  /**
   * Create HTTP headers with authorization
   */
  private getHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });
  }

  /**
   * Create a new branch
   */
  createBranch(projectId: string, branch: string, ref: string): Observable<GitLabBranch> {
    const url = `${this.getGitLabUrl()}/api/v4/projects/${encodeURIComponent(projectId)}/repository/branches`;
    const body: CreateBranchRequest = { branch, ref };
    
    return this.http.post<GitLabBranch>(url, body, { headers: this.getHeaders() });
  }

  /**
   * Get list of branches for a project
   */
  getBranches(projectId: string): Observable<GitLabBranch[]> {
    const url = `${this.getGitLabUrl()}/api/v4/projects/${encodeURIComponent(projectId)}/repository/branches`;
    
    return this.http.get<GitLabBranch[]>(url, { headers: this.getHeaders() });
  }

  /**
   * Create a merge request
   */
  createMergeRequest(
    projectId: string, 
    source: string, 
    target: string, 
    title: string,
    description?: string
  ): Observable<GitLabMergeRequest> {
    const url = `${this.getGitLabUrl()}/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests`;
    const body: CreateMergeRequestRequest = {
      source_branch: source,
      target_branch: target,
      title,
      ...(description && { description })
    };
    
    return this.http.post<GitLabMergeRequest>(url, body, { headers: this.getHeaders() });
  }

  /**
   * Cherry-pick a commit
   */
  cherryPickCommit(projectId: string, branch: string, commit: string, message?: string): Observable<any> {
    const url = `${this.getGitLabUrl()}/api/v4/projects/${encodeURIComponent(projectId)}/repository/commits/${commit}/cherry_pick`;
    const body: CherryPickRequest = { branch, commit, ...(message && { message }) };
    
    return this.http.post(url, body, { headers: this.getHeaders() });
  }

  /**
   * Get merge requests for a project
   */
  getMergeRequests(projectId: string, state?: 'opened' | 'closed' | 'merged' | 'all'): Observable<GitLabMergeRequest[]> {
    let url = `${this.getGitLabUrl()}/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests`;
    if (state) {
      url += `?state=${state}`;
    }
    
    return this.http.get<GitLabMergeRequest[]>(url, { headers: this.getHeaders() });
  }

  /**
   * Get a specific merge request
   */
  getMergeRequest(projectId: string, mergeRequestIid: number): Observable<GitLabMergeRequest> {
    const url = `${this.getGitLabUrl()}/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}`;
    
    return this.http.get<GitLabMergeRequest>(url, { headers: this.getHeaders() });
  }

  /**
   * Update a merge request
   */
  updateMergeRequest(
    projectId: string, 
    mergeRequestIid: number, 
    updates: Partial<CreateMergeRequestRequest>
  ): Observable<GitLabMergeRequest> {
    const url = `${this.getGitLabUrl()}/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}`;
    
    return this.http.put<GitLabMergeRequest>(url, updates, { headers: this.getHeaders() });
  }

  /**
   * Close a merge request
   */
  closeMergeRequest(projectId: string, mergeRequestIid: number): Observable<GitLabMergeRequest> {
    const url = `${this.getGitLabUrl()}/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}`;
    
    return this.http.put<GitLabMergeRequest>(url, { state_event: 'close' }, { headers: this.getHeaders() });
  }

  /**
   * Merge a merge request
   */
  mergeMergeRequest(projectId: string, mergeRequestIid: number): Observable<GitLabMergeRequest> {
    const url = `${this.getGitLabUrl()}/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/merge`;
    
    return this.http.put<GitLabMergeRequest>(url, {}, { headers: this.getHeaders() });
  }

  /**
   * Test the GitLab connection with better error handling
   */
  testConnection(): Observable<any> {
    const url = `${this.getGitLabUrl()}/api/v4/user`;
    
    return this.http.get(url, { 
      headers: this.getHeaders(),
      // Add timeout and better error handling
      observe: 'response'
    }).pipe(
      // Map to just the body for easier handling
      map((response: any) => response.body)
    );
  }

  /**
   * Get project information
   */
  getProject(projectId: string): Observable<any> {
    const url = `${this.getGitLabUrl()}/api/v4/projects/${encodeURIComponent(projectId)}`;
    
    return this.http.get(url, { headers: this.getHeaders() });
  }

  /**
   * Search projects
   */
  searchProjects(query: string): Observable<any[]> {
    const url = `${this.getGitLabUrl()}/api/v4/projects?search=${encodeURIComponent(query)}`;
    
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }
} 
 