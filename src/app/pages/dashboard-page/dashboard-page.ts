import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LocalStorageService } from '../../services/local-storage';
import { JiraService } from '../../services/jira';
import { CardComponent } from '../../components/card/card';

interface PinnedStory {
  key: string;
  summary: string;
  status: string;
  priority: string;
  assignee?: string;
}

interface LastAction {
  type: 'story_pinned' | 'deployment_tracked' | 'estimate_posted';
  title: string;
  timestamp: Date;
  description: string;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css'
})
export class DashboardPageComponent implements OnInit {
  private readonly localStorage = inject(LocalStorageService);
  private readonly jiraService = inject(JiraService);
  private readonly router = inject(Router);
  
  lastAction: LastAction | null = null;

  ngOnInit(): void {
    this.loadLastAction();
  }

  /**
   * Check if Jira is connected
   */
  isJiraConnected(): boolean {
    return !!(this.jiraService.getToken() && this.jiraService.getEmail() && this.jiraService.getJiraUrl());
  }

  /**
   * Get Jira URL
   */
  getJiraUrl(): string {
    return this.jiraService.getJiraUrl() || '';
  }

  /**
   * Get Jira email
   */
  getJiraEmail(): string {
    return this.jiraService.getEmail() || '';
  }

  /**
   * Check if Slack is connected
   */
  isSlackConnected(): boolean {
    return !!this.localStorage.get<string>('slack_webhook_url', '');
  }

  /**
   * Get Slack channel
   */
  getSlackChannel(): string {
    return this.localStorage.get<string>('slack_channel', '') || '';
  }

  /**
   * Get current sprint from localStorage
   */
  getCurrentSprint(): any {
    const sprintId = this.localStorage.get<string>('jiraSprintId', '');
    const sprintName = this.localStorage.get<string>('jiraSprintName', '');
    const sprintState = this.localStorage.get<string>('jiraSprintState', '');
    
    if (sprintId && sprintName) {
      return {
        id: sprintId,
        name: sprintName,
        state: sprintState || 'active'
      };
    }
    return null;
  }

  /**
   * Get sprint statistics
   */
  getSprintStats(): any {
    const pinnedStories = this.getPinnedStories();
    const total = pinnedStories.length;
    const completed = pinnedStories.filter(s => s.status.toLowerCase().includes('done')).length;
    const inProgress = pinnedStories.filter(s => s.status.toLowerCase().includes('progress')).length;
    
    return { total, completed, inProgress };
  }

  /**
   * Get pinned stories
   */
  getPinnedStories(): PinnedStory[] {
    const pinnedIds = this.localStorage.get<string[]>('pinnedStoryIds', []);
    const stories: PinnedStory[] = [];
    
    // This would ideally fetch from Jira, but for now we'll use localStorage
    if (pinnedIds) {
      pinnedIds.forEach(key => {
        const storyData = this.localStorage.get<any>(`story_${key}`, null);
        if (storyData) {
          stories.push(storyData);
        }
      });
    }
    
    return stories;
  }



  private loadLastAction(): void {
    const action = this.localStorage.get<LastAction>('last_action', undefined);
    this.lastAction = action || null;
  }

  /**
   * Navigate to Sprint Workspace
   */
  openSprintWorkspace(): void {
    this.router.navigate(['/sprint-workspace']);
  }



  getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  }

  getStatusColor(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('done') || statusLower.includes('complete')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    } else if (statusLower.includes('progress') || statusLower.includes('in progress')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    } else {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  getActionIcon(type: string): string {
    switch (type) {
      case 'story_pinned': return '📌';
      case 'deployment_tracked': return '🚀';
      case 'estimate_posted': return '📊';
      default: return '📋';
    }
  }
}
