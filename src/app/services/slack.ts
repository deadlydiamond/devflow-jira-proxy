import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, timer, of } from 'rxjs';
import { catchError, map, switchMap, retryWhen, take } from 'rxjs/operators';
import { LocalStorageService } from './local-storage';
import { ToastService } from './toast';

// Define DeploymentEntry interface locally to avoid circular dependency
export interface DeploymentEntry {
  id: string;
  status: 'success' | 'failed' | 'started';
  jiraTicket: string;
  message: string;
  timestamp: Date;
  parsedAt: Date;
  jiraStoryNumber?: string;
}

export interface SlackMessage {
  type: string;
  subtype?: string;
  user?: string;
  text: string;
  ts: string;
  channel: string;
  team?: string;
  bot_id?: string;
  attachments?: SlackAttachment[];
}

export interface SlackAttachment {
  id: number;
  color: string;
  fallback: string;
  fields?: SlackField[];
  mrkdwn_in?: string[];
}

export interface SlackField {
  value: string;
  title: string;
  short: boolean;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
}

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  profile: {
    display_name: string;
    real_name: string;
    image_72: string;
  };
}

export interface SlackApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  messages?: SlackMessage[];
  channels?: SlackChannel[];
  users?: SlackUser[];
}

export interface SlackWebhookTest {
  success: boolean;
  message: string;
  response?: any;
}

@Injectable({
  providedIn: 'root'
})
export class SlackService {
  private readonly http = inject(HttpClient);
  private readonly localStorage = inject(LocalStorageService);
  private readonly toastService = inject(ToastService);
  
  private readonly SLACK_API_BASE = 'https://slack.com/api';
  private readonly TOKEN_KEY = 'slackToken';
  private readonly CHANNEL_ID_KEY = 'slackChannelId';
  private readonly SOCKET_TOKEN_KEY = 'slackSocketToken';
  
  // Rate limiting state
  private isCooldown = false;
  private lastRateLimitTime = 0;
  private readonly RATE_LIMIT_COOLDOWN = 60000; // 60 seconds
  private readonly RATE_LIMIT_RETRY_DELAY = 60000; // 60 seconds
  
  // Observable for real-time deployment updates
  private deploymentUpdates = new BehaviorSubject<DeploymentEntry[]>([]);
  public deploymentUpdates$ = this.deploymentUpdates.asObservable();

  // Deployment patterns for parsing messages
  private deploymentPatterns = [
    {
      regex: /✅\s*Deployment\s+succeeded\s+for\s+([A-Z]+-\d+)/i,
      status: 'success' as const
    },
    {
      regex: /❌\s*Deployment\s+failed\s+for\s+([A-Z]+-\d+)/i,
      status: 'failed' as const
    },
    {
      regex: /🚀\s*Starting\s+deployment\s+for\s+([A-Z]+-\d+)/i,
      status: 'started' as const
    }
  ];

  /**
   * Get Slack bot token from localStorage
   */
  getToken(): string | null {
    return this.localStorage.get<string>(this.TOKEN_KEY, '');
  }

  /**
   * Set Slack bot token
   */
  setToken(token: string): void {
    this.localStorage.set(this.TOKEN_KEY, token);
  }

  /**
   * Get Slack channel ID from localStorage
   */
  getChannelId(): string | null {
    return this.localStorage.get<string>(this.CHANNEL_ID_KEY, '');
  }

  /**
   * Set Slack channel ID
   */
  setChannelId(channelId: string): void {
    this.localStorage.set(this.CHANNEL_ID_KEY, channelId);
  }

  /**
   * Get Slack socket token from localStorage
   */
  getSocketToken(): string | null {
    return this.localStorage.get<string>(this.SOCKET_TOKEN_KEY, '');
  }

  /**
   * Set Slack socket token
   */
  setSocketToken(token: string): void {
    this.localStorage.set(this.SOCKET_TOKEN_KEY, token);
  }

  /**
   * Check if we're in a rate limit cooldown period
   */
  private isInCooldown(): boolean {
    if (!this.isCooldown) return false;
    
    const timeSinceLastRateLimit = Date.now() - this.lastRateLimitTime;
    if (timeSinceLastRateLimit >= this.RATE_LIMIT_COOLDOWN) {
      this.isCooldown = false;
      return false;
    }
    
    return true;
  }

  /**
   * Get current cooldown status for debugging
   */
  getCooldownStatus(): { isInCooldown: boolean; remainingTime: number } {
    if (!this.isCooldown) {
      return { isInCooldown: false, remainingTime: 0 };
    }
    
    const timeSinceLastRateLimit = Date.now() - this.lastRateLimitTime;
    const remainingTime = Math.max(0, this.RATE_LIMIT_COOLDOWN - timeSinceLastRateLimit);
    
    return {
      isInCooldown: remainingTime > 0,
      remainingTime: Math.ceil(remainingTime / 1000)
    };
  }

  /**
   * Handle rate limit response
   */
  private handleRateLimit(): Observable<never> {
    this.isCooldown = true;
    this.lastRateLimitTime = Date.now();
    
    // Show warning toast
    this.toastService.warning('Slack API limit reached. Retrying in 1 minute…', 60000);
    
    console.warn('Slack API rate limit hit. Waiting 60 seconds before retry...');
    
    // Wait 60 seconds then retry once
    return timer(this.RATE_LIMIT_RETRY_DELAY).pipe(
      switchMap(() => {
        console.log('Rate limit cooldown expired. Retrying...');
        this.isCooldown = false;
        return throwError(() => new Error('Rate limit retry expired'));
      })
    );
  }

  /**
   * Test Slack API connection
   */
  testConnection(): Observable<SlackApiResponse<any>> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('Slack token not configured'));
    }

    // Use Vercel proxy to avoid CORS issues
    const baseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : window.location.origin;
    
    return this.http.get<SlackApiResponse<any>>(`${baseUrl}/api/slack/auth.test`, {
      headers: {
        'X-Slack-Token': token
      }
    }).pipe(
      map(response => {
        if (!response.ok) {
          if (response.error === 'ratelimited') {
            throw new Error('ratelimited');
          }
          throw new Error(response.error || 'Authentication failed');
        }
        return response;
      }),
      catchError(error => {
        console.error('Slack connection test failed:', error);
        
        if (error.message === 'ratelimited') {
          return this.handleRateLimit();
        }
        
        return throwError(() => new Error(error.message || 'Connection failed'));
      })
    );
  }

  /**
   * Get list of channels the bot has access to
   */
  getChannels(): Observable<SlackChannel[]> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('Slack token not configured'));
    }

    // Use Vercel proxy to avoid CORS issues
    const baseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : window.location.origin;

    return this.http.get<SlackApiResponse<{ channels: SlackChannel[] }>>(`${baseUrl}/api/slack/conversations.list`, {
      headers: {
        'X-Slack-Token': token
      },
      params: {
        types: 'public_channel,private_channel'
      }
    }).pipe(
      map(response => {
        if (!response.ok) {
          if (response.error === 'ratelimited') {
            throw new Error('ratelimited');
          }
          throw new Error(response.error || 'Failed to fetch channels');
        }
        return response.channels || [];
      }),
      catchError(error => {
        console.error('Failed to fetch Slack channels:', error);
        
        if (error.message === 'ratelimited') {
          return this.handleRateLimit();
        }
        
        // Provide specific guidance for missing scope errors
        if (error.message?.includes('missing_scope')) {
          const errorMessage = 'Missing required Slack bot scopes. Please add these scopes to your Slack app:\n' +
            '• channels:read - View channel info\n' +
            '• channels:history - Read channel messages\n' +
            '• users:read - View user info\n\n' +
            'Go to api.slack.com/apps → Your App → OAuth & Permissions → Scopes → Bot Token Scopes';
          return throwError(() => new Error(errorMessage));
        }
        
        return throwError(() => new Error(error.message || 'Failed to fetch channels'));
      })
    );
  }

  /**
   * Get messages from a specific channel with rate limit handling
   */
  getChannelMessages(channelId: string, limit: number = 100): Observable<SlackMessage[]> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('Slack token not configured'));
    }

    // Check if we're in cooldown
    if (this.isInCooldown()) {
      const remainingTime = Math.ceil((this.RATE_LIMIT_COOLDOWN - (Date.now() - this.lastRateLimitTime)) / 1000);
      this.toastService.warning(`Slack API cooldown active. Please wait ${remainingTime} seconds.`);
      return throwError(() => new Error('Rate limit cooldown active'));
    }

    // Use Vercel proxy to avoid CORS issues
    const baseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : window.location.origin;

    return this.http.get<SlackApiResponse<{ messages: SlackMessage[] }>>(`${baseUrl}/api/slack/conversations.history`, {
      headers: {
        'X-Slack-Token': token
      },
      params: {
        channel: channelId,
        limit: limit.toString()
      }
    }).pipe(
      map(response => {
        if (!response.ok) {
          if (response.error === 'ratelimited') {
            throw new Error('ratelimited');
          }
          throw new Error(response.error || 'Failed to fetch messages');
        }
        return response.messages || [];
      }),
      catchError(error => {
        console.error('Failed to fetch Slack messages:', error);
        
        if (error.message === 'ratelimited') {
          return this.handleRateLimit();
        }
        
        // Provide specific guidance for missing scope errors
        if (error.message?.includes('missing_scope')) {
          const errorMessage = 'Missing required Slack bot scopes. Please add these scopes to your Slack app:\n' +
            '• channels:read - View channel info\n' +
            '• channels:history - Read channel messages\n' +
            '• users:read - View user info\n\n' +
            'Go to api.slack.com/apps → Your App → OAuth & Permissions → Scopes → Bot Token Scopes';
          return throwError(() => new Error(errorMessage));
        }
        
        return throwError(() => new Error(error.message || 'Failed to fetch messages'));
      })
    );
  }

  /**
   * Get users list
   */
  getUsers(): Observable<SlackUser[]> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('Slack token not configured'));
    }

    // Use Vercel proxy to avoid CORS issues
    const baseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : window.location.origin;

    return this.http.get<SlackApiResponse<{ members: SlackUser[] }>>(`${baseUrl}/api/slack/users.list`, {
      headers: {
        'X-Slack-Token': token
      }
    }).pipe(
      map(response => {
        if (!response.ok) {
          if (response.error === 'ratelimited') {
            throw new Error('ratelimited');
          }
          throw new Error(response.error || 'Failed to fetch users');
        }
        return (response as any).members || [];
      }),
      catchError(error => {
        console.error('Failed to fetch Slack users:', error);
        
        if (error.message === 'ratelimited') {
          return this.handleRateLimit();
        }
        
        // Provide specific guidance for missing scope errors
        if (error.message?.includes('missing_scope')) {
          const errorMessage = 'Missing required Slack bot scopes. Please add these scopes to your Slack app:\n' +
            '• channels:read - View channel info\n' +
            '• channels:history - Read channel messages\n' +
            '• users:read - View user info\n\n' +
            'Go to api.slack.com/apps → Your App → OAuth & Permissions → Scopes → Bot Token Scopes';
          return throwError(() => new Error(errorMessage));
        }
        
        return throwError(() => new Error(error.message || 'Failed to fetch users'));
      })
    );
  }

  /**
   * Process Slack messages and extract deployment entries
   */
  processSlackMessages(messages: SlackMessage[]): DeploymentEntry[] {
    const deploymentEntries: DeploymentEntry[] = [];
    
    messages.forEach(message => {
      
      // Handle bot messages with attachments (Jenkins-style)
      if (message.subtype === 'bot_message' && message.attachments && message.attachments.length > 0) {
        message.attachments.forEach(attachment => {
          const deploymentEntry = this.parseAttachmentForDeployment(attachment);
          if (deploymentEntry) {
            deploymentEntry.timestamp = new Date(parseFloat(message.ts) * 1000);
            deploymentEntry.parsedAt = new Date();
            deploymentEntries.push(deploymentEntry);
          }
        });
      }
      // Handle regular text messages
      else if (message.text) {
        const deploymentEntry = this.parseDeploymentFromMessage(message);
        if (deploymentEntry) {
          deploymentEntry.timestamp = new Date(parseFloat(message.ts) * 1000);
          deploymentEntry.parsedAt = new Date();
          deploymentEntries.push(deploymentEntry);
        }
      }
    });
    
    return deploymentEntries;
  }

  /**
   * Parse a single message for deployment patterns
   */
  private parseDeploymentFromMessage(message: any): DeploymentEntry | null {
    const text = message.text || '';
    
    // Look for deployment patterns in message text
    for (const pattern of this.deploymentPatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        const jiraTicket = match[1];
        return {
          id: `${jiraTicket}-${Date.now()}`,
          jiraTicket,
          status: pattern.status,
          timestamp: new Date(message.ts * 1000),
          message: message.text || '',
          parsedAt: new Date()
        };
      }
    }
    
    return null;
  }

  /**
   * Parse attachment for deployment information (Jenkins-style)
   */
  private parseAttachmentForDeployment(attachment: any): DeploymentEntry | null {
    if (!attachment.fallback) {
      return null;
    }

    // Look for job patterns in attachment fallback
    const jobPattern = /Job\s+([^:]+):\s*([^\s]+)\s*\[(\d+)\]/i;
    const match = attachment.fallback.match(jobPattern);
    
    if (!match) {
      return null;
    }

    const [, jobName, status, buildNumber] = match;
    
    if (!['SUCCESS', 'FAILURE', 'ABORTED'].includes(status.toUpperCase())) {
      return null;
    }

    return {
      id: `${jobName}-${buildNumber}`,
      jiraTicket: jobName,
      status: status.toUpperCase() === 'SUCCESS' ? 'success' : status.toUpperCase() === 'FAILURE' ? 'failed' : 'started',
      timestamp: new Date(attachment.ts * 1000),
      message: attachment.fallback || '',
      parsedAt: new Date()
    };
  }

  /**
   * Generate unique ID for deployment entry
   */
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Fetch messages from configured channel and process for deployments
   */
  fetchAndProcessMessages(limit: number = 100): Observable<DeploymentEntry[]> {
    const channelId = this.getChannelId();
    if (!channelId) {
      return throwError(() => new Error('Slack channel ID not configured'));
    }

    return this.getChannelMessages(channelId, limit).pipe(
      map(messages => {
        const deploymentEntries = this.processSlackMessages(messages);
        
        // Add to deployment service
        // The deployment service is not imported, so this line is removed
        // if (deploymentEntries.length > 0) {
        //   this.deploymentService.addDeployments(deploymentEntries);
        //   
        //   // Emit update to subscribers
        //   const currentDeployments = this.deploymentService.getDeployments();
        //   this.deploymentUpdates.next(currentDeployments);
        // }
        
        return deploymentEntries;
      }),
      catchError(error => {
        console.error('Failed to fetch and process messages:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch messages'));
      })
    );
  }

  /**
   * Get recent deployment updates
   */
  getRecentDeploymentUpdates(): DeploymentEntry[] {
    // The deployment service is not imported, so this line is removed
    // return this.deploymentService.getRecentDeployments(1); // Last 24 hours
    return []; // Return empty array as deployment service is not available
  }

  /**
   * Clear all Slack settings
   */
  clearSettings(): void {
    this.localStorage.remove(this.TOKEN_KEY);
    this.localStorage.remove(this.CHANNEL_ID_KEY);
    this.localStorage.remove(this.SOCKET_TOKEN_KEY);
  }

  /**
   * Manually trigger rate limit for testing (debug only)
   */
  testRateLimit(): void {
    this.isCooldown = true;
    this.lastRateLimitTime = Date.now();
    this.toastService.warning('Slack API limit reached. Retrying in 1 minute…', 60000);
  }

  /**
   * Get Vercel Slack socket endpoint URL
   */
  private getSlackSocketUrl(): string {
    if (window.location.hostname === 'localhost') {
      // Development: use local socket server
      return 'http://localhost:3001';
    } else {
      // Production: use Vercel backend with stable project URL
      // Use the current hostname to avoid hardcoding deployment-specific URLs
      const baseUrl = window.location.origin;
      return `${baseUrl}/api/slack-socket`;
    }
  }
} 
 