import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JiraService, JiraProject, JiraBoard, JiraSprint, JiraIssue, JiraProjectUser, DateRange, JiraSubtask } from '../../services/jira';
import { OpenAiService } from '../../services/openai';
import { LocalStorageService } from '../../services/local-storage';
import { GitLabService } from '../../services/gitlab';

interface StorySubtask {
  id: string;
  key: string;
  summary: string;
  status: string;
  timeEstimate?: string; // Changed to string since we convert to readable format
  originalEstimate?: number;
  timeSpent?: number;
  assignee?: string;
}

interface StoryFilter {
  type: 'all' | 'story' | 'bug' | 'subtask';
  assignedToMe: boolean;
  pinnedOnly: boolean;
  failedOnly: boolean;
}

interface StoryViewerData {
  issue: JiraIssue;
  subtasks: StorySubtask[];
  isOpen: boolean;
}

@Component({
  selector: 'app-jira-sprint-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './jira-sprint-workspace.html',
  styleUrl: './jira-sprint-workspace.css'
})
export class JiraSprintWorkspaceComponent implements OnInit {
  private readonly jiraService = inject(JiraService);
  private readonly openAiService = inject(OpenAiService);
  private readonly localStorage = inject(LocalStorageService);
  private readonly gitlabService = inject(GitLabService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Workspace State
  projects: JiraProject[] = [];
  boards: JiraBoard[] = [];
  sprints: JiraSprint[] = [];
  sprintStories: JiraIssue[] = [];
  filteredStories: JiraIssue[] = [];

  // Pagination State
  pagination = {
    startAt: 0,
    maxResults: 20,
    total: 0,
    isLast: false,
    isLoading: false
  };

  // Selected Items
  selectedProject: JiraProject | null = null;
  selectedBoard: JiraBoard | null = null;
  selectedSprint: JiraSprint | null = null;

  // Filters
  storyFilter: StoryFilter = {
    type: 'all',
    assignedToMe: false,
    pinnedOnly: false,
    failedOnly: false
  };

  // Story Viewer
  storyViewer: StoryViewerData = {
    issue: {} as JiraIssue,
    subtasks: [],
    isOpen: false
  };

  // Loading States
  isLoadingProjects = false;
  isLoadingBoards = false;
  isLoadingSprints = false;
  isLoadingStories = false;
  isLoadingSubtasks = false;
  isGeneratingAI = false;

  // UI States
  errorMessage = '';
  showProjectSelector = false;
  showBoardSelector = false;
  showSprintSelector = false;

  // Story Viewer Section States
  isDetailsExpanded = true;
  isDescriptionExpanded = true;
  isAiToolsExpanded = true;
  isSubtasksExpanded = true;

  // AI Generation
  aiGeneratedSubtasks: string[] = [];
  aiEstimates: string = '';
  aiImprovedTitle: string = '';
  aiTestCases: string[] = [];
  aiTranslations: string = '';
  aiCornerCaseQuestions: string[] = [];

  // FE/BE Estimation
  feBeEstimate: {
    feTotal: string;
    beTotal: string;
    totalEstimate: string;
    missingEstimates: string[];
    isCalculated: boolean;
    isApproved: boolean;
    isPosting: boolean;
    isCalculating: boolean;
  } = {
    feTotal: '',
    beTotal: '',
    totalEstimate: '',
    missingEstimates: [],
    isCalculated: false,
    isApproved: false,
    isPosting: false,
    isCalculating: false
  };

  // LocalStorage Keys
  private readonly JIRA_PROJECT_ID_KEY = 'jiraProjectId';
  private readonly JIRA_BOARD_ID_KEY = 'jiraBoardId';
  private readonly JIRA_SPRINT_ID_KEY = 'jiraSprintId';
  private readonly PINNED_STORY_IDS_KEY = 'pinnedStoryIds';

  // Cache for FE/BE estimates to avoid recalculation
  private feBeEstimateCache = new Map<string, any>();

  // AI Results Popup
  aiResultsPopup = {
    isOpen: false,
    title: '',
    description: '',
    content: ''
  };

  ngOnInit(): void {
    this.loadPersistedWorkspace();
    this.loadStoryFilterSettings();
  }

  /**
   * Load story filter settings from localStorage
   */
  loadStoryFilterSettings(): void {
    const settings = this.localStorage.get<any>('settings', {});
    this.storyFilter.assignedToMe = settings.showAssignedToMe !== false; // Default to true
  }

  /**
   * Load persisted workspace state from localStorage
   */
  loadPersistedWorkspace(): void {
    const projectId = this.localStorage.get<string>(this.JIRA_PROJECT_ID_KEY, '');
    const boardId = this.localStorage.get<string>(this.JIRA_BOARD_ID_KEY, '');
    const sprintId = this.localStorage.get<string>(this.JIRA_SPRINT_ID_KEY, '');

    if (projectId && boardId && sprintId) {
      // Load the persisted workspace
      this.loadProjects().then(() => {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
          this.selectProject(project);
          this.loadBoards(project.key).then(() => {
            const board = this.boards.find(b => b.id.toString() === boardId);
            if (board) {
              this.selectBoard(board);
              this.loadSprints(board.id).then(() => {
                const sprint = this.sprints.find(s => s.id.toString() === sprintId);
                if (sprint) {
                  this.selectSprint(sprint);
                }
              });
            }
          });
        }
      });
    }
  }

  /**
   * Load projects from Jira
   */
  async loadProjects(): Promise<void> {
    if (!this.jiraService.getToken() || !this.jiraService.getEmail() || !this.jiraService.getJiraUrl()) {
      this.errorMessage = 'Please configure Jira credentials in Settings first.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoadingProjects = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    return new Promise((resolve, reject) => {
      this.jiraService.getProjectsEnhanced().subscribe({
        next: (response) => {
          this.projects = response.values;
          this.isLoadingProjects = false;
          this.showProjectSelector = true;
          this.cdr.detectChanges();
          resolve();
        },
        error: (error) => {
          this.isLoadingProjects = false;
          this.errorMessage = error.message || 'Failed to load projects';
          this.cdr.detectChanges();
          console.error('Error loading projects:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Select a project and load its boards
   */
  selectProject(project: JiraProject): void {
    this.selectedProject = project;
    this.localStorage.set(this.JIRA_PROJECT_ID_KEY, project.id);
    this.showProjectSelector = false;
    
    // Reset board and sprint selection when project changes
    this.selectedBoard = null;
    this.selectedSprint = null;
    this.boards = [];
    this.sprints = [];
    this.sprintStories = [];
    this.filteredStories = [];
    
    this.loadBoards(project.key);
  }

  /**
   * Load boards for the selected project
   */
  async loadBoards(projectKey: string): Promise<void> {
    if (!this.jiraService.getToken() || !this.jiraService.getEmail() || !this.jiraService.getJiraUrl()) {
      this.errorMessage = 'Please configure Jira credentials in Settings first.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoadingBoards = true;
    this.errorMessage = '';
    this.showBoardSelector = false;
    this.cdr.detectChanges();

    return new Promise((resolve, reject) => {
      this.jiraService.getBoards(projectKey).subscribe({
        next: (response) => {
          this.boards = response.values;
          this.isLoadingBoards = false;
          this.showBoardSelector = true;
          this.cdr.detectChanges();
          resolve();
        },
        error: (error) => {
          this.isLoadingBoards = false;
          this.errorMessage = error.message || 'Failed to load boards';
          this.cdr.detectChanges();
          console.error('Error loading boards:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Select a board and load its sprints
   */
  selectBoard(board: JiraBoard): void {
    this.selectedBoard = board;
    this.localStorage.set(this.JIRA_BOARD_ID_KEY, board.id.toString());
    this.showBoardSelector = false;
    this.loadSprints(board.id);
  }

  /**
   * Load sprints for the selected board
   */
  async loadSprints(boardId: number): Promise<void> {
    if (!this.jiraService.getToken() || !this.jiraService.getEmail() || !this.jiraService.getJiraUrl()) {
      this.errorMessage = 'Please configure Jira credentials in Settings first.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoadingSprints = true;
    this.errorMessage = '';
    this.showSprintSelector = false;
    this.cdr.detectChanges();

    return new Promise((resolve, reject) => {
      this.jiraService.getSprints(boardId).subscribe({
        next: (response) => {
          this.sprints = response.values;
          this.isLoadingSprints = false;
          this.showSprintSelector = true;
          this.cdr.detectChanges();
          resolve();
        },
        error: (error) => {
          this.isLoadingSprints = false;
          this.errorMessage = error.message || 'Failed to load sprints';
          this.cdr.detectChanges();
          console.error('Error loading sprints:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Select a sprint and load its stories
   */
  selectSprint(sprint: JiraSprint): void {
    this.selectedSprint = sprint;
    this.localStorage.set(this.JIRA_SPRINT_ID_KEY, sprint.id.toString());
    this.showSprintSelector = false;
    
    // Reset story lists when sprint changes
    this.sprintStories = [];
    this.filteredStories = [];
    this.pagination.startAt = 0;
    this.pagination.isLast = false;
    
    this.loadSprintStories(sprint.id);
  }

  /**
   * Load sprint stories with pagination
   */
  loadSprintStories(sprintId: number, reset: boolean = true): void {
    if (!this.jiraService.getToken() || !this.jiraService.getEmail() || !this.jiraService.getJiraUrl()) {
      this.errorMessage = 'Please configure Jira credentials in Settings first.';
      this.cdr.detectChanges();
      return;
    }

    if (reset) {
      this.sprintStories = [];
      this.pagination.startAt = 0;
      this.pagination.isLast = false;
    }

    this.pagination.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    // Load all issues at once with a large maxResults value
    this.jiraService.getSprintIssues(sprintId, 0, 1000).subscribe({
      next: (response) => {
        this.sprintStories = response.issues;
        
        this.pagination.total = response.total;
        this.pagination.startAt = response.total; // Set to total to indicate all loaded
        this.pagination.isLast = true; // Mark as last since we loaded all
        this.pagination.isLoading = false;
        
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.pagination.isLoading = false;
        this.errorMessage = error.message || 'Failed to load sprint stories';
        this.cdr.detectChanges();
        console.error('Error loading sprint stories:', error);
      }
    });
  }

  /**
   * Track by function for story list optimization
   */
  trackByStoryKey(index: number, story: JiraIssue): string {
    return story.key;
  }

  /**
   * Apply story filters
   */
  applyFilters(): void {
    let filtered = [...this.sprintStories];

    // Filter by type
    if (this.storyFilter.type !== 'all') {
      filtered = filtered.filter(issue => {
        const issueTypeName = issue.fields.issuetype.name.toLowerCase();
        const filterType = this.storyFilter.type.toLowerCase();
        
        // Handle different variations of issue type names
        if (filterType === 'subtask') {
          // Check for various subtask naming conventions
          return issueTypeName.includes('subtask') || 
                 issueTypeName.includes('sub-task') || 
                 issueTypeName.includes('sub task') ||
                 issueTypeName.includes('subtask') ||
                 (issueTypeName.includes('task') && !issueTypeName.includes('story')) ||
                 issueTypeName.includes('sub-task') ||
                 issueTypeName.includes('subtask');
        } else if (filterType === 'bug') {
          // Check for various bug naming conventions
          return issueTypeName.includes('bug') || 
                 issueTypeName.includes('defect') ||
                 issueTypeName.includes('issue') ||
                 issueTypeName.includes('problem') ||
                 issueTypeName.includes('error');
        } else if (filterType === 'story') {
          // Check for various story naming conventions
          return issueTypeName.includes('story') || 
                 issueTypeName.includes('user story') ||
                 issueTypeName.includes('feature') ||
                 issueTypeName.includes('epic') ||
                 issueTypeName.includes('requirement');
        } else {
          // Exact match for other types
          return issueTypeName === filterType;
        }
      });
    }

    // Filter by assignee (assigned to me)
    if (this.storyFilter.assignedToMe) {
      const userEmail = this.jiraService.getEmail();
      filtered = filtered.filter(issue => 
        issue.fields.assignee?.emailAddress === userEmail
      );
    }

    // Filter by failed status
    if (this.storyFilter.failedOnly) {
      filtered = filtered.filter(issue => 
        this.isFailedStatus(issue.fields.status.name)
      );
    }

    // Filter by pinned stories
    if (this.storyFilter.pinnedOnly) {
      const pinnedIds = this.getPinnedStoryIds();
      filtered = filtered.filter(issue => 
        pinnedIds.includes(issue.key)
      );
    }

    this.filteredStories = filtered;
    this.cdr.detectChanges();
  }

  /**
   * Get pinned story IDs from localStorage
   */
  getPinnedStoryIds(): string[] {
    return this.localStorage.get<string[]>(this.PINNED_STORY_IDS_KEY, []) || [];
  }

  /**
   * Toggle story pin status
   */
  toggleStoryPin(storyKey: string): void {
    const pinnedIds = this.getPinnedStoryIds();
    const index = pinnedIds.indexOf(storyKey);
    
    if (index >= 0) {
      pinnedIds.splice(index, 1);
    } else {
      pinnedIds.push(storyKey);
    }
    
    this.localStorage.set(this.PINNED_STORY_IDS_KEY, pinnedIds);
    this.applyFilters();
  }

  /**
   * Check if a story is pinned
   */
  isStoryPinned(storyKey: string): boolean {
    const pinnedIds = this.getPinnedStoryIds();
    return pinnedIds.includes(storyKey);
  }

  /**
   * Open story viewer
   */
  openStoryViewer(issue: JiraIssue): void {
    this.storyViewer.issue = issue;
    this.storyViewer.isOpen = true;
    this.storyViewer.subtasks = [];
    this.isLoadingSubtasks = false; // Reset loading state
    this.loadSubtasks(issue.key);
  }

  /**
   * Load subtasks for a story
   */
  loadSubtasks(issueKey: string): void {
    this.isLoadingSubtasks = true;
    this.cdr.detectChanges();

    this.jiraService.getSubtasks(issueKey).subscribe({
      next: (response) => {
        this.storyViewer.subtasks = response.issues.map(subtask => ({
          id: subtask.id,
          key: subtask.key,
          summary: subtask.fields.summary,
          status: subtask.fields.status.name,
          timeEstimate: subtask.fields.timeestimate ? this.secondsToReadableTime(subtask.fields.timeestimate) : undefined,
          originalEstimate: subtask.fields.timeoriginalestimate,
          timeSpent: subtask.fields.timespent,
          assignee: subtask.fields.assignee?.displayName
        }));
        this.isLoadingSubtasks = false;
        this.cdr.detectChanges();
        
        // Automatically calculate FE/BE estimates when subtasks are loaded
        if (this.storyViewer.subtasks.length > 0) {
          this.calculateFeBeEstimates();
        }
      },
      error: (error) => {
        console.error('Error loading subtasks:', error);
        this.isLoadingSubtasks = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Generate subtasks using AI
   */
  generateSubtasks(): void {
    if (!this.storyViewer.issue.fields.description) {
      this.errorMessage = 'No description available for AI generation.';
      return;
    }

    this.isGeneratingAI = true;
    this.openAiService.generateSubtasksFromStory(this.storyViewer.issue.fields.description).subscribe({
      next: (subtasks) => {
        this.aiGeneratedSubtasks = subtasks;
        this.isGeneratingAI = false;
      },
      error: (error) => {
        this.isGeneratingAI = false;
        this.errorMessage = error.message || 'Failed to generate subtasks';
        console.error('Error generating subtasks:', error);
      }
    });
  }

  /**
   * Estimate story time using AI
   */
  estimateStoryTime(): void {
    this.isGeneratingAI = true;
    this.openAiService.estimateSubtaskTime(this.storyViewer.issue.fields.summary).subscribe({
      next: (estimate) => {
        this.aiEstimates = estimate;
        this.isGeneratingAI = false;
      },
      error: (error) => {
        this.isGeneratingAI = false;
        this.errorMessage = error.message || 'Failed to generate estimate';
        console.error('Error generating estimate:', error);
      }
    });
  }

  /**
   * Improve story title using AI
   */
  improveStoryTitle(): void {
    this.isGeneratingAI = true;
    this.openAiService.improveTaskTitle(this.storyViewer.issue.fields.summary).subscribe({
      next: (improvedTitle) => {
        this.aiImprovedTitle = improvedTitle;
        this.isGeneratingAI = false;
      },
      error: (error) => {
        this.isGeneratingAI = false;
        this.errorMessage = error.message || 'Failed to improve title';
        console.error('Error improving title:', error);
      }
    });
  }

  /**
   * Generate test cases using AI
   */
  generateTestCases(): void {
    this.isGeneratingAI = true;
    this.openAiService.generateTestCases(this.storyViewer.issue.fields.description || this.storyViewer.issue.fields.summary).subscribe({
      next: (testCases) => {
        this.aiTestCases = testCases;
        this.isGeneratingAI = false;
      },
      error: (error) => {
        this.isGeneratingAI = false;
        this.errorMessage = error.message || 'Failed to generate test cases';
        console.error('Error generating test cases:', error);
      }
    });
  }

  /**
   * Generate translations from story description
   */
  generateTranslations(): void {
    if (!this.storyViewer.issue.fields.description && !this.storyViewer.issue.fields.summary) {
      this.errorMessage = 'No description available for translation analysis.';
      return;
    }

    this.isGeneratingAI = true;
    this.errorMessage = '';
    
    this.openAiService.generateTranslations(this.storyViewer.issue.fields.description || this.storyViewer.issue.fields.summary).subscribe({
      next: (translations) => {
        this.aiTranslations = translations;
        this.isGeneratingAI = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isGeneratingAI = false;
        this.errorMessage = error.message || 'Failed to generate translations';
        console.error('Error generating translations:', error);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Generate corner case questions like a senior PO
   */
  generateCornerCaseQuestions(): void {
    if (!this.storyViewer.issue.fields.description && !this.storyViewer.issue.fields.summary) {
      this.errorMessage = 'No description available for corner case analysis.';
      return;
    }

    this.isGeneratingAI = true;
    this.errorMessage = '';
    
    this.openAiService.generateCornerCaseQuestions(this.storyViewer.issue.fields.description || this.storyViewer.issue.fields.summary).subscribe({
      next: (questions) => {
        this.aiCornerCaseQuestions = questions;
        this.isGeneratingAI = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isGeneratingAI = false;
        this.errorMessage = error.message || 'Failed to generate corner case questions';
        console.error('Error generating corner case questions:', error);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Get feature title
   */
  getFeatureTitle(): void {
    if (!this.storyViewer.issue.fields.summary) {
      this.errorMessage = 'No title available for conversion.';
      return;
    }

    this.isGeneratingAI = true;
    this.errorMessage = '';
    
    const prompt = `Convert this Jira title to a feature title format: <ticket-number>::Feature:: <meaningful feature title>
    
    Original title: "${this.storyViewer.issue.fields.summary}"
    Ticket number: ${this.storyViewer.issue.key}
    
    Please provide the converted title in the exact format specified.`;
    
    this.openAiService.generateFromPrompt(prompt).subscribe({
      next: (result) => {
        this.showAiResultsPopup('Feature Title', 'Converted title for feature implementation', result);
        this.isGeneratingAI = false;
      },
      error: (error) => {
        this.isGeneratingAI = false;
        this.errorMessage = error.message || 'Failed to generate feature title';
        console.error('Error generating feature title:', error);
      }
    });
  }

  /**
   * Get bug title
   */
  getBugTitle(): void {
    if (!this.storyViewer.issue.fields.summary) {
      this.errorMessage = 'No title available for conversion.';
      return;
    }

    this.isGeneratingAI = true;
    this.errorMessage = '';
    
    const prompt = `Convert this Jira title to a bug title format: <ticket-number>::Bug:: <meaningful bug title>
    
    Original title: "${this.storyViewer.issue.fields.summary}"
    Ticket number: ${this.storyViewer.issue.key}
    
    Please provide the converted title in the exact format specified.`;
    
    this.openAiService.generateFromPrompt(prompt).subscribe({
      next: (result) => {
        this.showAiResultsPopup('Bug Title', 'Converted title for bug fix', result);
        this.isGeneratingAI = false;
      },
      error: (error) => {
        this.isGeneratingAI = false;
        this.errorMessage = error.message || 'Failed to generate bug title';
        console.error('Error generating bug title:', error);
      }
    });
  }

  /**
   * Get hotfix title
   */
  getHotfixTitle(): void {
    if (!this.storyViewer.issue.fields.summary) {
      this.errorMessage = 'No title available for conversion.';
      return;
    }

    this.isGeneratingAI = true;
    this.errorMessage = '';
    
    const prompt = `Convert this Jira title to a hotfix title format: <ticket-number>::Hotfix:: <meaningful hotfix title>
    
    Original title: "${this.storyViewer.issue.fields.summary}"
    Ticket number: ${this.storyViewer.issue.key}
    
    Please provide the converted title in the exact format specified.`;
    
    this.openAiService.generateFromPrompt(prompt).subscribe({
      next: (result) => {
        this.showAiResultsPopup('Hotfix Title', 'Converted title for hotfix implementation', result);
        this.isGeneratingAI = false;
      },
      error: (error) => {
        this.isGeneratingAI = false;
        this.errorMessage = error.message || 'Failed to generate hotfix title';
        console.error('Error generating hotfix title:', error);
      }
    });
  }

  /**
   * Show AI results popup
   */
  showAiResultsPopup(title: string, description: string, content: string): void {
    this.aiResultsPopup = {
      isOpen: true,
      title: title,
      description: description,
      content: content
    };
  }

  /**
   * Close AI results popup
   */
  closeAiResultsPopup(): void {
    this.aiResultsPopup.isOpen = false;
  }

  /**
   * Calculate FE/BE estimates for the current story
   */
  calculateFeBeEstimates(): void {
    if (!this.storyViewer.issue.key) {
      this.errorMessage = 'No story selected for estimation.';
      return;
    }

    // Use already loaded subtasks instead of making a new API call
    if (this.storyViewer.subtasks.length === 0) {
      this.errorMessage = 'No subtasks available. Please load subtasks first.';
      return;
    }

    this.feBeEstimate.isCalculating = true;
    this.errorMessage = '';

    // Process subtasks locally - no API call needed!
    const feSubtasks: StorySubtask[] = [];
    const beSubtasks: StorySubtask[] = [];
    const missingEstimates: string[] = [];

    // Separate FE and BE subtasks using local data
    this.storyViewer.subtasks.forEach(subtask => {
      const summary = subtask.summary.toLowerCase();
      if (summary.includes('[fe]') || summary.includes('frontend') || summary.includes('ui')) {
        feSubtasks.push(subtask);
      } else if (summary.includes('[be]') || summary.includes('backend') || summary.includes('api')) {
        beSubtasks.push(subtask);
      }
    });

    // Calculate FE estimates locally
    const feEstimate = this.calculateEstimateForLocalSubtasks(feSubtasks, missingEstimates);
    
    // Calculate BE estimates locally
    const beEstimate = this.calculateEstimateForLocalSubtasks(beSubtasks, missingEstimates);

    // Create summary
    const totalSeconds = feEstimate + beEstimate;
    const totalReadable = this.secondsToReadableTime(totalSeconds);

    this.feBeEstimate = {
      feTotal: this.secondsToReadableTime(feEstimate),
      beTotal: this.secondsToReadableTime(beEstimate),
      totalEstimate: totalReadable,
      missingEstimates,
      isCalculated: true,
      isApproved: false,
      isPosting: false,
      isCalculating: false
    };

    this.cdr.detectChanges();
  }

  /**
   * Calculate estimate for local subtasks (no API call)
   */
  private calculateEstimateForLocalSubtasks(subtasks: StorySubtask[], missingEstimates: string[]): number {
    let totalSeconds = 0;

    subtasks.forEach(subtask => {
      // Skip discarded tasks
      if (subtask.status.toLowerCase() === 'discarded') {
        return;
      }

      if (subtask.originalEstimate && subtask.originalEstimate > 0) {
        totalSeconds += subtask.originalEstimate;
      } else {
        missingEstimates.push(subtask.key);
      }
    });

    return totalSeconds;
  }

  /**
   * Convert seconds to readable time format
   */
  private secondsToReadableTime(seconds: number): string {
    if (!seconds || seconds <= 0) return '0h';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '0h';
    }
  }

  /**
   * Get original estimate for a story
   */
  getOriginalEstimate(story: JiraIssue): string {
    const estimate = story.fields.timeoriginalestimate;
    if (!estimate || estimate <= 0) {
      return 'No estimate';
    }
    return this.secondsToReadableTime(estimate);
  }

  /**
   * Get time spent for a story
   */
  getTimeSpent(story: JiraIssue): string {
    const spent = story.fields.timespent;
    if (!spent || spent <= 0) {
      return '0h';
    }
    return this.secondsToReadableTime(spent);
  }

  /**
   * Get original estimate for a subtask
   */
  getSubtaskOriginalEstimate(subtask: StorySubtask): string {
    if (!subtask.originalEstimate || subtask.originalEstimate <= 0) {
      return 'No estimate';
    }
    return this.secondsToReadableTime(subtask.originalEstimate);
  }

  /**
   * Check if subtask has original estimate
   */
  hasSubtaskOriginalEstimate(subtask: StorySubtask): boolean {
    return !!(subtask.originalEstimate && subtask.originalEstimate > 0);
  }

  /**
   * Get subtasks without original estimates
   */
  getSubtasksWithoutOriginalEstimates(): StorySubtask[] {
    return this.storyViewer.subtasks.filter(subtask => !this.hasSubtaskOriginalEstimate(subtask));
  }

  /**
   * Check if any subtasks are missing original estimates
   */
  hasSubtasksWithoutOriginalEstimates(): boolean {
    return this.storyViewer.subtasks.some(subtask => !this.hasSubtaskOriginalEstimate(subtask));
  }

  /**
   * Format description text to render Jira-style formatting
   */
  formatDescription(description: string | undefined): string {
    if (!description) {
      return 'No description available.';
    }

    // Convert Jira-specific formatting to HTML
    let formatted = description
      // Jira color codes: {color:#color}text{color}
      .replace(/\{color:#([a-fA-F0-9]{6})\}(.*?)\{color\}/g, '<span style="color: #$1;">$2</span>')
      .replace(/\{color:#([a-fA-F0-9]{3})\}(.*?)\{color\}/g, '<span style="color: #$1$1$1;">$2</span>')
      
      // Headers (h1-h6)
      .replace(/^h1\. (.*$)/gim, '<h1 class="text-2xl font-bold text-text-light mt-6 mb-3">$1</h1>')
      .replace(/^h2\. (.*$)/gim, '<h2 class="text-xl font-semibold text-text-light mt-5 mb-2">$1</h2>')
      .replace(/^h3\. (.*$)/gim, '<h3 class="text-lg font-semibold text-text-light mt-4 mb-2">$1</h3>')
      .replace(/^h4\. (.*$)/gim, '<h4 class="text-base font-semibold text-text-light mt-3 mb-2">$1</h4>')
      .replace(/^h5\. (.*$)/gim, '<h5 class="text-sm font-semibold text-text-light mt-2 mb-1">$1</h5>')
      .replace(/^h6\. (.*$)/gim, '<h6 class="text-xs font-semibold text-text-light mt-2 mb-1">$1</h6>')
      
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/__(.*?)__/g, '<strong class="font-semibold">$1</strong>')
      
      // Italic text
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/_(.*?)_/g, '<em class="italic">$1</em>')
      
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 p-3 rounded text-sm overflow-x-auto my-3 border border-gray-700"><code class="text-green-400">$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-2 py-1 rounded text-sm text-green-400">$1</code>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank">$1</a>')
      
      // Lists
      .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-1">• $1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 mb-1">• $1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 mb-1">$&</li>')
      
      // Horizontal rules
      .replace(/^={3,}$/gim, '<hr class="border-gray-600 my-4">')
      .replace(/^-{3,}$/gim, '<hr class="border-gray-600 my-4">')
      
      // Line breaks and paragraphs
      .replace(/\n\n/g, '</p><p class="mb-3 leading-relaxed">')
      .replace(/\n/g, '<br>');

    // Wrap in paragraph tags
    formatted = '<p class="mb-3 leading-relaxed">' + formatted + '</p>';
    
    // Fix list formatting
    formatted = formatted
      .replace(/<p class="mb-3 leading-relaxed">(<li.*?)<\/p>/g, '<ul class="list-disc ml-4 mb-3 space-y-1">$1</ul>')
      .replace(/<\/ul><ul class="list-disc ml-4 mb-3 space-y-1">/g, '')
      .replace(/<li class="ml-4 mb-1">• (.*?)<\/li>/g, '<li class="ml-4 mb-1">$1</li>');

    return formatted;
  }

  /**
   * Approve the FE/BE estimation results
   */
  approveFeBeEstimates(): void {
    this.feBeEstimate.isApproved = true;
  }

  /**
   * Post FE/BE estimation summary to Jira as a comment
   */
  postFeBeEstimateToJira(): void {
    if (!this.feBeEstimate.isCalculated || !this.storyViewer.issue.key) {
      this.errorMessage = 'No estimation available to post.';
      return;
    }

    this.feBeEstimate.isPosting = true;
    this.errorMessage = '';

    const commentBody = this.buildFeBeCommentBody();
    
    this.jiraService.postComment(this.storyViewer.issue.key, commentBody).subscribe({
      next: () => {
        this.feBeEstimate.isPosting = false;
        this.errorMessage = '';
        // Show success message
        setTimeout(() => {
          this.resetFeBeEstimate();
        }, 2000);
      },
      error: (error) => {
        this.feBeEstimate.isPosting = false;
        this.errorMessage = error.message || 'Failed to post estimation to Jira';
        console.error('Error posting estimation:', error);
      }
    });
  }

  /**
   * Build the FE/BE estimation comment body for Jira
   */
  private buildFeBeCommentBody(): string {
    const { feTotal, beTotal, totalEstimate, missingEstimates } = this.feBeEstimate;
    const userEmail = this.jiraService.getEmail() || 'Unknown User';

    let comment = `🧠 **Time Estimate Summary for ${this.storyViewer.issue.key}:**\n\n`;
    
    if (feTotal !== '0h' || beTotal !== '0h') {
      comment += `- 🟢 **Frontend:** ${feTotal}\n`;
      comment += `- 🔵 **Backend:** ${beTotal}\n\n`;
    }

    if (missingEstimates.length > 0) {
      comment += `⚠️ **Subtasks with missing estimates:**\n`;
      missingEstimates.forEach(key => {
        comment += `- ${key}\n`;
      });
      comment += '\n';
    }

    comment += `---\n`;
    comment += `*Comment posted by: ${userEmail} (via Devflow)*`;

    return comment;
  }

  /**
   * Reset FE/BE estimation
   */
  resetFeBeEstimate(): void {
    this.feBeEstimate = {
      feTotal: '',
      beTotal: '',
      totalEstimate: '',
      missingEstimates: [],
      isCalculated: false,
      isApproved: false,
      isPosting: false,
      isCalculating: false
    };
  }

  /**
   * Close story viewer
   */
  closeStoryViewer(): void {
    this.storyViewer.isOpen = false;
    this.isLoadingSubtasks = false; // Reset loading state
    this.aiGeneratedSubtasks = [];
    this.aiEstimates = '';
    this.aiImprovedTitle = '';
    this.aiTestCases = [];
    this.aiTranslations = '';
    this.aiCornerCaseQuestions = [];
    this.resetFeBeEstimate();
  }

  /**
   * Toggle section expansion
   */
  toggleSection(section: 'details' | 'description' | 'aiTools' | 'subtasks'): void {
    switch (section) {
      case 'details':
        this.isDetailsExpanded = !this.isDetailsExpanded;
        break;
      case 'description':
        this.isDescriptionExpanded = !this.isDescriptionExpanded;
        break;
      case 'aiTools':
        this.isAiToolsExpanded = !this.isAiToolsExpanded;
        break;
      case 'subtasks':
        this.isSubtasksExpanded = !this.isSubtasksExpanded;
        break;
    }
    this.cdr.detectChanges();
  }

  /**
   * Get status color classes
   */
  getStatusColor(status: string): string {
    const statusLower = status.toLowerCase();
    
    // Done/Complete statuses
    if (statusLower.includes('done') || statusLower.includes('complete') || statusLower.includes('closed') || statusLower.includes('resolved')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    }
    
    // In Progress statuses
    if (statusLower.includes('progress') || statusLower.includes('in progress') || statusLower.includes('active') || statusLower.includes('development')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }
    
    // In Review statuses
    if (statusLower.includes('review') || statusLower.includes('testing') || statusLower.includes('qa') || statusLower.includes('verification')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    }
    
    // To Do statuses
    if (statusLower.includes('todo') || statusLower.includes('to do') || statusLower.includes('open') || statusLower.includes('new')) {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
    
    // Blocked statuses
    if (statusLower.includes('blocked') || statusLower.includes('waiting') || statusLower.includes('on hold')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    }
    
    // Ready statuses
    if (statusLower.includes('ready') || statusLower.includes('approved') || statusLower.includes('accepted')) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
    
    // Default fallback
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }

  /**
   * Get priority color classes
   */
  getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  /**
   * Get issue type color classes
   */
  getIssueTypeColor(type: string): string {
    const typeLower = type.toLowerCase();
    
    switch (typeLower) {
      case 'story': 
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'bug': 
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'subtask': 
        return 'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400';
      case 'epic': 
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'task': 
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'improvement': 
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'feature': 
      case 'new feature': 
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'technical debt': 
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'spike': 
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400';
      default: 
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  /**
   * Get Frontend subtasks
   */
  getFeSubtasks(): StorySubtask[] {
    return this.storyViewer.subtasks.filter(subtask => {
      const summary = subtask.summary.toLowerCase();
      return summary.includes('[fe]') || summary.includes('frontend') || summary.includes('ui') || 
             summary.includes('react') || summary.includes('angular') || summary.includes('vue');
    });
  }

  /**
   * Get Backend subtasks
   */
  getBeSubtasks(): StorySubtask[] {
    return this.storyViewer.subtasks.filter(subtask => {
      const summary = subtask.summary.toLowerCase();
      return summary.includes('[be]') || summary.includes('backend') || summary.includes('api') || 
             summary.includes('server') || summary.includes('database') || summary.includes('db');
    });
  }

  /**
   * Get Other subtasks (not clearly FE or BE)
   */
  getOtherSubtasks(): StorySubtask[] {
    const feSubtasks = this.getFeSubtasks();
    const beSubtasks = this.getBeSubtasks();
    return this.storyViewer.subtasks.filter(subtask => 
      !feSubtasks.includes(subtask) && !beSubtasks.includes(subtask)
    );
  }

  /**
   * Format time estimate for display
   */
  formatTimeEstimate(seconds: number): string {
    if (!seconds || seconds <= 0) return '0h';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Get display name for issue type
   */
  getIssueTypeDisplayName(issueType: string): string {
    const typeLower = issueType.toLowerCase();
    
    switch (typeLower) {
      case 'bug':
        return 'Bug';
      case 'epic':
        return 'Epic';
      case 'subtask':
        return 'Subtask';
      case 'story':
        return 'Story';
      case 'task':
        return 'Task';
      case 'improvement':
        return 'Improvement';
      case 'new feature':
        return 'Feature';
      case 'feature':
        return 'Feature';
      case 'technical debt':
        return 'Technical Debt';
      case 'spike':
        return 'Spike';
      default:
        return issueType;
    }
  }

  /**
   * Get card background color based on issue type
   */
  getCardBackgroundColor(issueType: string): string {
    const typeLower = issueType.toLowerCase();
    
    switch (typeLower) {
      case 'story': 
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
      case 'bug': 
        return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
      case 'subtask': 
        return 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800';
      case 'epic': 
        return 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800';
      case 'task': 
        return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
      case 'improvement': 
        return 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800';
      case 'feature': 
      case 'new feature': 
        return 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800';
      case 'technical debt': 
        return 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800';
      case 'spike': 
        return 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800';
      default: 
        return 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700';
    }
  }

  /**
   * Check if a task is failed and assigned to me
   */
  isFailedTaskAssignedToMe(story: JiraIssue): boolean {
    const userEmail = this.jiraService.getEmail();
    const isAssignedToMe = story.fields.assignee?.emailAddress === userEmail;
    const isFailed = this.isFailedStatus(story.fields.status.name);
    return isAssignedToMe && isFailed;
  }

  /**
   * Check if status indicates a failed task
   */
  isFailedStatus(status: string): boolean {
    const statusLower = status.toLowerCase();
    
    // Explicit failed statuses
    if (statusLower.includes('failed') || 
        statusLower.includes('blocked') || 
        statusLower.includes('rejected') || 
        statusLower.includes('cancelled') ||
        statusLower.includes('on hold') ||
        statusLower.includes('stopped')) {
      return true;
    }
    
    // Check if it's NOT a successful status
    const successfulStatuses = ['done', 'closed', 'resolved', 'complete', 'finished', 'approved'];
    const isSuccessful = successfulStatuses.some(successStatus => 
      statusLower.includes(successStatus)
    );
    
    // If it's not a successful status and not in progress, consider it failed
    const inProgressStatuses = ['in progress', 'in review', 'testing', 'to do', 'open', 'new'];
    const isInProgress = inProgressStatuses.some(progressStatus => 
      statusLower.includes(progressStatus)
    );
    
    return !isSuccessful && !isInProgress;
  }

  /**
   * Get all available issue types from current stories (for debugging)
   */
  getAvailableIssueTypes(): string[] {
    const issueTypes = new Set<string>();
    this.sprintStories.forEach(story => {
      issueTypes.add(story.fields.issuetype.name);
    });
    return Array.from(issueTypes).sort();
  }

  /**
   * Get count of failed stories
   */
  getFailedStoriesCount(): number {
    return this.sprintStories.filter(story => 
      this.isFailedStatus(story.fields.status.name)
    ).length;
  }

  /**
   * Copy text to clipboard
   */
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  }

  /**
   * Create GitLab branch for current task using GitLab Jira Connect
   */
  createGitLabBranch(): void {
    if (!this.storyViewer.issue) {
      this.errorMessage = 'No task selected.';
      return;
    }

    // Generate the GitLab Jira Connect URL
    const issueKey = this.storyViewer.issue.key;
    const issueSummary = encodeURIComponent(this.storyViewer.issue.fields.summary);
    const gitlabUrl = this.gitlabService.getGitLabUrl() || 'https://gitlab.com';
    
    // Create the GitLab Jira Connect URL
    const jiraConnectUrl = `${gitlabUrl}/-/jira_connect/branches/new?addonkey=gitlab-jira-connect-gitlab.com&issue_key=${issueKey}&issue_summary=${issueSummary}`;
    
    // Open the URL in a new tab
    window.open(jiraConnectUrl, '_blank');
  }
} 