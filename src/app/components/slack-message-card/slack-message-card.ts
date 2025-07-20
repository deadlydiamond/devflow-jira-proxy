import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SlackMessageService, SlackDeploymentMessage, DeploymentLink } from '../../services/slack-message.service';
import { JiraService } from '../../services/jira';

@Component({
  selector: 'app-slack-message-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slack-message-card.html',
  styleUrl: './slack-message-card.css'
})
export class SlackMessageCardComponent {
  private readonly slackMessageService = inject(SlackMessageService);
  private readonly jiraService = inject(JiraService);

  @Input() message!: SlackDeploymentMessage;
  @Output() trackDeployment = new EventEmitter<{ jobId: string; message: SlackDeploymentMessage }>();

  /**
   * Get deployment link for this message
   */
  getDeploymentLink(): DeploymentLink | undefined {
    if (!this.message.jobId) return undefined;
    return this.slackMessageService.getDeploymentLink(this.message.jobId);
  }

  /**
   * Check if this deployment is already tracked
   */
  isTracked(): boolean {
    return !!this.getDeploymentLink();
  }

  /**
   * Get status color class
   */
  getStatusColor(): string {
    switch (this.message.status) {
      case 'SUCCESSFUL':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'STARTED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  /**
   * Get status icon
   */
  getStatusIcon(): string {
    switch (this.message.status) {
      case 'SUCCESSFUL':
        return '✅';
      case 'FAILED':
        return '❌';
      case 'STARTED':
        return '🚀';
      default:
        return '❓';
    }
  }

  /**
   * Get formatted timestamp
   */
  getFormattedTimestamp(): string {
    const timestamp = parseFloat(this.message.timestamp);
    if (isNaN(timestamp)) {
      return new Date().toLocaleString();
    }
    return new Date(timestamp * 1000).toLocaleString();
  }

  /**
   * Extract job name from message
   */
  getJobName(): string {
    const match = this.message.text.match(/Job\s+'([^']+)'/);
    return match ? match[1] : 'Unknown Job';
  }

  /**
   * Handle track button click
   */
  onTrackClick(): void {
    if (this.message.jobId) {
      this.trackDeployment.emit({
        jobId: this.message.jobId,
        message: this.message
      });
    }
  }

  /**
   * Handle untrack button click
   */
  onUntrackClick(): void {
    if (this.message.jobId) {
      this.slackMessageService.removeDeploymentLink(this.message.jobId);
    }
  }

  /**
   * Get linked Jira issue summary
   */
  getLinkedJiraSummary(): string {
    const link = this.getDeploymentLink();
    if (!link) return '';
    
    // This would ideally fetch from Jira, but for now return the ID
    return link.jiraId;
  }

  /**
   * Check if Jira is configured
   */
  isJiraConfigured(): boolean {
    return !!(this.jiraService.getToken() && this.jiraService.getJiraUrl());
  }

  /**
   * Get deployment URL for external link
   */
  getDeploymentUrl(): string | null {
    return this.message.deploymentUrl || null;
  }
} 