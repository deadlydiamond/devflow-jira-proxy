import { Component, EventEmitter, Output, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SlackMessageService, SlackDeploymentMessage } from '../../services/slack-message.service';
import { JiraService } from '../../services/jira';
import { ToastService } from '../../services/toast';

export interface TrackDeploymentData {
  jobId: string;
  message: SlackDeploymentMessage;
}

@Component({
  selector: 'app-track-deployment-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './track-deployment-dialog.html',
  styleUrl: './track-deployment-dialog.css'
})
export class TrackDeploymentDialogComponent {
  private readonly slackMessageService = inject(SlackMessageService);
  private readonly jiraService = inject(JiraService);
  private readonly toastService = inject(ToastService);

  @Input() data: TrackDeploymentData | null = null;
  @Output() closeDialog = new EventEmitter<void>();
  @Output() deploymentTracked = new EventEmitter<{ jobId: string; jiraId: string }>();

  jiraId = '';
  isSubmitting = false;

  /**
   * Set dialog data
   */
  setData(data: TrackDeploymentData): void {
    this.data = data;
    this.jiraId = '';
    this.isSubmitting = false;
  }

  /**
   * Get job name from data
   */
  getJobName(): string {
    if (!this.data) return '';
    const match = this.data.message.text.match(/Job\s+'([^']+)'/);
    return match ? match[1] : 'Unknown Job';
  }

  /**
   * Get job ID from data
   */
  getJobId(): string {
    return this.data?.jobId || '';
  }

  /**
   * Get deployment status
   */
  getDeploymentStatus(): string {
    return this.data?.message.status || 'UNKNOWN';
  }

  /**
   * Get deployment URL
   */
  getDeploymentUrl(): string | null {
    return this.data?.message.deploymentUrl || null;
  }

  /**
   * Check if Jira is configured
   */
  isJiraConfigured(): boolean {
    return !!(this.jiraService.getToken() && this.jiraService.getJiraUrl());
  }

  /**
   * Validate Jira ID format
   */
  isValidJiraId(): boolean {
    if (!this.jiraId) return false;
    // Basic validation for Jira issue key format (e.g., PROJ-123)
    const jiraIdPattern = /^[A-Z]+-\d+$/;
    return jiraIdPattern.test(this.jiraId.toUpperCase());
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (!this.data || !this.jiraId || !this.isValidJiraId()) {
      this.toastService.error('Please enter a valid Jira issue ID (e.g., PROJ-123)');
      return;
    }

    if (!this.isJiraConfigured()) {
      this.toastService.error('Please configure Jira in Settings first');
      return;
    }

    this.isSubmitting = true;

    try {
      // Validate that the Jira issue exists
      await this.jiraService.getIssue(this.jiraId.toUpperCase()).toPromise();
      
      // Add the deployment link
      this.slackMessageService.addDeploymentLink(this.data.jobId, this.jiraId.toUpperCase());
      
      // Emit success event
      this.deploymentTracked.emit({
        jobId: this.data.jobId,
        jiraId: this.jiraId.toUpperCase()
      });
      
      this.toastService.success(`Linked deployment ${this.data.jobId} to ${this.jiraId.toUpperCase()}`);
      this.closeDialog.emit();
      
    } catch (error: any) {
      console.error('Failed to link deployment:', error);
      
      if (error.status === 404) {
        this.toastService.error(`Jira issue ${this.jiraId.toUpperCase()} not found`);
      } else if (error.status === 401) {
        this.toastService.error('Invalid Jira credentials. Please check your configuration.');
      } else {
        this.toastService.error(`Failed to link deployment: ${error.message || 'Unknown error'}`);
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Handle cancel
   */
  onCancel(): void {
    this.closeDialog.emit();
  }

  /**
   * Handle key press
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.isValidJiraId() && !this.isSubmitting) {
      this.onSubmit();
    }
  }
} 