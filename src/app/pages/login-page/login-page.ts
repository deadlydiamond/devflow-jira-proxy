import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginRequest, UserRole } from '../../services/auth.service';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <!-- Login Card -->
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <!-- Header -->
          <div class="text-center mb-8">
            <div class="w-16 h-16 mx-auto bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p class="text-white/70">Sign in to your DevFlow account</p>
          </div>

          <!-- Login Form -->
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-white/90 mb-2">Email</label>
              <input
                type="email"
                formControlName="email"
                class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                placeholder="Enter your email"
              />
              <div *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched" class="text-red-300 text-sm mt-1">
                Please enter a valid email address
              </div>
            </div>

            <!-- Password -->
            <div>
              <label class="block text-sm font-medium text-white/90 mb-2">Password</label>
              <div class="relative">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all pr-12"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  (click)="togglePassword()"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  <svg *ngIf="!showPassword()" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                  <svg *ngIf="showPassword()" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                  </svg>
                </button>
              </div>
              <div *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched" class="text-red-300 text-sm mt-1">
                Password is required
              </div>
            </div>

            <!-- 2FA Code (if required) -->
            <div *ngIf="requires2FA()">
              <label class="block text-sm font-medium text-white/90 mb-2">2FA Code</label>
              <input
                type="text"
                formControlName="two_factor_code"
                class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                placeholder="Enter 6-digit code"
                maxlength="6"
              />
              <div *ngIf="loginForm.get('two_factor_code')?.invalid && loginForm.get('two_factor_code')?.touched" class="text-red-300 text-sm mt-1">
                Please enter a valid 2FA code
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="loginForm.invalid || isLoading()"
              class="w-full bg-white text-blue-600 py-3 px-4 rounded-lg font-semibold hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <svg *ngIf="isLoading()" class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isLoading() ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>

          <!-- Demo Credentials -->
          <div class="mt-6 p-4 bg-white/5 rounded-lg">
            <p class="text-white/60 text-sm mb-2">Demo Credentials:</p>
            <div class="space-y-1 text-xs text-white/70">
              <div><strong>Superadmin:</strong> admin@devflow.com / password123</div>
              <div><strong>Lead:</strong> lead@devflow.com / password123</div>
              <div><strong>Engineer:</strong> engineer@devflow.com / password123</div>
              <div><strong>PO:</strong> po@devflow.com / password123</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="text-center mt-6">
          <p class="text-white/50 text-sm">
            © 2024 DevFlow. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `
})
export class LoginPageComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = signal(false);
  showPassword = signal(false);
  requires2FA = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      two_factor_code: ['']
    });
  }

  ngOnInit(): void {
    // Check if user is already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      
      const credentials: LoginRequest = {
        email: this.loginForm.get('email')?.value,
        password: this.loginForm.get('password')?.value,
        two_factor_code: this.loginForm.get('two_factor_code')?.value
      };

      this.authService.login(credentials).subscribe({
        next: (response) => {
          if (response.success) {
            if (response.requires_2fa) {
              this.requires2FA.set(true);
              this.loginForm.get('two_factor_code')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(6)]);
              this.loginForm.get('two_factor_code')?.updateValueAndValidity();
              this.toastService.info('Please enter your 2FA code');
            } else {
              this.toastService.success('Welcome back!');
              this.router.navigate(['/dashboard']);
            }
          } else {
            this.toastService.error(response.message || 'Login failed');
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          this.toastService.error('Login failed: ' + error.message);
          this.isLoading.set(false);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }
} 