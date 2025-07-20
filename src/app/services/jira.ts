import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { LocalStorageService } from './local-storage';
import { map, catchError, mergeMap } from 'rxjs/operators';

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: string;
    status: {
      name: string;
      statusCategory: {
        name: string;
      };
    };
    assignee: {
      displayName: string;
      emailAddress: string;
    } | null;
    reporter: {
      displayName: string;
      emailAddress: string;
    };
    priority: {
      name: string;
      iconUrl: string;
    };
    issuetype: {
      name: string;
      iconUrl: string;
    };
    project: {
      key: string;
      name: string;
    };
    created: string;
    updated: string;
    resolution: {
      name: string;
    } | null;
    labels: string[];
    components: Array<{
      name: string;
    }>;
    // Time tracking fields
    timeoriginalestimate?: number; // Original estimate in seconds
    timeestimate?: number; // Remaining estimate in seconds
    timespent?: number; // Time spent in seconds
  };
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
  active: boolean;
  timeZone: string;
  accountType: string;
}

export interface JiraProjectUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
  active: boolean;
  timeZone: string;
  accountType: string;
  roles?: string[];
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface JiraTransition {
  id: string;
  name: string;
  to: {
    id: string;
    name: string;
    statusCategory: {
      name: string;
    };
  };
}

export interface CreateIssueRequest {
  fields: {
    project: {
      key: string;
    };
    summary: string;
    description: string;
    issuetype: {
      name: string;
    };
    assignee?: {
      accountId: string;
    };
    priority?: {
      name: string;
    };
    labels?: string[];
  };
}

export interface UpdateIssueRequest {
  fields: {
    summary?: string;
    description?: string;
    assignee?: {
      accountId: string;
    };
    priority?: {
      name: string;
    };
    labels?: string[];
    timeoriginalestimate?: number;
    timeestimate?: number;
  };
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  simplified: boolean;
  style: string;
  isPrivate: boolean;
}

export interface JiraBoard {
  id: number;
  self: string;
  name: string;
  type: string;
  location: {
    projectId: number;
    displayName: string;
    projectName: string;
    projectKey: string;
    projectTypeKey: string;
    avatarURI: string;
    name: string;
  };
}

export interface JiraSprint {
  id: number;
  self: string;
  state: string;
  name: string;
  startDate: string;
  endDate: string;
  completeDate: string;
  originBoardId: number;
  goal: string;
}

export interface JiraSprintIssue {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface PaginatedResponse<T> {
  values: T[];
  startAt: number;
  maxResults: number;
  total: number;
  isLast: boolean;
}

export interface JiraSubtask {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
    assignee: {
      displayName: string;
      emailAddress: string;
    } | null;
    timeestimate?: number;
    timeoriginalestimate?: number;
    timespent?: number;
    issuetype: {
      name: string;
      iconUrl: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class JiraService {
  private readonly http = inject(HttpClient);
  private readonly localStorage = inject(LocalStorageService);
  
  private readonly JIRA_TOKEN_KEY = 'jira_token';
  private readonly JIRA_URL_KEY = 'jira_url';
  private readonly JIRA_EMAIL_KEY = 'jira_email';
  private readonly JIRA_SELECTED_PROJECT_KEY = 'jira_selected_project';
  private readonly JIRA_SELECTED_BOARD_KEY = 'jira_selected_board';
  private readonly JIRA_SELECTED_SPRINT_KEY = 'jira_selected_sprint';

  /**
   * Get the stored Jira token from localStorage
   */
  getToken(): string | null {
    return this.localStorage.get<string>(this.JIRA_TOKEN_KEY, undefined);
  }

  /**
   * Save Jira token to localStorage
   */
  setToken(token: string): void {
    this.localStorage.set(this.JIRA_TOKEN_KEY, token);
  }

  /**
   * Get Jira URL - use Vercel backend in production, direct in development
   */
  getJiraUrl(): string {
    if (window.location.hostname === 'localhost') {
      // Development: use direct Jira URL
      return this.localStorage.get<string>(this.JIRA_URL_KEY, '') || 'https://whitehelmet.atlassian.net';
    } else {
      // Production: use Vercel backend proxy
      return 'https://devflow-6193j6yd8-omer-saleems-projects-36c1c1d3.vercel.app/api/jira';
    }
  }

  // Get the actual Jira base URL for direct access (used in some cases)
  getJiraBaseUrl(): string {
    return this.localStorage.get<string>(this.JIRA_URL_KEY, '') || 'https://whitehelmet.atlassian.net';
  }

  /**
   * Save Jira URL to localStorage
   */
  setJiraUrl(url: string): void {
    // Remove trailing slash before saving
    const cleanUrl = url.replace(/\/$/, '');
    this.localStorage.set(this.JIRA_URL_KEY, cleanUrl);
  }

  /**
   * Get the stored Jira email from localStorage
   */
  getEmail(): string | null {
    return this.localStorage.get<string>(this.JIRA_EMAIL_KEY, undefined);
  }

  /**
   * Save Jira email to localStorage
   */
  setEmail(email: string): void {
    this.localStorage.set(this.JIRA_EMAIL_KEY, email);
  }

  /**
   * Get selected project
   */
  getSelectedProject(): JiraProject | null {
    return this.localStorage.get<JiraProject>(this.JIRA_SELECTED_PROJECT_KEY, undefined) || null;
  }

  /**
   * Save selected project
   */
  setSelectedProject(project: JiraProject | null): void {
    if (project) {
      this.localStorage.set(this.JIRA_SELECTED_PROJECT_KEY, project);
    } else {
      this.localStorage.remove(this.JIRA_SELECTED_PROJECT_KEY);
    }
  }

  /**
   * Get selected board
   */
  getSelectedBoard(): JiraBoard | null {
    return this.localStorage.get<JiraBoard>(this.JIRA_SELECTED_BOARD_KEY, undefined) || null;
  }

  /**
   * Save selected board
   */
  setSelectedBoard(board: JiraBoard | null): void {
    if (board) {
      this.localStorage.set(this.JIRA_SELECTED_BOARD_KEY, board);
    } else {
      this.localStorage.remove(this.JIRA_SELECTED_BOARD_KEY);
    }
  }

  /**
   * Get selected sprint
   */
  getSelectedSprint(): JiraSprint | null {
    return this.localStorage.get<JiraSprint>(this.JIRA_SELECTED_SPRINT_KEY, undefined) || null;
  }

  /**
   * Save selected sprint
   */
  setSelectedSprint(sprint: JiraSprint | null): void {
    if (sprint) {
      this.localStorage.set(this.JIRA_SELECTED_SPRINT_KEY, sprint);
    } else {
      this.localStorage.remove(this.JIRA_SELECTED_SPRINT_KEY);
    }
  }

  /**
   * Create HTTP headers with Basic Auth
   */
  private getHeaders(): HttpHeaders {
    const email = this.getEmail();
    const token = this.getToken();
    
    if (!email || !token) {
      throw new Error('Jira credentials not configured');
    }

    const authString = `${email}:${token}`;
    const base64Auth = btoa(authString);
    
    const headers = new HttpHeaders({
      'Authorization': `Basic ${base64Auth}`,
      'Content-Type': 'application/json'
    });

    // Add Jira URL header for proxy
    if (window.location.hostname !== 'localhost') {
      const jiraBaseUrl = this.getJiraBaseUrl();
      headers.set('X-Jira-URL', jiraBaseUrl);
    }

    return headers;
  }

  /**
   * Get XSRF token from Jira
   */
  private getXSRFToken(): Observable<string> {
    const url = `${this.getJiraUrl()}/rest/api/3/myself`;
    
    return this.http.get<any>(url, { 
      headers: this.getHeaders(),
      withCredentials: true // This is important for cookies
    }).pipe(
      map(() => {
        // Extract XSRF token from cookies
        const cookies = document.cookie.split(';');
        const xsrfCookie = cookies.find(cookie => 
          cookie.trim().startsWith('atlassian.xsrf.token=')
        );
        
        if (xsrfCookie) {
          return xsrfCookie.split('=')[1];
        }
        
        // If no cookie found, try to get it from the response headers
        return '';
      }),
      catchError(() => of('')) // Return empty string if failed
    );
  }

  /**
   * Get headers with XSRF token for POST requests
   */
  private getHeadersWithXSRF(): Observable<HttpHeaders> {
    return this.getXSRFToken().pipe(
      map(xsrfToken => {
        const email = this.getEmail();
        const token = this.getToken();
        
        if (!email || !token) {
          return new HttpHeaders({
            'Content-Type': 'application/json'
          });
        }

        const auth = btoa(`${email}:${token}`);
        const headers: any = {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        };

        // Add XSRF token if available
        if (xsrfToken) {
          headers['X-Atlassian-Token'] = 'no-check';
          headers['X-AUSERNAME'] = email;
        }

        return new HttpHeaders(headers);
      })
    );
  }

  /**
   * Test the Jira connection
   */
  testConnection(): Observable<JiraUser> {
    const jiraUrl = this.getJiraUrl();
    const url = `${jiraUrl}/rest/api/3/myself`;
    
    return this.http.get<JiraUser>(url, { 
      headers: this.getHeaders()
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Jira connection error:', error);
        
        // Provide specific error messages for common issues
        if (error.status === 0) {
          // CORS or network error
          throw new Error('Connection failed. This is likely due to CORS restrictions. Try using a browser extension to disable CORS for development, or test with the standalone HTML file.');
        } else if (error.status === 401) {
          throw new Error('Authentication failed. Please check your email and API token.');
        } else if (error.status === 403) {
          throw new Error('Access denied. Please check your API token permissions.');
        } else if (error.status === 404) {
          throw new Error('Jira URL not found. Please check your Jira domain URL.');
        } else {
          throw new Error(`Connection failed: ${error.message || 'Unknown error'}`);
        }
      })
    );
  }

  /**
   * Get current user's issues
   */
  getMyIssues(maxResults: number = 50): Observable<{ issues: JiraIssue[] }> {
    const url = `${this.getJiraUrl()}/rest/api/3/search`;
    const params = {
      jql: 'assignee = currentUser() ORDER BY updated DESC',
      maxResults: maxResults.toString(),
      fields: 'summary,description,status,assignee,reporter,priority,issuetype,project,created,updated,resolution,labels,components'
    };
    
    return this.http.get<{ issues: JiraIssue[] }>(url, { 
      headers: this.getHeaders(),
      params
    });
  }

  /**
   * Get issue details by key
   */
  getIssue(issueKey: string): Observable<JiraIssue> {
    const url = `${this.getJiraUrl()}/rest/api/3/issue/${issueKey}`;
    
    return this.http.get<JiraIssue>(url, { 
      headers: this.getHeaders()
    });
  }

  /**
   * Get available transitions for an issue
   */
  getIssueTransitions(issueKey: string): Observable<{ transitions: JiraTransition[] }> {
    // Use direct Jira URL since proxy server is not working correctly
    const url = `${this.getJiraUrl()}/rest/api/3/issue/${issueKey}/transitions`;
    
    return this.http.get<{ transitions: JiraTransition[] }>(url, { 
      headers: this.getHeaders()
    });
  }

  /**
   * Transition issue status
   */
  transitionIssue(issueKey: string, transitionId: string): Observable<any> {
    // Use direct Jira URL since proxy server is not working correctly
    const url = `${this.getJiraUrl()}/rest/api/3/issue/${issueKey}/transitions`;
    const body = {
      transition: {
        id: transitionId
      }
    };

    return this.getHeadersWithXSRF().pipe(
      mergeMap(headers => 
        this.http.post<any>(url, body, { headers })
      )
    );
  }

  /**
   * Create a new issue
   */
  createIssue(issueData: CreateIssueRequest): Observable<JiraIssue> {
    const url = `${this.getJiraUrl()}/rest/api/3/issue`;
    
    return this.getHeadersWithXSRF().pipe(
      mergeMap(headers => 
        this.http.post<JiraIssue>(url, issueData, { headers })
      )
    );
  }

  /**
   * Update an issue
   */
  updateIssue(issueKey: string, updates: UpdateIssueRequest): Observable<any> {
    const url = `${this.getJiraUrl()}/rest/api/3/issue/${issueKey}`;
    
    return this.http.put(url, updates, { 
      headers: this.getHeaders()
    });
  }

  /**
   * Search issues with JQL
   */
  searchIssues(jql: string, maxResults: number = 50): Observable<{ issues: JiraIssue[] }> {
    const url = `${this.getJiraUrl()}/rest/api/3/search`;
    const params = {
      jql,
      maxResults: maxResults.toString(),
      fields: 'summary,description,status,assignee,reporter,priority,issuetype,project,created,updated,resolution,labels,components'
    };
    
    return this.http.get<{ issues: JiraIssue[] }>(url, { 
      headers: this.getHeaders(),
      params
    });
  }

  /**
   * Get projects
   */
  getProjects(): Observable<JiraProject[]> {
    const url = `${this.getJiraUrl()}/rest/api/3/project`;
    return this.makeRequest<JiraProject[]>(url);
  }

  /**
   * Get issue types
   */
  getIssueTypes(): Observable<any[]> {
    const url = `${this.getJiraUrl()}/rest/api/3/issuetype`;
    
    return this.http.get<any[]>(url, { 
      headers: this.getHeaders()
    });
  }

  /**
   * Get all projects (enhanced version)
   */
  getProjectsEnhanced(): Observable<{ values: JiraProject[] }> {
    const jiraUrl = this.getJiraUrl();
    const url = `${jiraUrl}/rest/api/3/project/search`;
    
    return this.http.get<any>(url, { 
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        // Handle the actual response structure from Jira API
        if (response && response.values) {
          return { values: response.values };
        } else if (Array.isArray(response)) {
          return { values: response };
        } else {
          console.error('Unexpected response structure:', response);
          return { values: [] };
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching projects:', error);
        if (error.status === 401) {
          throw new Error('Authentication failed. Please check your credentials.');
        } else if (error.status === 403) {
          throw new Error('Access denied. Please check your API token permissions.');
        } else {
          throw new Error(`Failed to fetch projects: ${error.message || 'Unknown error'}`);
        }
      })
    );
  }

  /**
   * Get boards for a project
   */
  getBoards(projectKeyOrId: string): Observable<{ values: JiraBoard[] }> {
    const jiraUrl = this.getJiraUrl();
    const url = `${jiraUrl}/rest/agile/1.0/board?projectKeyOrId=${projectKeyOrId}`;
    
    return this.http.get<{ values: JiraBoard[] }>(url, { 
      headers: this.getHeaders()
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching boards:', error);
        if (error.status === 401) {
          throw new Error('Authentication failed. Please check your credentials.');
        } else if (error.status === 403) {
          throw new Error('Access denied. Please check your API token permissions.');
        } else {
          throw new Error(`Failed to fetch boards: ${error.message || 'Unknown error'}`);
        }
      })
    );
  }

  /**
   * Get sprints for a board
   */
  getSprints(boardId: number): Observable<{ values: JiraSprint[] }> {
    const jiraUrl = this.getJiraUrl();
    const url = `${jiraUrl}/rest/agile/1.0/board/${boardId}/sprint`;
    
    return this.http.get<{ values: JiraSprint[] }>(url, { 
      headers: this.getHeaders()
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching sprints:', error);
        if (error.status === 401) {
          throw new Error('Authentication failed. Please check your credentials.');
        } else if (error.status === 403) {
          throw new Error('Access denied. Please check your API token permissions.');
        } else {
          throw new Error(`Failed to fetch sprints: ${error.message || 'Unknown error'}`);
        }
      })
    );
  }

  /**
   * Get issues in a sprint with pagination
   */
  getSprintIssues(sprintId: number, startAt: number = 0, maxResults: number = 20): Observable<JiraSprintIssue> {
    const jiraUrl = this.getJiraUrl();
    const url = `${jiraUrl}/rest/agile/1.0/sprint/${sprintId}/issue`;
    
    const params = {
      startAt: startAt.toString(),
      maxResults: maxResults.toString(),
      fields: 'summary,description,status,assignee,reporter,priority,issuetype,project,created,updated,resolution,labels,components'
    };
    
    return this.http.get<JiraSprintIssue>(url, { 
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching sprint issues:', error);
        if (error.status === 401) {
          throw new Error('Authentication failed. Please check your credentials.');
        } else if (error.status === 403) {
          throw new Error('Access denied. Please check your API token permissions.');
        } else {
          throw new Error(`Failed to fetch sprint issues: ${error.message || 'Unknown error'}`);
        }
      })
    );
  }

  /**
   * Get project users with pagination
   */
  getProjectUsers(projectKey: string, startAt: number = 0, maxResults: number = 50): Observable<PaginatedResponse<JiraProjectUser>> {
    const jiraUrl = this.getJiraUrl();
    const url = `${jiraUrl}/rest/api/3/user/assignable/search`;
    
    const params = {
      project: projectKey,
      startAt: startAt.toString(),
      maxResults: maxResults.toString()
    };
    
    return this.http.get<PaginatedResponse<JiraProjectUser>>(url, { 
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching project users:', error);
        if (error.status === 401) {
          throw new Error('Authentication failed. Please check your credentials.');
        } else if (error.status === 403) {
          throw new Error('Access denied. Please check your API token permissions.');
        } else {
          throw new Error(`Failed to fetch project users: ${error.message || 'Unknown error'}`);
        }
      })
    );
  }

  /**
   * Get issues filtered by user and date range with pagination
   */
  getIssuesByUserAndDateRange(
    projectKey: string, 
    userId: string, 
    dateRange: DateRange,
    startAt: number = 0,
    maxResults: number = 20
  ): Observable<{ issues: JiraIssue[]; total: number; startAt: number; maxResults: number; isLast: boolean }> {
    const jiraUrl = this.getJiraUrl();
    const url = `${jiraUrl}/rest/api/3/search`;
    
    // Create JQL query for filtering by user and date range
    const startDate = new Date(dateRange.startDate).toISOString().split('T')[0];
    const endDate = new Date(dateRange.endDate).toISOString().split('T')[0];
    
    const jql = `project = ${projectKey} AND assignee = ${userId} AND updated >= "${startDate}" AND updated <= "${endDate}" ORDER BY updated DESC`;
    
    const params = {
      jql,
      startAt: startAt.toString(),
      maxResults: maxResults.toString(),
      fields: 'summary,description,status,assignee,reporter,priority,issuetype,project,created,updated,resolution,labels,components'
    };
    
    return this.http.get<{ issues: JiraIssue[]; total: number; startAt: number; maxResults: number }>(url, { 
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => ({
        ...response,
        isLast: response.startAt + response.maxResults >= response.total
      })),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching filtered issues:', error);
        if (error.status === 401) {
          throw new Error('Authentication failed. Please check your credentials.');
        } else if (error.status === 403) {
          throw new Error('Access denied. Please check your API token permissions.');
        } else {
          throw new Error(`Failed to fetch filtered issues: ${error.message || 'Unknown error'}`);
        }
      })
    );
  }

  /**
   * Get all issues for a project with pagination
   */
  getProjectIssues(projectKey: string, startAt: number = 0, maxResults: number = 20): Observable<{ issues: JiraIssue[]; total: number; startAt: number; maxResults: number; isLast: boolean }> {
    const jiraUrl = this.getJiraUrl();
    const url = `${jiraUrl}/rest/api/3/search`;
    
    const jql = `project = ${projectKey} ORDER BY updated DESC`;
    
    const params = {
      jql,
      startAt: startAt.toString(),
      maxResults: maxResults.toString(),
      fields: 'summary,description,status,assignee,reporter,priority,issuetype,project,created,updated,resolution,labels,components'
    };
    
    return this.http.get<{ issues: JiraIssue[]; total: number; startAt: number; maxResults: number }>(url, { 
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => ({
        ...response,
        isLast: response.startAt + response.maxResults >= response.total
      })),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching project issues:', error);
        if (error.status === 401) {
          throw new Error('Authentication failed. Please check your credentials.');
        } else if (error.status === 403) {
          throw new Error('Access denied. Please check your API token permissions.');
        } else {
          throw new Error(`Failed to fetch project issues: ${error.message || 'Unknown error'}`);
        }
      })
    );
  }

  /**
   * Get subtasks for an issue with pagination
   */
  getSubtasks(issueKey: string, startAt: number = 0, maxResults: number = 50): Observable<{ issues: JiraSubtask[]; total: number; startAt: number; maxResults: number; isLast: boolean }> {
    const jiraUrl = this.getJiraUrl();
    const url = `${jiraUrl}/rest/api/3/search`;
    
    // Search for subtasks of the parent issue
    const jql = `parent = ${issueKey}`;
    
    const params = {
      jql,
      startAt: startAt.toString(),
      maxResults: maxResults.toString(),
      fields: 'summary,status,assignee,timeestimate,timeoriginalestimate,timespent,issuetype'
    };
    
    return this.http.get<{ issues: JiraSubtask[]; total: number; startAt: number; maxResults: number }>(url, { 
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => ({
        ...response,
        isLast: response.startAt + response.maxResults >= response.total
      })),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching subtasks:', error);
        if (error.status === 401) {
          throw new Error('Authentication failed. Please check your credentials.');
        } else if (error.status === 403) {
          throw new Error('Access denied. Please check your API token permissions.');
        } else {
          throw new Error(`Failed to fetch subtasks: ${error.message || 'Unknown error'}`);
        }
      })
    );
  }

  /**
   * Post a comment to an issue
   */
  postComment(issueKey: string, commentBody: string): Observable<any> {
    const jiraUrl = this.getJiraUrl();
    const url = `${jiraUrl}/rest/api/3/issue/${issueKey}/comment`;
    
    const body = {
      body: commentBody
    };
    
    return this.getHeadersWithXSRF().pipe(
      mergeMap(headers => 
        this.http.post(url, body, { headers })
      ),
      catchError((error: HttpErrorResponse) => {
        console.error('Error posting comment:', error);
        
        if (error.status === 401) {
          throw new Error('Authentication failed. Please check your credentials.');
        } else if (error.status === 403) {
          throw new Error('Access denied. Please check your API token permissions or XSRF settings.');
        } else {
          throw new Error(`Failed to post comment: ${error.message || 'Unknown error'}`);
        }
      })
    );
  }

  private makeRequest<T>(url: string): Observable<T> {
    return this.http.get<T>(url, { headers: this.getHeaders() }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 403) {
          // Try again with basic headers (XSRF issue)
          return this.http.get<T>(url, { 
            headers: new HttpHeaders({
              'Content-Type': 'application/json'
            })
          });
        }
        throw error;
      })
    );
  }
} 
 