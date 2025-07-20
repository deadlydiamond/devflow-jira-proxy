import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { JiraService } from './jira';
import { ToastService } from './toast';
import { SlackMessageService, DeploymentLink } from './slack-message.service';

@Injectable({
  providedIn: 'root'
})
export class JiraUpdateService {
  private readonly jiraService = inject(JiraService);
  private readonly toastService = inject(ToastService);
  private readonly slackMessageService = inject(SlackMessageService);

  /**
   * Update Jira issue status when deployment completes
   */
  updateJiraStatusForDeployment(jobId: string): Observable<boolean> {
    const link = this.slackMessageService.getDeploymentLink(jobId);
    
    if (!link) {
      console.warn(`No deployment link found for job ${jobId}`);
      this.toastService.warning(`No Jira issue linked to deployment ${jobId}`);
      return of(false);
    }

    if (!this.jiraService.getToken() || !this.jiraService.getJiraUrl()) {
      console.warn('Jira not configured');
      this.toastService.error('Jira not configured. Please configure Jira in Settings.');
      return of(false);
    }

    console.log(`🔄 Updating Jira issue ${link.jiraId} for deployment ${jobId}`);

    // First get the current issue status
    return this.jiraService.getIssue(link.jiraId).pipe(
      switchMap(issue => {
        const currentStatus = issue.fields.status.name;
        console.log(`📊 Current Jira status for ${link.jiraId}: ${currentStatus}`);
        
        // Check if status is already appropriate
        if (this.isStatusAppropriate(currentStatus)) {
          console.log(`✅ Jira status is already appropriate: ${currentStatus}`);
          this.toastService.success(`Jira issue ${link.jiraId} is already in appropriate status: ${currentStatus}`);
          return of(true);
        }

        // Update to "Ready for Test" or similar
        return this.transitionToReadyForTest(link.jiraId, currentStatus);
      }),
      tap(success => {
        if (success) {
          console.log(`✅ Successfully updated Jira issue ${link.jiraId}`);
          this.toastService.success(`Updated Jira issue ${link.jiraId} to "Ready for Test"`);
        }
      }),
      catchError(error => {
        console.error('Failed to update Jira status:', error);
        this.handleJiraError(error, link.jiraId);
        return of(false);
      })
    );
  }

  /**
   * Check if current status is already appropriate
   */
  private isStatusAppropriate(status: string): boolean {
    const statusLower = status.toLowerCase();
    return statusLower.includes('ready for test') || 
           statusLower.includes('ready to test') ||
           statusLower.includes('testing') ||
           statusLower.includes('done') ||
           statusLower.includes('complete');
  }

  /**
   * Transition issue to "Ready for Test" status
   */
  private transitionToReadyForTest(issueKey: string, currentStatus: string): Observable<boolean> {
    console.log(`🔄 Transitioning ${issueKey} from "${currentStatus}" to "Ready for Test"`);
    
    // Get available transitions
    return this.jiraService.getIssueTransitions(issueKey).pipe(
      switchMap(response => {
        const readyForTestTransition = this.findReadyForTestTransition(response.transitions);
        
        if (!readyForTestTransition) {
          console.warn(`No "Ready for Test" transition available for ${issueKey}`);
          this.toastService.warning(`No "Ready for Test" transition available for ${issueKey}`);
          return of(false);
        }

        // Execute the transition
        return this.jiraService.transitionIssue(issueKey, readyForTestTransition.id).pipe(
          tap(() => {
            console.log(`✅ Successfully transitioned ${issueKey} to "Ready for Test"`);
          }),
          switchMap(() => of(true))
        );
      }),
      catchError(error => {
        console.error('Failed to transition issue:', error);
        this.handleJiraError(error, issueKey);
        return of(false);
      })
    );
  }

  /**
   * Find the appropriate "Ready for Test" transition
   */
  private findReadyForTestTransition(transitions: any[]): any {
    const readyForTestKeywords = [
      'ready for test',
      'ready to test',
      'testing',
      'test ready',
      'qa ready'
    ];

    return transitions.find(transition => {
      const transitionName = transition.name.toLowerCase();
      return readyForTestKeywords.some(keyword => transitionName.includes(keyword));
    });
  }

  /**
   * Handle Jira API errors
   */
  private handleJiraError(error: any, issueKey: string): void {
    if (error.status === 404) {
      this.toastService.error(`Jira issue ${issueKey} not found`);
    } else if (error.status === 401) {
      this.toastService.error('Invalid Jira credentials. Please check your configuration.');
    } else if (error.status === 403) {
      this.toastService.error('Insufficient permissions to update Jira issue');
    } else {
      this.toastService.error(`Failed to update Jira issue ${issueKey}: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Batch update multiple deployments
   */
  updateMultipleDeployments(jobIds: string[]): Observable<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };
    
    if (jobIds.length === 0) {
      return of(results);
    }

    console.log(`🔄 Batch updating ${jobIds.length} deployments`);

    // Process each deployment sequentially
    return this.processDeploymentsSequentially(jobIds, results);
  }

  /**
   * Process deployments sequentially to avoid overwhelming the API
   */
  private processDeploymentsSequentially(
    jobIds: string[], 
    results: { success: string[], failed: string[] },
    index: number = 0
  ): Observable<{ success: string[], failed: string[] }> {
    if (index >= jobIds.length) {
      return of(results);
    }

    const jobId = jobIds[index];
    
    return this.updateJiraStatusForDeployment(jobId).pipe(
      switchMap(success => {
        if (success) {
          results.success.push(jobId);
        } else {
          results.failed.push(jobId);
        }

        // Add a small delay between requests and continue with next deployment
        return new Observable<{ success: string[], failed: string[] }>(observer => {
          setTimeout(() => {
            this.processDeploymentsSequentially(jobIds, results, index + 1).subscribe({
              next: (finalResults) => observer.next(finalResults),
              error: (error) => observer.error(error),
              complete: () => observer.complete()
            });
          }, 1000);
        });
      })
    );
  }

  /**
   * Get deployment links that need updates
   */
  getDeploymentsNeedingUpdates(): DeploymentLink[] {
    const links = this.slackMessageService.getDeploymentLinks();
    return links.filter(link => link.status === 'SUCCESSFUL');
  }

  /**
   * Manual trigger for updating all successful deployments
   */
  updateAllSuccessfulDeployments(): Observable<{ success: string[], failed: string[] }> {
    const successfulDeployments = this.getDeploymentsNeedingUpdates();
    const jobIds = successfulDeployments.map(link => link.jobId);
    
    if (jobIds.length === 0) {
      this.toastService.info('No successful deployments found that need updates');
      return of({ success: [], failed: [] });
    }

    console.log(`🔄 Updating ${jobIds.length} successful deployments`);
    this.toastService.info(`Updating ${jobIds.length} Jira issues...`);
    
    return this.updateMultipleDeployments(jobIds);
  }
} 