import { Component, signal, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeToggleComponent } from '../components/theme-toggle/theme-toggle';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-shell-layout',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ThemeToggleComponent],
  templateUrl: './shell-layout.html',
  styleUrl: './shell-layout.css'
})
export class ShellLayoutComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private userSubscription?: Subscription;
  
  protected readonly sidebarOpen = signal(false);
  protected readonly userDropdownOpen = signal(false);

  // User information from authentication
  protected readonly userName = signal<string>('User');
  protected readonly userEmail = signal<string>('user@example.com');
  protected readonly userInitials = signal<string>('U');

  ngOnInit(): void {
    this.loadUserInfo();
    
    // Subscribe to user changes
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.loadUserInfo();
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  private loadUserInfo(): void {
    // Get user information from auth service
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userEmail.set(currentUser.email);
      this.userName.set(currentUser.name || this.formatNameFromEmail(currentUser.email));
      this.userInitials.set(this.getInitials(this.userName()));
    } else {
      // If no current user, try to get from localStorage as fallback
      const storedEmail = localStorage.getItem('user_email');
      if (storedEmail) {
        this.userEmail.set(storedEmail);
        const name = this.formatNameFromEmail(storedEmail);
        this.userName.set(name);
        this.userInitials.set(this.getInitials(name));
      }
    }
  }

  private formatNameFromEmail(email: string): string {
    // Extract name from email (before @ symbol)
    const emailName = email.split('@')[0];
    
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

  toggleUserDropdown(): void {
    this.userDropdownOpen.update(open => !open);
  }

  logout(): void {
    this.authService.logout();
    this.userDropdownOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-dropdown')) {
      this.userDropdownOpen.set(false);
    }
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
      case '/squad-management':
        return 'Squad Management';
      case '/settings':
        return 'Settings';
      case '/superadmin':
        return 'Superadmin Panel';

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
      case '/squad-management':
        return 'Manage your development squads and team members';
      case '/settings':
        return 'Configure your account and application preferences';
      case '/superadmin':
        return 'Manage users and system settings';

      default:
        return 'Welcome to Devflow';
    }
  }

  isSuperadmin(): boolean {
    return this.authService.isSuperadmin();
  }
}
