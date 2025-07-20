import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocalStorageService } from '../../services/local-storage';
import { ThemeService } from '../../services/theme';
import { GitLabService } from '../../services/gitlab';
import { JiraService } from '../../services/jira';
import { SlackService } from '../../services/slack';
import { OpenAiService } from '../../services/openai';
import { CardComponent } from '../../components/card/card';
import { ButtonComponent } from '../../components/button/button';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle';

interface Settings {
  gitlabToken: string;
  gitlabUrl: string;
  gitlabProjectId: string;
  jiraToken: string;
  jiraUrl: string;
  jiraEmail: string;
  slackToken: string;
  slackChannelId: string;
  slackSocketToken: string;
  openaiToken: string;
}

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent, ThemeToggleComponent],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css'
})
export class SettingsPageComponent implements OnInit {
  private readonly localStorage = inject(LocalStorageService);
  private readonly themeService = inject(ThemeService);
  private readonly gitlabService = inject(GitLabService);
  private readonly jiraService = inject(JiraService);
  private readonly slackService = inject(SlackService);
  private readonly openaiService = inject(OpenAiService);
  
  settings: Settings = {
    gitlabToken: '',
    gitlabUrl: 'https://gitlab.com',
    gitlabProjectId: '',
    jiraToken: '',
    jiraUrl: 'https://your-domain.atlassian.net',
    jiraEmail: '',
    slackToken: '',
    slackChannelId: '',
    slackSocketToken: '',
    openaiToken: ''
  };

  isDarkMode = false;
  gitlabConnectionStatus: 'idle' | 'testing' | 'success' | 'error' = 'idle';
  gitlabConnectionMessage = '';
  jiraConnectionStatus: 'idle' | 'testing' | 'success' | 'error' = 'idle';
  jiraConnectionMessage = '';
  slackConnectionStatus: 'idle' | 'testing' | 'success' | 'error' = 'idle';
  slackConnectionMessage = '';
  slackChannels: any[] = [];
  isFetchingChannels = false;
  openaiConnectionStatus: 'idle' | 'testing' | 'success' | 'error' = 'idle';
  openaiConnectionMessage = '';

  ngOnInit(): void {
    this.loadSettings();
    this.isDarkMode = this.themeService.getTheme() === 'dark';
  }

  private loadSettings(): void {
    const savedSettings = this.localStorage.get<Settings>('settings', this.settings);
    this.settings = { ...this.settings, ...savedSettings };
    
    // Load GitLab token from GitLabService
    const gitlabToken = this.gitlabService.getToken();
    if (gitlabToken) {
      this.settings.gitlabToken = gitlabToken;
    }
    
    // Load GitLab URL from GitLabService
    const gitlabUrl = this.gitlabService.getGitLabUrl();
    if (gitlabUrl) {
      this.settings.gitlabUrl = gitlabUrl;
    }
    
    // Load GitLab Project ID from GitLabService
    const gitlabProjectId = this.gitlabService.getProjectId();
    if (gitlabProjectId) {
      this.settings.gitlabProjectId = gitlabProjectId;
    }
    
    // Load Jira credentials from JiraService
    const jiraToken = this.jiraService.getToken();
    if (jiraToken) {
      this.settings.jiraToken = jiraToken;
    }
    
    // Use the actual Jira base URL for display, not the proxy URL
    const jiraBaseUrl = this.jiraService.getJiraBaseUrl();
    if (jiraBaseUrl) {
      this.settings.jiraUrl = jiraBaseUrl;
    }
    
    const jiraEmail = this.jiraService.getEmail();
    if (jiraEmail) {
      this.settings.jiraEmail = jiraEmail;
    }
    
    // Load Slack settings from SlackService
    const slackToken = this.slackService.getToken();
    if (slackToken) {
      this.settings.slackToken = slackToken;
    }
    
    const slackChannelId = this.slackService.getChannelId();
    if (slackChannelId) {
      this.settings.slackChannelId = slackChannelId;
    }

    // Load Slack Socket Mode token from SlackService
    const slackSocketToken = this.slackService.getSocketToken();
    if (slackSocketToken) {
      this.settings.slackSocketToken = slackSocketToken;
    }

    // Load OpenAI token from OpenAI Service
    const openaiToken = this.openaiService.getToken();
    if (openaiToken) {
      this.settings.openaiToken = openaiToken;
    }
  }

  saveSettings(): void {
    this.localStorage.set('settings', this.settings);
    
    // Save GitLab token and URL to GitLabService
    if (this.settings.gitlabToken) {
      this.gitlabService.setToken(this.settings.gitlabToken);
    }
    if (this.settings.gitlabUrl) {
      this.gitlabService.setGitLabUrl(this.settings.gitlabUrl);
    }
    if (this.settings.gitlabProjectId) {
      this.gitlabService.setProjectId(this.settings.gitlabProjectId);
    }
    
    // Save Jira credentials to JiraService
    if (this.settings.jiraToken) {
      this.jiraService.setToken(this.settings.jiraToken);
    }
    if (this.settings.jiraUrl) {
      this.jiraService.setJiraUrl(this.settings.jiraUrl);
    }
    if (this.settings.jiraEmail) {
      this.jiraService.setEmail(this.settings.jiraEmail);
    }
    
    // Save Slack settings to SlackService
    if (this.settings.slackToken) {
      this.slackService.setToken(this.settings.slackToken);
    }
    if (this.settings.slackChannelId) {
      this.slackService.setChannelId(this.settings.slackChannelId);
    }
    if (this.settings.slackSocketToken) {
      this.slackService.setSocketToken(this.settings.slackSocketToken);
    }

    // Save OpenAI token to OpenAI Service
    if (this.settings.openaiToken) {
      this.openaiService.setToken(this.settings.openaiToken);
    }
    
    this.showSaveMessage();
  }

  testGitLabConnection(): void {
    if (!this.settings.gitlabToken) {
      this.gitlabConnectionStatus = 'error';
      this.gitlabConnectionMessage = 'Please enter a GitLab token first';
      return;
    }

    if (!this.settings.gitlabUrl) {
      this.gitlabConnectionStatus = 'error';
      this.gitlabConnectionMessage = 'Please enter a GitLab URL first';
      return;
    }

    // Reset status and start testing
    this.gitlabConnectionStatus = 'testing';
    this.gitlabConnectionMessage = 'Testing connection...';

    // Temporarily set the token for testing
    this.gitlabService.setToken(this.settings.gitlabToken);
    this.gitlabService.setGitLabUrl(this.settings.gitlabUrl);
    if (this.settings.gitlabProjectId) {
      this.gitlabService.setProjectId(this.settings.gitlabProjectId);
    }

    this.gitlabService.testConnection().subscribe({
      next: (response) => {
        this.gitlabConnectionStatus = 'success';
        this.gitlabConnectionMessage = `Connection successful! Logged in as ${response.name || response.username || 'Unknown user'}`;
      },
      error: (error) => {
        this.gitlabConnectionStatus = 'error';
        
        let errorMessage = 'Connection failed';
        
        if (error.status === 401) {
          errorMessage = 'Invalid token. Please check your GitLab Personal Access Token.';
        } else if (error.status === 403) {
          errorMessage = 'Token lacks required permissions. Ensure your token has "read_user" scope.';
        } else if (error.status === 404) {
          errorMessage = 'GitLab URL not found. Please check your GitLab instance URL.';
        } else if (error.status === 0) {
          errorMessage = 'Network error. Please check your internet connection and GitLab URL.';
        } else if (error.error?.message) {
          errorMessage = `GitLab error: ${error.error.message}`;
        } else if (error.message) {
          errorMessage = `Error: ${error.message}`;
        }
        
        this.gitlabConnectionMessage = errorMessage;
      }
    });
  }

  testJiraConnection(): void {
    if (!this.settings.jiraToken) {
      this.jiraConnectionStatus = 'error';
      this.jiraConnectionMessage = 'Please enter a Jira API token first';
      return;
    }

    if (!this.settings.jiraUrl) {
      this.jiraConnectionStatus = 'error';
      this.jiraConnectionMessage = 'Please enter a Jira URL first';
      return;
    }

    if (!this.settings.jiraEmail) {
      this.jiraConnectionStatus = 'error';
      this.jiraConnectionMessage = 'Please enter a Jira email first';
      return;
    }

    // Reset status and start testing
    this.jiraConnectionStatus = 'testing';
    this.jiraConnectionMessage = 'Testing connection...';

    // Temporarily set the credentials for testing
    this.jiraService.setToken(this.settings.jiraToken);
    this.jiraService.setJiraUrl(this.settings.jiraUrl);
    this.jiraService.setEmail(this.settings.jiraEmail);

    // In production, the Jira service will automatically use the Vercel proxy
    // In development, it will use the direct Jira URL
    this.jiraService.testConnection().subscribe({
      next: (response) => {
        this.jiraConnectionStatus = 'success';
        this.jiraConnectionMessage = `Connection successful! Logged in as ${response.displayName || 'Unknown user'}`;
      },
      error: (error: any) => {
        this.jiraConnectionStatus = 'error';
        
        let errorMessage = 'Connection failed';
        
        if (error.status === 401) {
          errorMessage = 'Invalid credentials. Please check your Jira email and API token.';
        } else if (error.status === 403) {
          errorMessage = 'Access denied. Please check your Jira permissions.';
        } else if (error.status === 404) {
          errorMessage = 'Jira URL not found. Please check your Jira instance URL.';
        } else if (error.status === 0) {
          errorMessage = 'Network error. Please check your internet connection and Jira URL.';
        } else if (error.error?.message) {
          errorMessage = `Jira error: ${error.error.message}`;
        } else if (error.message) {
          errorMessage = `Error: ${error.message}`;
        }
        
        this.jiraConnectionMessage = errorMessage;
      }
    });
  }

  testSlackConnection(): void {
    if (!this.settings.slackToken) {
      this.slackConnectionStatus = 'error';
      this.slackConnectionMessage = 'Please enter a Slack token first';
      return;
    }

    // Reset status and start testing
    this.slackConnectionStatus = 'testing';
    this.slackConnectionMessage = 'Testing connection...';

    // Temporarily set the token for testing
    this.slackService.setToken(this.settings.slackToken);

    this.slackService.testConnection().subscribe({
      next: (response) => {
        this.slackConnectionStatus = 'success';
        this.slackConnectionMessage = `Connection successful! Connected to Slack workspace`;
      },
      error: (error: any) => {
        this.slackConnectionStatus = 'error';
        this.slackConnectionMessage = error.message || 'Connection failed';
      }
    });
  }

  testOpenAiConnection(): void {
    if (!this.settings.openaiToken) {
      this.openaiConnectionStatus = 'error';
      this.openaiConnectionMessage = 'Please enter an OpenAI API key first';
      return;
    }

    // Reset status and start testing
    this.openaiConnectionStatus = 'testing';
    this.openaiConnectionMessage = 'Testing connection...';

    // Temporarily set the token for testing
    this.openaiService.setToken(this.settings.openaiToken);

    this.openaiService.testToken().subscribe({
      next: () => {
        this.openaiConnectionStatus = 'success';
        this.openaiConnectionMessage = 'Connection successful! OpenAI API is accessible';
      },
      error: (error: any) => {
        this.openaiConnectionStatus = 'error';
        this.openaiConnectionMessage = error.message || 'Connection failed';
      }
    });
  }

  fetchSlackChannels(): void {
    if (!this.settings.slackToken) {
      return;
    }

    this.isFetchingChannels = true;
    this.slackService.setToken(this.settings.slackToken);

    this.slackService.getChannels().subscribe({
      next: (channels) => {
        this.slackChannels = channels;
        this.isFetchingChannels = false;
      },
      error: (error) => {
        this.isFetchingChannels = false;
        console.error('Failed to fetch Slack channels:', error);
      }
    });
  }

  onChannelSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.settings.slackChannelId = select.value;
  }

  // Test localStorage functionality
  testLocalStorage(): void {
    const testValue = 'test-value-' + Date.now();
    this.localStorage.set('test-key', testValue);
    const retrieved = this.localStorage.get<string>('test-key', '');
    const isWorking = testValue === retrieved;
    
    if (isWorking) {
      alert('LocalStorage is working correctly!');
    } else {
      alert('LocalStorage test failed. Retrieved value does not match.');
    }
  }

  clearAllData(): void {
    this.localStorage.clear();
    this.showClearMessage();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
    this.isDarkMode = this.themeService.getTheme() === 'dark';
  }

  private showSaveMessage(): void {
    // You could implement a toast notification here
  }

  private showClearMessage(): void {
    // You could implement a toast notification here
  }

  getStorageInfo(): { size: number; keys: string[] } {
    return {
      size: this.localStorage.getSize(),
      keys: this.localStorage.getKeys()
    };
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
