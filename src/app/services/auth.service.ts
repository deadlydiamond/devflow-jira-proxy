import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  two_factor_enabled: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export enum UserRole {
  SUPERADMIN = 'superadmin',
  LEAD = 'lead',
  ENGINEER = 'engineer',
  PO = 'po'
}

export interface LoginRequest {
  email: string;
  password: string;
  two_factor_code?: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string;
  requires_2fa?: boolean;
  message?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly API_BASE = '/api/supabase-database';

  // BehaviorSubjects for reactive state management
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  // Public observables
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor() {
    this.checkAuthStatus();
  }

  // Check if user is authenticated on app start
  private checkAuthStatus(): void {
    const token = this.getToken();
    if (token) {
      this.validateToken().subscribe({
        next: (user) => {
          this.setCurrentUser(user);
        },
        error: () => {
          this.logout();
        }
      });
    }
  }

  // Login method
  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.isLoadingSubject.next(true);
    
    return this.http.post<LoginResponse>(`${this.API_BASE}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.success && response.token) {
          this.setToken(response.token);
          if (response.user) {
            this.setCurrentUser(response.user);
          }
        }
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        this.isLoadingSubject.next(false);
        throw error;
      })
    );
  }

  // Register method (only for superadmin)
  register(userData: RegisterRequest): Observable<LoginResponse> {
    this.isLoadingSubject.next(true);
    
    return this.http.post<LoginResponse>(`${this.API_BASE}/auth/register`, userData).pipe(
      tap(response => {
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        this.isLoadingSubject.next(false);
        throw error;
      })
    );
  }

  // Logout method
  logout(): void {
    this.removeToken();
    this.setCurrentUser(null);
    this.router.navigate(['/login']);
  }

  // Validate JWT token
  validateToken(): Observable<User> {
    return this.http.get<User>(`${this.API_BASE}/auth/validate`).pipe(
      tap(user => {
        this.setCurrentUser(user);
      })
    );
  }

  // Enable/Disable 2FA
  enable2FA(): Observable<{ success: boolean; qr_code?: string; backup_codes?: string[] }> {
    return this.http.post<{ success: boolean; qr_code?: string; backup_codes?: string[] }>(
      `${this.API_BASE}/auth/2fa/enable`, {}
    );
  }

  disable2FA(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.API_BASE}/auth/2fa/disable`, {});
  }

  // Verify 2FA code
  verify2FA(code: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.API_BASE}/auth/2fa/verify`, { code });
  }

  // Get all users (superadmin only)
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_BASE}/auth/users`);
  }

  // Update user role (superadmin only)
  updateUserRole(userId: string, role: UserRole): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.API_BASE}/auth/users/${userId}/role`, { role });
  }

  // Delete user (superadmin only)
  deleteUser(userId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.API_BASE}/auth/users/${userId}`);
  }

  // Check if user has specific role
  hasRole(role: UserRole): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === role;
  }

  // Check if user is superadmin
  isSuperadmin(): boolean {
    return this.hasRole(UserRole.SUPERADMIN);
  }

  // Check if user is lead or higher
  isLeadOrHigher(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === UserRole.SUPERADMIN || user?.role === UserRole.LEAD;
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  // Private methods for token management
  private setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private removeToken(): void {
    localStorage.removeItem('auth_token');
  }

  private setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(!!user);
    
    // Store user email in localStorage for shell layout access
    if (user) {
      localStorage.setItem('user_email', user.email);
    } else {
      localStorage.removeItem('user_email');
    }
  }

  // Get auth headers for API calls
  getAuthHeaders(): { [key: string]: string } {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
} 