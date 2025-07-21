import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, timer, of } from 'rxjs';
import { catchError, map, switchMap, retryWhen, take, tap } from 'rxjs/operators';
import { LocalStorageService } from './local-storage';
import { ToastService } from './toast';
import { JiraService } from './jira';
import { SlackService } from './slack';

export interface SlackDeploymentMessage {
  id: string;
  text: string;
  timestamp: string;
  jobId?: string;
  status: 'STARTED' | 'SUCCESSFUL' | 'FAILED' | 'UNKNOWN';
  deploymentUrl?: string;
  channel: string;
  user?: string;
}

export interface DeploymentLink {
  jobId: string;
  jiraId: string;
  status: 'STARTED' | 'SUCCESSFUL' | 'FAILED' | 'UNKNOWN';
  updatedAt: Date;
  lastMessageId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SlackMessageService {
  private readonly slackService = inject(SlackService);
  private readonly toastService = inject(ToastService);
  private readonly localStorage = inject(LocalStorageService);
  private readonly jiraService = inject(JiraService);

  private readonly _messages = new BehaviorSubject<SlackDeploymentMessage[]>([]);
  private readonly _deploymentLinks = new BehaviorSubject<DeploymentLink[]>([]);
  private readonly _isListening = new BehaviorSubject<boolean>(false);

  public readonly messages$ = this._messages.asObservable();
  public readonly deploymentLinks$ = this._deploymentLinks.asObservable();
  public readonly isListening$ = this._isListening.asObservable();

  private pollingInterval = 30000; // 30 seconds
  private lastMessageTimestamp = '';

  constructor() {
    this.loadDeploymentLinks();
    this.startListening();
  }

  /**
   * Start listening for Slack events via polling
   */
  private startListening(): void {
    if (!this.slackService.getToken() || !this.slackService.getChannelId()) {
      console.log('Slack not configured, skipping message listening');
      return;
    }

    this._isListening.next(true);
    console.log('🔌 Starting Slack polling listener...');

    // Use the socket mode polling from slack service instead of timer
    this.slackService.startDeploymentPolling(this.pollingInterval).pipe(
      catchError(error => {
        console.error('Deployment polling error:', error);
        return of(null);
      })
    ).subscribe({
      next: (result) => {
        if (result && result.ok && result.events && result.events.length > 0) {
          console.log(`📨 Found ${result.events.length} deployment events`);
          
          // Process the events
          const deploymentMessages: SlackDeploymentMessage[] = [];
          
          for (const event of result.events) {
            if (event.event && this.isDeploymentMessage(event.event)) {
              const parsedMessage = this.parseDeploymentMessage(event.event);
              if (parsedMessage) {
                deploymentMessages.push(parsedMessage);
              }
            }
          }
          
          if (deploymentMessages.length > 0) {
            console.log(`🚀 Found ${deploymentMessages.length} deployment messages`);
            this.processNewMessages(deploymentMessages);
          }
        }
      },
      error: (error) => {
        console.error('Deployment polling error:', error);
      }
    });
  }

  /**
   * Check if message is a deployment message
   */
  private isDeploymentMessage(message: any): boolean {
    let text = '';
    
    // Handle different message types
    if (message.text && message.text.trim()) {
      // Regular text message
      text = message.text;
      console.log(`📝 Regular text message: "${text}"`);
    } else if (message.attachments && message.attachments.length > 0) {
      // Bot message with attachments
      const attachment = message.attachments[0];
      if (attachment.fields && attachment.fields.length > 0) {
        text = attachment.fields[0].value;
        console.log(`📎 Bot attachment field: "${text}"`);
      } else if (attachment.fallback) {
        text = attachment.fallback;
        console.log(`📎 Bot attachment fallback: "${text}"`);
      }
    }
    
    // If no text found, it's not a deployment message
    if (!text || !text.trim()) {
      console.log(`❌ No text found in message:`, message);
      return false;
    }
    
    // Check if text matches deployment pattern - make it more flexible
    const deploymentPatterns = [
      // Patterns for URLs in parentheses (Jenkins format)
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+'([^']+)\s+\[(\d+)\]'\s*\(([^)]+)\)/,
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+"([^"]+)\s+\[(\d+)\]"\s*\(([^)]+)\)/,
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+([^\s]+)\s+\[(\d+)\]\s*\(([^)]+)\)/,
      /(STARTED|SUCCESSFUL|FAILED):\s*([^\s]+)\s+\[(\d+)\]\s*\(([^)]+)\)/,
      // Existing patterns for URLs in angle brackets
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+'([^']+)\s+\[(\d+)\]'\s*\(<([^>]+)>\)/,
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+"([^"]+)\s+\[(\d+)\]"\s*\(<([^>]+)>\)/,
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+([^\s]+)\s+\[(\d+)\]\s*\(<([^>]+)>\)/,
      /(STARTED|SUCCESSFUL|FAILED):\s*([^\s]+)\s+\[(\d+)\]\s*\(<([^>]+)>\)/,
      // Existing fallback patterns
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+'([^']+)\s+\[(\d+)\]'\s*/,
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+"([^"]+)\s+\[(\d+)\]"/,
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+([^\s]+)\s+\[(\d+)\]/,
      /(STARTED|SUCCESSFUL|FAILED):\s*([^\s]+)\s+\[(\d+)\]/,
      /(STARTED|SUCCESSFUL|FAILED):\s*([^\s]+)/,  // Most flexible
      /Successfully parsed deployment:\s*(STARTED|SUCCESSFUL|FAILED)\s*-\s*([^\s]+)\s+\[(\d+)\]/,  // Test message format
      /(STARTED|SUCCESSFUL|FAILED)\s*-\s*([^\s]+)\s+\[(\d+)\]/  // Simple format
    ];
    
    console.log(`🔍 Testing text: "${text}"`);
    
    for (const pattern of deploymentPatterns) {
      const match = text.match(pattern);
      if (match) {
        console.log(`✅ Deployment message detected with pattern ${pattern}: "${text}"`);
        console.log(`✅ Match groups:`, match);
        return true;
      }
    }
    
    console.log(`❌ Not a deployment message: "${text}"`);
    return false;
  }

  /**
   * Parse a single deployment message
   */
  private parseDeploymentMessage(message: any): SlackDeploymentMessage | null {
    let text = '';
    
    // Handle different message types
    if (message.text && message.text.trim()) {
      // Regular text message
      text = message.text;
      console.log(`🔍 Parsing regular text: "${text}"`);
    } else if (message.attachments && message.attachments.length > 0) {
      // Bot message with attachments
      const attachment = message.attachments[0];
      if (attachment.fields && attachment.fields.length > 0) {
        text = attachment.fields[0].value;
        console.log(`🔍 Parsing bot attachment field: "${text}"`);
      } else if (attachment.fallback) {
        text = attachment.fallback;
        console.log(`🔍 Parsing bot attachment fallback: "${text}"`);
      }
    }
    
    // If no text found, return null
    if (!text || !text.trim()) {
      console.log(`❌ No text to parse in message:`, message);
      return null;
    }
    
    // Parse deployment message with multiple patterns
    console.log(`🔍 Testing regex on text: "${text}"`);
    const deploymentPatterns = [
      // Patterns for URLs in parentheses (Jenkins format)
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+'([^']+)\s+\[(\d+)\]'\s*\(([^)]+)\)/,
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+"([^"]+)\s+\[(\d+)\]"\s*\(([^)]+)\)/,
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+([^\s]+)\s+\[(\d+)\]\s*\(([^)]+)\)/,
      /(STARTED|SUCCESSFUL|FAILED):\s*([^\s]+)\s+\[(\d+)\]\s*\(([^)]+)\)/,
      // Existing patterns for URLs in angle brackets
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+'([^']+)\s+\[(\d+)\]'\s*\(<([^>]+)>\)/,
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+"([^"]+)\s+\[(\d+)\]"\s*\(<([^>]+)>\)/,
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+([^\s]+)\s+\[(\d+)\]\s*\(<([^>]+)>\)/,
      /(STARTED|SUCCESSFUL|FAILED):\s*([^\s]+)\s+\[(\d+)\]\s*\(<([^>]+)>\)/,
      // Existing fallback patterns
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+'([^']+)\s+\[(\d+)\]'\s*/,
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+"([^"]+)\s+\[(\d+)\]"/,
      /(STARTED|SUCCESSFUL|FAILED):\s*Job\s+([^\s]+)\s+\[(\d+)\]/,
      /(STARTED|SUCCESSFUL|FAILED):\s*([^\s]+)\s+\[(\d+)\]/,
      /(STARTED|SUCCESSFUL|FAILED):\s*([^\s]+)/,  // Most flexible
      /Successfully parsed deployment:\s*(STARTED|SUCCESSFUL|FAILED)\s*-\s*([^\s]+)\s+\[(\d+)\]/,  // Test message format
      /(STARTED|SUCCESSFUL|FAILED)\s*-\s*([^\s]+)\s+\[(\d+)\]/  // Simple format
    ];
    
    for (const pattern of deploymentPatterns) {
      const match = text.match(pattern);
      if (match) {
        console.log(`✅ Successfully parsed deployment with pattern ${pattern}: "${text}"`);
        console.log(`✅ Match groups:`, match);
        
        const statusStr = match[1];
        const jobName = match[2] || 'Unknown';
        const jobId = match[3] || 'Unknown';
        const deploymentUrl = match[4] || '';
        
        const status = statusStr as 'STARTED' | 'SUCCESSFUL' | 'FAILED';
        console.log(`✅ Parsed: ${status} - ${jobName} [${jobId}]`);
        
        return {
          id: message.ts || Date.now().toString(),
          text: text,
          timestamp: message.ts || Date.now().toString(),
          jobId: jobId,
          status: status,
          deploymentUrl: deploymentUrl,
          channel: this.slackService.getChannelId() || 'unknown',
          user: message.user || message.bot_id || 'unknown'
        };
      }
    }
    
    console.log(`❌ Failed to parse deployment message: "${text}"`);
    console.log(`🔍 Tried all patterns but none matched`);
    return null;
  }

  /**
   * Process new messages and update state
   */
  private processNewMessages(newMessages: SlackDeploymentMessage[]): void {
    const currentMessages = this._messages.value;
    const existingIds = new Set(currentMessages.map(m => m.id));
    
    // Filter out messages we already have
    const trulyNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));
    
    if (trulyNewMessages.length > 0) {
      console.log(`🆕 Processing ${trulyNewMessages.length} new deployment messages`);
      
      // Add new messages to the beginning (latest first)
      const updatedMessages = [...trulyNewMessages, ...currentMessages];
      
      // Keep only the latest 50 messages
      const limitedMessages = updatedMessages.slice(0, 50);
      
      this._messages.next(limitedMessages);
      
      // Check for status updates that might trigger Jira updates
      this.checkForStatusUpdates(trulyNewMessages);
      
      // Update deployment links with latest status for each job
      this.updateDeploymentLinksWithLatestStatus(trulyNewMessages);
    }
  }

  /**
   * Update deployment links with the latest status for each job
   */
  private updateDeploymentLinksWithLatestStatus(newMessages: SlackDeploymentMessage[]): void {
    const deploymentLinks = this._deploymentLinks.value;
    
    newMessages.forEach(message => {
      if (message.jobId) {
        const existingLink = deploymentLinks.find(l => l.jobId === message.jobId);
        
        if (existingLink) {
          // Update existing link with new status
          console.log(`🔄 Updating deployment link for job ${message.jobId} from ${existingLink.status} to ${message.status}`);
          existingLink.status = message.status;
          existingLink.updatedAt = new Date();
        }
      }
    });
    
    // Update the deployment links
    this._deploymentLinks.next([...deploymentLinks]);
    this.saveDeploymentLinks();
  }

  /**
   * Check for status updates that need Jira updates
   */
  private checkForStatusUpdates(newMessages: SlackDeploymentMessage[]): void {
    const deploymentLinks = this._deploymentLinks.value;
    
    newMessages.forEach(message => {
      if (message.jobId) {
        const link = deploymentLinks.find(l => l.jobId === message.jobId);
        if (link) {
          console.log(`🎉 Deployment ${message.jobId} status: ${message.status}! Updating Jira issue ${link.jiraId}`);
          
          // Update deployment link status
          this.updateDeploymentLink(message.jobId, message.status as 'STARTED' | 'SUCCESSFUL' | 'FAILED');
          
          // Automatically update Jira issue status based on deployment status
          this.updateJiraIssueStatus(link.jiraId, message.status);
        }
      }
    });
  }

  /**
   * Update Jira issue status based on deployment status
   */
  private updateJiraIssueStatus(jiraId: string, deploymentStatus: 'STARTED' | 'SUCCESSFUL' | 'FAILED' | 'UNKNOWN'): void {
    // Only update Jira for known statuses
    if (deploymentStatus === 'UNKNOWN') {
      console.log(`⚠️ Skipping Jira update for unknown status: ${deploymentStatus}`);
      return;
    }

    console.log(`🔄 Updating Jira issue ${jiraId} for deployment status: ${deploymentStatus}`);

    // First get the current issue status to check if update is needed
    this.jiraService.getIssue(jiraId).subscribe({
      next: (issue) => {
        const currentStatus = issue.fields.status.name;
        console.log(`📊 Current Jira status: ${currentStatus}`);

        // Get available transitions
        this.jiraService.getIssueTransitions(jiraId).subscribe({
          next: (transitionsResponse) => {
            const transitions = transitionsResponse.transitions;
            console.log(`🔄 Available transitions:`, transitions.map(t => `${t.name} (${t.id})`));

            // Map deployment status to transition keywords
            const statusMapping: Record<string, string[]> = {
              'STARTED': ['ready for test', 'testing', 'in progress', 'development'],
              'SUCCESSFUL': ['ready for test', 'testing', 'qa ready', 'done', 'complete'],
              'FAILED': ['to do', 'backlog', 'open', 'reopened']
            };

            const targetKeywords = statusMapping[deploymentStatus] || [];
            console.log(`🎯 Looking for transitions with keywords: ${targetKeywords.join(', ')}`);

            // Find matching transition
            const matchingTransition = transitions.find(transition => {
              const transitionName = transition.name.toLowerCase();
              return targetKeywords.some(keyword => transitionName.includes(keyword.toLowerCase()));
            });

            if (matchingTransition) {
              console.log(`✅ Found matching transition: ${matchingTransition.name} (${matchingTransition.id})`);
              
              // Perform the transition
              this.jiraService.transitionIssue(jiraId, matchingTransition.id).subscribe({
                next: (result) => {
                  console.log(`🎉 Successfully updated Jira issue ${jiraId} to ${matchingTransition.name}`);
                  this.toastService.success(`Jira issue ${jiraId} updated to ${matchingTransition.name}`);
                },
                error: (error) => {
                  console.error(`❌ Failed to update Jira issue ${jiraId}:`, error);
                  
                  // Handle specific error types
                  if (error.message.includes('CORS/XHRF Error')) {
                    console.error('🔒 CORS/XHRF Error detected. This is a browser security restriction.');
                    console.error('💡 Solutions:');
                    console.error('   1. Use a CORS browser extension for development');
                    console.error('   2. Configure a proxy server');
                    console.error('   3. Use the manual "Update Jira" button instead');
                    this.toastService.error(`CORS Error: Cannot update Jira automatically. Use manual button instead.`);
                  } else {
                    this.toastService.error(`Failed to update Jira: ${error.message}`);
                  }
                }
              });
            } else {
              console.log(`⚠️ No matching transition found for status: ${deploymentStatus}`);
              console.log(`📋 Available transitions: ${transitions.map(t => t.name).join(', ')}`);
              this.toastService.warning(`No suitable transition found for ${deploymentStatus} status`);
            }
          },
          error: (error) => {
            console.error(`❌ Failed to get transitions for Jira issue ${jiraId}:`, error);
            if (error.message.includes('CORS/XHRF Error')) {
              this.toastService.error(`CORS Error: Cannot check Jira transitions. Use manual button instead.`);
            } else {
              this.toastService.error(`Failed to get Jira transitions: ${error.message}`);
            }
          }
        });
      },
      error: (error) => {
        console.error(`❌ Failed to get Jira issue ${jiraId}:`, error);
        if (error.message.includes('CORS/XHRF Error')) {
          this.toastService.error(`CORS Error: Cannot access Jira issue. Use manual button instead.`);
        } else {
          this.toastService.error(`Failed to get Jira issue: ${error.message}`);
        }
      }
    });
  }

  /**
   * Determine target status based on deployment status and current Jira status
   */
  private getTargetStatus(deploymentStatus: 'STARTED' | 'SUCCESSFUL' | 'FAILED', currentStatus: string): string | null {
    const currentStatusLower = currentStatus.toLowerCase();
    
    switch (deploymentStatus) {
      case 'STARTED':
        // Only transition to "In Progress" if not already in progress
        if (currentStatusLower.includes('in progress') || 
            currentStatusLower.includes('progress') ||
            currentStatusLower.includes('development')) {
          return null; // Already in progress
        }
        return 'In Progress';
        
      case 'SUCCESSFUL':
        // Check if already in appropriate status
        if (currentStatusLower.includes('ready for test') || 
            currentStatusLower.includes('ready to test') ||
            currentStatusLower.includes('testing') ||
            currentStatusLower.includes('done') ||
            currentStatusLower.includes('complete')) {
          return null; // Already in appropriate status
        }
        return 'Ready for Test';
        
      case 'FAILED':
        // Only transition back to "To Do" if currently in progress
        if (currentStatusLower.includes('to do') || 
            currentStatusLower.includes('backlog') ||
            currentStatusLower.includes('open')) {
          return null; // Already in appropriate status
        }
        return 'To Do';
        
      default:
        return null;
    }
  }

  /**
   * Find appropriate transition based on target status and deployment status
   */
  private findAppropriateTransition(transitions: any[], targetStatus: string, deploymentStatus: 'STARTED' | 'SUCCESSFUL' | 'FAILED'): any {
    const targetStatusLower = targetStatus.toLowerCase();
    
    // First try exact match
    let transition = transitions.find(t => 
      t.to.name.toLowerCase() === targetStatusLower
    );
    
    if (transition) {
      return transition;
    }
    
    // For successful deployments, look for "Ready for Test" keywords
    if (deploymentStatus === 'SUCCESSFUL') {
      const readyForTestKeywords = [
        'ready for test',
        'ready to test',
        'testing',
        'test ready',
        'qa ready',
        'qa testing',
        'in testing'
      ];
      
      transition = transitions.find(t => {
        const transitionName = t.name.toLowerCase();
        const targetName = t.to.name.toLowerCase();
        return readyForTestKeywords.some(keyword => 
          transitionName.includes(keyword) || targetName.includes(keyword)
        );
      });
      
      if (transition) {
        return transition;
      }
    }
    
    // For started deployments, look for "In Progress" keywords
    if (deploymentStatus === 'STARTED') {
      const inProgressKeywords = [
        'in progress',
        'progress',
        'development',
        'developing',
        'working on'
      ];
      
      transition = transitions.find(t => {
        const transitionName = t.name.toLowerCase();
        const targetName = t.to.name.toLowerCase();
        return inProgressKeywords.some(keyword => 
          transitionName.includes(keyword) || targetName.includes(keyword)
        );
      });
      
      if (transition) {
        return transition;
      }
    }
    
    // For failed deployments, look for "To Do" keywords
    if (deploymentStatus === 'FAILED') {
      const toDoKeywords = [
        'to do',
        'backlog',
        'open',
        'new',
        'pending'
      ];
      
      transition = transitions.find(t => {
        const transitionName = t.name.toLowerCase();
        const targetName = t.to.name.toLowerCase();
        return toDoKeywords.some(keyword => 
          transitionName.includes(keyword) || targetName.includes(keyword)
        );
      });
      
      if (transition) {
        return transition;
      }
    }
    
    return null;
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
   * Add a deployment link (job ID to Jira ID mapping)
   */
  addDeploymentLink(jobId: string, jiraId: string): void {
    const existingLinks = this._deploymentLinks.value;
    const existingIndex = existingLinks.findIndex(l => l.jobId === jobId);
    
    // Get current status from messages if available
    const currentMessage = this._messages.value.find(m => m.jobId === jobId);
    const currentStatus = currentMessage?.status || 'STARTED';
    
    const newLink: DeploymentLink = {
      jobId,
      jiraId,
      status: currentStatus,
      updatedAt: new Date()
    };

    if (existingIndex >= 0) {
      // Update existing link but preserve the current status
      const existingLink = existingLinks[existingIndex];
      existingLinks[existingIndex] = { 
        ...existingLink, 
        jiraId: newLink.jiraId,
        updatedAt: newLink.updatedAt
      };
      console.log(`🔄 Updated existing link for job ${jobId} to Jira ${jiraId} (status: ${existingLink.status})`);
    } else {
      // Add new link
      existingLinks.push(newLink);
      console.log(`🔗 Created new link for job ${jobId} to Jira ${jiraId} (status: ${currentStatus})`);
    }

    this._deploymentLinks.next([...existingLinks]);
    this.saveDeploymentLinks();
    
    console.log(`🔗 Linked job ${jobId} to Jira issue ${jiraId}`);
    this.toastService.success(`Linked deployment ${jobId} to ${jiraId}`);
  }

  /**
   * Update deployment link status
   */
  updateDeploymentLink(jobId: string, status: 'STARTED' | 'SUCCESSFUL' | 'FAILED'): void {
    const links = this._deploymentLinks.value;
    const linkIndex = links.findIndex(l => l.jobId === jobId);
    
    if (linkIndex >= 0) {
      links[linkIndex] = {
        ...links[linkIndex],
        status,
        updatedAt: new Date()
      };
      
      this._deploymentLinks.next([...links]);
      this.saveDeploymentLinks();
    }
  }

  /**
   * Get deployment link for a job ID
   */
  getDeploymentLink(jobId: string): DeploymentLink | undefined {
    return this._deploymentLinks.value.find(l => l.jobId === jobId);
  }

  /**
   * Remove deployment link
   */
  removeDeploymentLink(jobId: string): void {
    const links = this._deploymentLinks.value.filter(l => l.jobId !== jobId);
    this._deploymentLinks.next(links);
    this.saveDeploymentLinks();
    
    console.log(`🗑️ Removed link for job ${jobId}`);
    this.toastService.info(`Removed deployment link for ${jobId}`);
  }

  /**
   * Get all deployment links
   */
  getDeploymentLinks(): DeploymentLink[] {
    return this._deploymentLinks.value;
  }

  /**
   * Get latest messages
   */
  getMessages(): SlackDeploymentMessage[] {
    return this._messages.value;
  }

  /**
   * Force refresh messages (for backward compatibility)
   */
  async refreshMessages(): Promise<void> {
    try {
      console.log('🔄 Manually refreshing deployment messages...');
      
      // Use socket mode polling to get latest deployment events
      this.slackService.pollSocketModeEvents(undefined, 'deployment').subscribe({
        next: (result) => {
          if (result.ok && result.events && result.events.length > 0) {
            console.log(`📨 Found ${result.events.length} deployment events`);
            
            // Process the events
            const deploymentMessages: SlackDeploymentMessage[] = [];
            
            for (const event of result.events) {
              if (event.event && this.isDeploymentMessage(event.event)) {
                const parsedMessage = this.parseDeploymentMessage(event.event);
                if (parsedMessage) {
                  deploymentMessages.push(parsedMessage);
                }
              }
            }
            
            if (deploymentMessages.length > 0) {
              console.log(`🚀 Found ${deploymentMessages.length} deployment messages`);
              this.processNewMessages(deploymentMessages);
              this.toastService.success(`Found ${deploymentMessages.length} new deployment messages`);
            } else {
              this.toastService.info('No new deployment messages found');
            }
          } else {
            this.toastService.info('No new deployment events found');
          }
        },
        error: (error) => {
          console.error('Error refreshing messages:', error);
          this.toastService.error('Failed to refresh messages');
        }
      });
    } catch (error) {
      console.error('Error refreshing messages:', error);
      this.toastService.error('Failed to refresh messages');
    }
  }

  /**
   * Save deployment links to localStorage
   */
  private saveDeploymentLinks(): void {
    this.localStorage.set('deployment_links', this._deploymentLinks.value);
  }

  /**
   * Load deployment links from localStorage
   */
  private loadDeploymentLinks(): void {
    const links = this.localStorage.get<DeploymentLink[]>('deployment_links', []);
    this._deploymentLinks.next(links || []);
    console.log(`📋 Loaded ${(links || []).length} deployment links from storage`);
  }

  /**
   * Clear all deployment links
   */
  clearAllLinks(): void {
    this._deploymentLinks.next([]);
    this.saveDeploymentLinks();
    this.toastService.info('Cleared all deployment links');
  }

  /**
   * Test automatic Jira status update (for manual testing)
   */
  testAutomaticJiraUpdate(jiraId: string, deploymentStatus: 'STARTED' | 'SUCCESSFUL' | 'FAILED' | 'UNKNOWN'): void {
    console.log(`🧪 Testing automatic Jira update for ${jiraId} with deployment status: ${deploymentStatus}`);
    this.updateJiraIssueStatus(jiraId, deploymentStatus);
  }

  /**
   * Test CORS handling for Jira updates
   */
  testCorsHandling(jiraId: string): void {
    console.log(`🔒 Testing CORS handling for Jira issue ${jiraId}`);
    
    // Test getting issue details
    this.jiraService.getIssue(jiraId).subscribe({
      next: (issue) => {
        console.log(`✅ Successfully retrieved issue: ${issue.key} - ${issue.fields.summary}`);
        this.toastService.success(`CORS test passed for ${jiraId}`);
      },
      error: (error) => {
        console.error(`❌ CORS test failed for ${jiraId}:`, error);
        if (error.message.includes('CORS/XHRF Error')) {
          this.toastService.error(`CORS Error detected: ${error.message}`);
        } else {
          this.toastService.error(`Other error: ${error.message}`);
        }
      }
    });
  }

  /**
   * Test Jira status update (for manual testing)
   */
  testJiraStatusUpdate(jiraId: string, status: 'STARTED' | 'SUCCESSFUL' | 'FAILED' | 'UNKNOWN'): void {
    console.log(`🧪 Testing Jira status update for ${jiraId} with status: ${status}`);
    this.updateJiraIssueStatus(jiraId, status);
  }

  /**
   * Get polling status
   */
  getSocketStatus(): string {
    return this._isListening.value ? 'Connected (Polling)' : 'Disconnected';
  }

  /**
   * Reconnect polling
   */
  reconnectSocket(): void {
    console.log('🔄 Reconnecting Slack polling...');
    this.startListening();
  }
} 