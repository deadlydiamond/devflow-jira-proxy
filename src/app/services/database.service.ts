import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface JiraSettings {
  id: string;
  user_id: string;
  token: string;
  url: string;
  email: string;
  selected_project: string;
  selected_board: string;
  selected_sprint: string;
  created_at: string;
  updated_at: string;
}

export interface SlackSettings {
  id: string;
  user_id: string;
  token: string;
  channel_id: string;
  socket_token: string;
  created_at: string;
  updated_at: string;
}

export interface GitlabSettings {
  id: string;
  user_id: string;
  token: string;
  url: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export interface DeploymentLink {
  id: string;
  user_id: string;
  ticket_id: string;
  deployment_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Squad {
  id: string;
  user_id: string;
  name: string;
  description: string;
  lead_id: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  squad_id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface PinnedStory {
  id: string;
  user_id: string;
  story_key: string;
  story_data: any;
  created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: string;
  openai_token: string;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private readonly http = inject(HttpClient);
  private readonly API_BASE = '/api/supabase-database';
  
  // Current user ID (you can implement proper auth later)
  private currentUserId = 'default-user';

  // BehaviorSubjects for real-time updates
  private deploymentLinksSubject = new BehaviorSubject<DeploymentLink[]>([]);
  private squadsSubject = new BehaviorSubject<Squad[]>([]);
  private teamMembersSubject = new BehaviorSubject<TeamMember[]>([]);
  private pinnedStoriesSubject = new BehaviorSubject<PinnedStory[]>([]);

  // Observables
  public deploymentLinks$ = this.deploymentLinksSubject.asObservable();
  public squads$ = this.squadsSubject.asObservable();
  public teamMembers$ = this.teamMembersSubject.asObservable();
  public pinnedStories$ = this.pinnedStoriesSubject.asObservable();

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.loadDeploymentLinks();
    this.loadSquads();
    this.loadTeamMembers();
    this.loadPinnedStories();
  }

  // User management
  createUser(email: string, name: string): Observable<{ success: boolean; id: string }> {
    return this.http.post<{ success: boolean; id: string }>(`${this.API_BASE}/users`, {
      id: this.currentUserId,
      email,
      name
    });
  }

  // Jira Settings
  getJiraSettings(): Observable<JiraSettings | null> {
    return this.http.get<JiraSettings | null>(`${this.API_BASE}/jira-settings?userId=${this.currentUserId}`);
  }

  createJiraSettings(settings: Partial<JiraSettings>): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.API_BASE}/jira-settings`, {
      userId: this.currentUserId,
      ...settings
    });
  }

  updateJiraSettings(settings: Partial<JiraSettings>): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.API_BASE}/jira-settings`, {
      userId: this.currentUserId,
      ...settings
    });
  }

  // Slack Settings
  getSlackSettings(): Observable<SlackSettings | null> {
    return this.http.get<SlackSettings | null>(`${this.API_BASE}/slack-settings?userId=${this.currentUserId}`);
  }

  createSlackSettings(settings: Partial<SlackSettings>): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.API_BASE}/slack-settings`, {
      userId: this.currentUserId,
      ...settings
    });
  }

  updateSlackSettings(settings: Partial<SlackSettings>): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.API_BASE}/slack-settings`, {
      userId: this.currentUserId,
      ...settings
    });
  }

  // GitLab Settings
  getGitlabSettings(): Observable<GitlabSettings | null> {
    return this.http.get<GitlabSettings | null>(`${this.API_BASE}/gitlab-settings?userId=${this.currentUserId}`);
  }

  createGitlabSettings(settings: Partial<GitlabSettings>): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.API_BASE}/gitlab-settings`, {
      userId: this.currentUserId,
      ...settings
    });
  }

  updateGitlabSettings(settings: Partial<GitlabSettings>): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.API_BASE}/gitlab-settings`, {
      userId: this.currentUserId,
      ...settings
    });
  }

  // Deployment Links
  getDeploymentLinks(): Observable<DeploymentLink[]> {
    return this.http.get<DeploymentLink[]>(`${this.API_BASE}/deployment-links?userId=${this.currentUserId}`);
  }

  createDeploymentLink(link: Partial<DeploymentLink>): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.API_BASE}/deployment-links`, {
      userId: this.currentUserId,
      ...link
    });
  }

  updateDeploymentLink(id: string, status: string): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.API_BASE}/deployment-links`, {
      id,
      status
    });
  }

  deleteDeploymentLink(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.API_BASE}/deployment-links?id=${id}`);
  }

  // Squads
  getSquads(): Observable<Squad[]> {
    return this.http.get<Squad[]>(`${this.API_BASE}/squads?userId=${this.currentUserId}`);
  }

  createSquad(squad: Partial<Squad>): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.API_BASE}/squads`, {
      userId: this.currentUserId,
      ...squad
    });
  }

  updateSquad(squad: Partial<Squad> & { id: string }): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.API_BASE}/squads`, squad);
  }

  deleteSquad(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.API_BASE}/squads?id=${id}`);
  }

  // Team Members
  getTeamMembers(): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(`${this.API_BASE}/team-members?userId=${this.currentUserId}`);
  }

  createTeamMember(member: Partial<TeamMember>): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.API_BASE}/team-members`, {
      userId: this.currentUserId,
      ...member
    });
  }

  updateTeamMember(member: Partial<TeamMember> & { id: string }): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.API_BASE}/team-members`, member);
  }

  deleteTeamMember(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.API_BASE}/team-members?id=${id}`);
  }

  // Pinned Stories
  getPinnedStories(): Observable<PinnedStory[]> {
    return this.http.get<PinnedStory[]>(`${this.API_BASE}/pinned-stories?userId=${this.currentUserId}`);
  }

  createPinnedStory(story: Partial<PinnedStory>): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.API_BASE}/pinned-stories`, {
      userId: this.currentUserId,
      ...story
    });
  }

  deletePinnedStory(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.API_BASE}/pinned-stories?id=${id}`);
  }

  // User Preferences
  getUserPreferences(): Observable<UserPreferences | null> {
    return this.http.get<UserPreferences | null>(`${this.API_BASE}/user-preferences?userId=${this.currentUserId}`);
  }

  createUserPreferences(preferences: Partial<UserPreferences>): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.API_BASE}/user-preferences`, {
      userId: this.currentUserId,
      ...preferences
    });
  }

  updateUserPreferences(preferences: Partial<UserPreferences>): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.API_BASE}/user-preferences`, {
      userId: this.currentUserId,
      ...preferences
    });
  }

  // Private methods for loading data into BehaviorSubjects
  private loadDeploymentLinks(): void {
    this.getDeploymentLinks().subscribe(links => {
      this.deploymentLinksSubject.next(links);
    });
  }

  private loadSquads(): void {
    this.getSquads().subscribe(squads => {
      this.squadsSubject.next(squads);
    });
  }

  private loadTeamMembers(): void {
    this.getTeamMembers().subscribe(members => {
      this.teamMembersSubject.next(members);
    });
  }

  private loadPinnedStories(): void {
    this.getPinnedStories().subscribe(stories => {
      this.pinnedStoriesSubject.next(stories);
    });
  }

  // Public methods to refresh data
  refreshDeploymentLinks(): void {
    this.loadDeploymentLinks();
  }

  refreshSquads(): void {
    this.loadSquads();
  }

  refreshTeamMembers(): void {
    this.loadTeamMembers();
  }

  refreshPinnedStories(): void {
    this.loadPinnedStories();
  }

  // Helper method to set current user
  setCurrentUser(userId: string): void {
    this.currentUserId = userId;
    this.loadInitialData();
  }
} 