import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SlackMessageService, SlackDeploymentMessage, DeploymentLink } from '../../services/slack-message.service';
import { JiraUpdateService } from '../../services/jira-update.service';
import { SlackService } from '../../services/slack';
import { JiraService } from '../../services/jira';
import { ToastService } from '../../services/toast';
import { SlackMessageCardComponent } from '../../components/slack-message-card/slack-message-card';
import { TrackDeploymentDialogComponent, TrackDeploymentData } from '../../components/track-deployment-dialog/track-deployment-dialog';

@Component({
  selector: 'app-slack-deployment-tracker',
  standalone: true,
  imports: [
    CommonModule, 
    SlackMessageCardComponent, 
    TrackDeploymentDialogComponent
  ],
  templateUrl: './slack-deployment-tracker.html',
  styleUrl: './slack-deployment-tracker.css'
})
export class SlackDeploymentTrackerComponent implements OnInit, OnDestroy {
  private readonly slackMessageService = inject(SlackMessageService);
  private readonly jiraUpdateService = inject(JiraUpdateService);
  private readonly slackService = inject(SlackService);
  private readonly jiraService = inject(JiraService);
  private readonly toastService = inject(ToastService);

  private subscriptions = new Subscription();

  // Component state
  messages: SlackDeploymentMessage[] = [];
  deploymentLinks: DeploymentLink[] = [];
  isListening = false;
  showTrackDialog = false;
  trackDialogData: TrackDeploymentData | null = null;
  isUpdatingJira = false;

  ngOnInit(): void {
    this.subscribeToServices();
    this.checkConfiguration();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Subscribe to service observables
   */
  private subscribeToServices(): void {
    // Subscribe to messages
    this.subscriptions.add(
      this.slackMessageService.messages$.subscribe(messages => {
        this.messages = messages;
      })
    );

    // Subscribe to deployment links
    this.subscriptions.add(
      this.slackMessageService.deploymentLinks$.subscribe(links => {
        this.deploymentLinks = links;
      })
    );

    // Subscribe to listening status
    this.subscriptions.add(
      this.slackMessageService.isListening$.subscribe(isListening => {
        this.isListening = isListening;
      })
    );
  }

  /**
   * Check if services are properly configured
   */
  private checkConfiguration(): void {
    const slackConfigured = !!(this.slackService.getToken() && this.slackService.getChannelId());
    const jiraConfigured = !!(this.jiraService.getToken() && this.jiraService.getJiraUrl());

    if (!slackConfigured) {
      this.toastService.warning('Slack not configured. Please configure Slack in Settings.');
    }

    if (!jiraConfigured) {
      this.toastService.warning('Jira not configured. Please configure Jira in Settings.');
    }
  }

  /**
   * Handle track deployment button click
   */
  onTrackDeployment(data: { jobId: string; message: SlackDeploymentMessage }): void {
    this.trackDialogData = {
      jobId: data.jobId,
      message: data.message
    };
    this.showTrackDialog = true;
  }

  /**
   * Handle dialog close
   */
  onCloseTrackDialog(): void {
    this.showTrackDialog = false;
    this.trackDialogData = null;
  }

  /**
   * Handle deployment tracked event
   */
  onDeploymentTracked(data: { jobId: string; jiraId: string }): void {
    console.log(`✅ Deployment ${data.jobId} linked to ${data.jiraId}`);
    this.onCloseTrackDialog();
  }

  /**
   * Refresh messages manually
   */
  refreshMessages(): void {
    this.slackMessageService.refreshMessages();
  }

  /**
   * Update all successful deployments
   */
  updateAllSuccessfulDeployments(): void {
    this.isUpdatingJira = true;
    
    this.jiraUpdateService.updateAllSuccessfulDeployments().subscribe({
      next: (result) => {
        this.isUpdatingJira = false;
        
        if (result.success.length > 0) {
          this.toastService.success(`Updated ${result.success.length} Jira issues successfully`);
        }
        
        if (result.failed.length > 0) {
          this.toastService.error(`Failed to update ${result.failed.length} Jira issues`);
        }
      },
      error: (error) => {
        this.isUpdatingJira = false;
        console.error('Failed to update deployments:', error);
        this.toastService.error('Failed to update deployments');
      }
    });
  }

  /**
   * Clear all deployment links
   */
  clearAllLinks(): void {
    if (confirm('Are you sure you want to clear all deployment links? This action cannot be undone.')) {
      this.slackMessageService.clearAllLinks();
    }
  }

  /**
   * Get successful deployments count
   */
  getSuccessfulDeploymentsCount(): number {
    return this.messages.filter(m => m.status === 'SUCCESSFUL').length;
  }

  /**
   * Get failed deployments count
   */
  getFailedDeploymentsCount(): number {
    return this.messages.filter(m => m.status === 'FAILED').length;
  }

  /**
   * Get started deployments count
   */
  getStartedDeploymentsCount(): number {
    return this.messages.filter(m => m.status === 'STARTED').length;
  }

  /**
   * Get tracked deployments count
   */
  getTrackedDeploymentsCount(): number {
    return this.deploymentLinks.length;
  }

  /**
   * Get deployments needing updates
   */
  getDeploymentsNeedingUpdates(): DeploymentLink[] {
    return this.jiraUpdateService.getDeploymentsNeedingUpdates();
  }

  /**
   * Check if Slack is configured
   */
  isSlackConfigured(): boolean {
    return !!(this.slackService.getToken() && this.slackService.getChannelId());
  }

  /**
   * Check if Jira is configured
   */
  isJiraConfigured(): boolean {
    return !!(this.jiraService.getToken() && this.jiraService.getJiraUrl());
  }

  /**
   * Get connection status text
   */
  getConnectionStatus(): string {
    const slackStatus = this.isSlackConfigured() ? 'Connected' : 'Not Connected';
    const jiraStatus = this.isJiraConfigured() ? 'Connected' : 'Not Connected';
    return `Slack: ${slackStatus} | Jira: ${jiraStatus}`;
  }

  /**
   * Get listening status text
   */
  getListeningStatus(): string {
    if (!this.isSlackConfigured()) {
      return 'Slack not configured';
    }
    return this.isListening ? 'Listening for new messages...' : 'Not listening';
  }

  /**
   * Load sample messages for testing (temporary)
   */
  loadSampleMessages(): void {
    const sampleMessages: SlackDeploymentMessage[] = [
      {
        id: '1',
        text: "STARTED: Job 'STG-Frontend [1492]' (<https://deploy.whitehelmet.sa/job/STG-Frontend/1492/>)",
        timestamp: Date.now().toString(),
        jobId: '1492',
        status: 'STARTED',
        deploymentUrl: 'https://deploy.whitehelmet.sa/job/STG-Frontend/1492/',
        channel: 'deployments',
        user: 'jenkins'
      },
      {
        id: '2',
        text: "SUCCESSFUL: Job 'STG-Frontend [1491]' (<https://deploy.whitehelmet.sa/job/STG-Frontend/1491/>)",
        timestamp: (Date.now() - 300000).toString(),
        jobId: '1491',
        status: 'SUCCESSFUL',
        deploymentUrl: 'https://deploy.whitehelmet.sa/job/STG-Frontend/1491/',
        channel: 'deployments',
        user: 'jenkins'
      },
      {
        id: '3',
        text: "FAILED: Job 'STG-Backend [1490]' (<https://deploy.whitehelmet.sa/job/STG-Backend/1490/>)",
        timestamp: (Date.now() - 600000).toString(),
        jobId: '1490',
        status: 'FAILED',
        deploymentUrl: 'https://deploy.whitehelmet.sa/job/STG-Backend/1490/',
        channel: 'deployments',
        user: 'jenkins'
      }
    ];

    // Update the messages directly
    this.messages = sampleMessages;
    this.toastService.success('Loaded sample deployment messages for testing');
  }
} 