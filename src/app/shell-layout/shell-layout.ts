import { Component, signal, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeToggleComponent } from '../components/theme-toggle/theme-toggle';
import { JiraService } from '../services/jira';

@Component({
  selector: 'app-shell-layout',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ThemeToggleComponent],
  templateUrl: './shell-layout.html',
  styleUrl: './shell-layout.css'
})
export class ShellLayoutComponent {
  private readonly router = inject(Router);
  private readonly jiraService = inject(JiraService);
  
  protected readonly sidebarOpen = signal(false);

  // User information from Jira
  protected readonly userName = signal<string>('User');
  protected readonly userEmail = signal<string>('user@example.com');
  protected readonly userInitials = signal<string>('U');

  constructor() {
    this.loadUserInfo();
  }

  private loadUserInfo(): void {
    // Get user email from Jira service
    const email = this.jiraService.getEmail();
    if (email) {
      this.userEmail.set(email);
      
      // Extract name from email (before @ symbol)
      const name = email.split('@')[0];
      this.userName.set(this.formatName(name));
      this.userInitials.set(this.getInitials(this.formatName(name)));
    }
  }

  private formatName(emailName: string): string {
    // Convert email name to proper name format
    return emailName
      .replace(/[._-]/g, ' ') // Replace dots, underscores, hyphens with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2); // Take first 2 initials
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }

  activePageTitle(): string {
    const path = this.router.url;
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/sprint-workspace':
        return 'Sprint Workspace';
      case '/deployment-tracker':
        return 'Deployment Tracker';
      case '/merge-reviewer':
        return 'Merge Reviewer';
      case '/settings':
        return 'Settings';

      default:
        return 'Dashboard';
    }
  }

  getPageDescription(): string {
    const path = this.router.url;
    switch (path) {
      case '/dashboard':
        return 'Overview of your projects and activities';
      case '/sprint-workspace':
        return 'Focus on your current sprint with AI-powered story management';
      case '/deployment-tracker':
        return 'Track deployment status from Slack messages and link to Jira issues';
      case '/merge-reviewer':
        return 'Analyze code for common issues before merging';
      case '/settings':
        return 'Configure your account and application preferences';

      default:
        return 'Welcome to Devflow';
    }
  }
}
