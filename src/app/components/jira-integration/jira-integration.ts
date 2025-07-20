import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JiraService, JiraProject, JiraBoard, JiraSprint, JiraIssue, JiraProjectUser, DateRange } from '../../services/jira';
import { LocalStorageService } from '../../services/local-storage';
import { CardComponent } from '../card/card';
import { ButtonComponent } from '../button/button';

interface PinnedTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  jiraKey?: string;
  jiraUrl?: string;
}

@Component({
  selector: 'app-jira-integration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './jira-integration.html',
  styleUrl: './jira-integration.css'
})
export class JiraIntegrationComponent implements OnInit {
  private readonly jiraService = inject(JiraService);
  private readonly localStorage = inject(LocalStorageService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Data
  projects: JiraProject[] = [];
  boards: JiraBoard[] = [];
  sprints: JiraSprint[] = [];
  users: JiraProjectUser[] = [];
  issues: JiraIssue[] = [];
  filteredIssues: JiraIssue[] = [];

  // Pagination
  pagination = {
    startAt: 0,
    maxResults: 20,
    total: 0,
    isLast: false,
    isLoading: false
  };

  // Filters
  selectedProject: JiraProject | null = null;
  selectedUser: JiraProjectUser | null = null;
  dateRange: DateRange = {
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  };

  // Selected items
  selectedBoard: JiraBoard | null = null;
  selectedSprint: JiraSprint | null = null;
  sprintIssues: JiraIssue[] = [];
  projectUsers: JiraProjectUser[] = [];

  // Loading states
  isLoadingProjects = false;
  isLoadingBoards = false;
  isLoadingSprints = false;
  isLoadingIssues = false;
  isLoadingUsers = false;
  isLoadingFilteredIssues = false;

  // UI states
  errorMessage = '';
  showProjectSelector = false;
  showBoardSelector = false;
  showSprintSelector = false;
  showUserFilter = false;
  showDateFilter = false;

  // Filter options
  showAllIssues = true;
  showFilteredIssues = false;
  
  ngOnInit(): void {
    this.loadStoredSelections();
  }

  /**
   * Load stored selections from localStorage
   */
  loadStoredSelections(): void {
    this.selectedProject = this.jiraService.getSelectedProject();
    this.selectedBoard = this.jiraService.getSelectedBoard();
    this.selectedSprint = this.jiraService.getSelectedSprint();
  }

  /**
   * Load projects from Jira
   */
  loadProjects(): void {
    if (!this.jiraService.getToken() || !this.jiraService.getEmail() || !this.jiraService.getJiraUrl()) {
      this.errorMessage = 'Please configure Jira credentials in Settings first.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoadingProjects = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.jiraService.getProjectsEnhanced().subscribe({
      next: (response) => {
        this.projects = response.values;
        this.isLoadingProjects = false;
        this.showProjectSelector = true;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoadingProjects = false;
        this.errorMessage = error.message || 'Failed to load projects';
        this.cdr.detectChanges();
        console.error('Error loading projects:', error);
      }
    });
  }

  /**
   * Select a project and load its boards
   */
  selectProject(project: JiraProject): void {
    this.selectedProject = project;
    this.jiraService.setSelectedProject(project);
    this.showProjectSelector = false;
    this.loadBoards(project.key);
  }

  /**
   * Load boards for the selected project
   */
  loadBoards(projectKey: string): void {
    this.isLoadingBoards = true;
    this.errorMessage = '';

    this.jiraService.getBoards(projectKey).subscribe({
      next: (response) => {
        this.boards = response.values;
        this.isLoadingBoards = false;
        this.showBoardSelector = true;
      },
      error: (error) => {
        this.isLoadingBoards = false;
        this.errorMessage = error.message || 'Failed to load boards';
        console.error('Error loading boards:', error);
      }
    });
  }

  /**
   * Select a board and load its sprints
   */
  selectBoard(board: JiraBoard): void {
    this.selectedBoard = board;
    this.jiraService.setSelectedBoard(board);
    this.showBoardSelector = false;
    this.loadSprints(board.id);
  }

  /**
   * Load sprints for the selected board
   */
  loadSprints(boardId: number): void {
    this.isLoadingSprints = true;
    this.errorMessage = '';

    this.jiraService.getSprints(boardId).subscribe({
      next: (response) => {
        this.sprints = response.values;
        this.isLoadingSprints = false;
        this.showSprintSelector = true;
      },
      error: (error) => {
        this.isLoadingSprints = false;
        this.errorMessage = error.message || 'Failed to load sprints';
        console.error('Error loading sprints:', error);
      }
    });
  }

  /**
   * Select a sprint and load its issues
   */
  selectSprint(sprint: JiraSprint): void {
    this.selectedSprint = sprint;
    this.jiraService.setSelectedSprint(sprint);
    this.showSprintSelector = false;
    this.loadSprintIssues(sprint.id);
  }

  /**
   * Load issues for the selected sprint
   */
  loadSprintIssues(sprintId: number): void {
    this.isLoadingIssues = true;
    this.errorMessage = '';

    this.jiraService.getSprintIssues(sprintId).subscribe({
      next: (response) => {
        this.sprintIssues = response.issues;
        this.isLoadingIssues = false;
      },
      error: (error) => {
        this.isLoadingIssues = false;
        this.errorMessage = error.message || 'Failed to load sprint issues';
        console.error('Error loading sprint issues:', error);
      }
    });
  }

  /**
   * Load users for the selected project
   */
  loadProjectUsers(): void {
    if (!this.selectedProject) {
      this.errorMessage = 'Please select a project first.';
      return;
    }

    this.isLoadingUsers = true;
    this.errorMessage = '';

    this.jiraService.getProjectUsers(this.selectedProject.key).subscribe({
      next: (response) => {
        this.users = response.values;
        this.isLoadingUsers = false;
        this.showUserFilter = true;
      },
      error: (error) => {
        this.isLoadingUsers = false;
        this.errorMessage = error.message || 'Failed to load project users';
        console.error('Error loading project users:', error);
      }
    });
  }

  /**
   * Select a user and show date filter
   */
  selectUser(user: JiraProjectUser): void {
    this.selectedUser = user;
    this.showUserFilter = false;
    this.showDateFilter = true;
  }

  /**
   * Apply user and date range filter
   */
  applyUserDateFilter(): void {
    if (!this.selectedProject || !this.selectedUser) {
      this.errorMessage = 'Please select a project and user first.';
      return;
    }

    this.isLoadingFilteredIssues = true;
    this.errorMessage = '';

    this.jiraService.getIssuesByUserAndDateRange(
      this.selectedProject.key,
      this.selectedUser.accountId,
      this.dateRange
    ).subscribe({
      next: (response) => {
        this.filteredIssues = response.issues;
        this.isLoadingFilteredIssues = false;
        this.showFilteredIssues = true;
        this.showAllIssues = false;
      },
      error: (error) => {
        this.isLoadingFilteredIssues = false;
        this.errorMessage = error.message || 'Failed to load filtered issues';
        console.error('Error loading filtered issues:', error);
      }
    });
  }

  /**
   * Load all issues for the selected project
   */
  loadAllProjectIssues(): void {
    if (!this.selectedProject) {
      this.errorMessage = 'Please select a project first.';
      return;
    }

    this.isLoadingIssues = true;
    this.errorMessage = '';

    this.jiraService.getProjectIssues(this.selectedProject.key).subscribe({
      next: (response) => {
        this.sprintIssues = response.issues;
        this.isLoadingIssues = false;
        this.showAllIssues = true;
        this.showFilteredIssues = false;
      },
      error: (error) => {
        this.isLoadingIssues = false;
        this.errorMessage = error.message || 'Failed to load project issues';
        console.error('Error loading project issues:', error);
      }
    });
  }

  /**
   * Load issues with pagination
   */
  loadIssues(reset: boolean = true): void {
    if (!this.selectedProject || !this.selectedUser) {
      this.errorMessage = 'Please select both project and user.';
      this.cdr.detectChanges();
      return;
    }

    if (reset) {
      this.issues = [];
      this.pagination.startAt = 0;
      this.pagination.isLast = false;
    }

    this.pagination.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.jiraService.getIssuesByUserAndDateRange(
      this.selectedProject.key,
      this.selectedUser.accountId,
      this.dateRange,
      this.pagination.startAt,
      this.pagination.maxResults
    ).subscribe({
      next: (response) => {
        if (reset) {
          this.issues = response.issues;
        } else {
          this.issues = [...this.issues, ...response.issues];
        }
        
        this.pagination.total = response.total;
        this.pagination.startAt += response.maxResults;
        this.pagination.isLast = response.isLast;
        this.pagination.isLoading = false;
        
        this.filteredIssues = this.issues;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.pagination.isLoading = false;
        this.errorMessage = error.message || 'Failed to load issues';
        this.cdr.detectChanges();
        console.error('Error loading issues:', error);
      }
    });
  }

  /**
   * Load more issues (for infinite scrolling)
   */
  loadMoreIssues(): void {
    if (this.selectedProject && this.selectedUser && !this.pagination.isLoading && !this.pagination.isLast) {
      this.loadIssues(false);
    }
  }

  /**
   * Get color class for issue type
   */
  getIssueTypeColor(type: string): string {
    switch (type.toLowerCase()) {
      case 'story':
      case 'task':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'bug':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'epic':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'subtask':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  /**
   * Track by function for issue list optimization
   */
  trackByIssueKey(index: number, issue: JiraIssue): string {
    return issue.key;
  }

  /**
   * Check if user has scrolled to bottom for infinite loading
   */
  onScroll(event: any): void {
    const element = event.target;
    if (element.scrollHeight - element.scrollTop <= element.clientHeight + 100) {
      this.loadMoreIssues();
    }
  }

  /**
   * Reset filters and show all issues
   */
  resetFilters(): void {
    this.selectedUser = null;
    this.filteredIssues = [];
    this.showUserFilter = false;
    this.showDateFilter = false;
    this.showFilteredIssues = false;
    this.showAllIssues = true;
    this.errorMessage = '';
  }

  /**
   * Get current issues to display
   */
  getCurrentIssues(): JiraIssue[] {
    if (this.showFilteredIssues) {
      return this.filteredIssues;
    }
    return this.sprintIssues;
  }

  /**
   * Pin a Jira issue as a task
   */
  pinIssue(issue: JiraIssue): void {
    const pinnedTasks = this.localStorage.get<PinnedTask[]>('pinned_tasks', []) || [];
    
    const newTask: PinnedTask = {
      id: `jira-${issue.key}`,
      title: issue.fields.summary,
      description: issue.fields.description || '',
      status: this.mapJiraStatusToTaskStatus(issue.fields.status.name),
      priority: this.mapJiraPriorityToTaskPriority(issue.fields.priority?.name),
      createdAt: new Date(),
      jiraKey: issue.key,
      jiraUrl: `${this.jiraService.getJiraUrl()}/browse/${issue.key}`
    };

    // Check if already pinned
    const existingIndex = pinnedTasks.findIndex(task => task.id === newTask.id);
    if (existingIndex >= 0) {
      pinnedTasks[existingIndex] = newTask;
    } else {
      pinnedTasks.unshift(newTask);
    }

    this.localStorage.set('pinned_tasks', pinnedTasks);
  }

  /**
   * Map Jira status to task status
   */
  private mapJiraStatusToTaskStatus(jiraStatus: string): 'todo' | 'in-progress' | 'done' {
    const status = jiraStatus.toLowerCase();
    if (status.includes('done') || status.includes('complete') || status.includes('resolved')) {
      return 'done';
    } else if (status.includes('progress') || status.includes('in progress')) {
      return 'in-progress';
    } else {
      return 'todo';
    }
  }

  /**
   * Map Jira priority to task priority
   */
  private mapJiraPriorityToTaskPriority(jiraPriority?: string): 'low' | 'medium' | 'high' {
    if (!jiraPriority) return 'medium';
    
    const priority = jiraPriority.toLowerCase();
    if (priority.includes('high') || priority.includes('critical')) {
      return 'high';
    } else if (priority.includes('low')) {
      return 'low';
    } else {
      return 'medium';
    }
  }

  /**
   * Get status color classes
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'todo': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  /**
   * Get priority color classes
   */
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  }

  /**
   * Check if issue is already pinned
   */
  isIssuePinned(issueKey: string): boolean {
    const pinnedTasks = this.localStorage.get<PinnedTask[]>('pinned_tasks', []) || [];
    return pinnedTasks.some(task => task.jiraKey === issueKey);
  }

  /**
   * Reset all selections
   */
  resetSelections(): void {
    this.selectedProject = null;
    this.selectedBoard = null;
    this.selectedSprint = null;
    this.sprintIssues = [];
    this.jiraService.setSelectedProject(null);
    this.jiraService.setSelectedBoard(null);
    this.jiraService.setSelectedSprint(null);
  }

  /**
   * Get active sprint from loaded sprints
   */
  getActiveSprint(): JiraSprint | null {
    return this.sprints.find(sprint => sprint.state === 'active') || null;
  }
} 
 