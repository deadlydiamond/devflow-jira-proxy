import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 flex items-center justify-center">
      <div class="text-center">
        <!-- Logo/Icon -->
        <div class="mb-8">
          <div class="w-24 h-24 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4">
            <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
        </div>

        <!-- App Name -->
        <h1 class="text-4xl font-bold text-white mb-2">DevFlow</h1>
        <p class="text-white/80 text-lg mb-8">Development Workflow Management</p>

        <!-- Loading Animation -->
        <div class="flex justify-center space-x-2 mb-8">
          <div class="w-3 h-3 bg-white/60 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-3 h-3 bg-white/60 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-3 h-3 bg-white/60 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>

        <!-- Loading Text -->
        <div class="text-white/60 text-sm">
          <p class="mb-1">{{ loadingText() }}</p>
          <div class="w-32 h-1 bg-white/20 rounded-full mx-auto mt-2">
            <div 
              class="h-1 bg-white rounded-full transition-all duration-300 ease-out"
              [style.width.%]="loadingProgress()"
            ></div>
          </div>
        </div>

        <!-- Version -->
        <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <p class="text-white/40 text-xs">v1.0.0</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-bounce {
      animation: bounce 1s infinite;
    }
    
    @keyframes bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-10px);
      }
    }
  `]
})
export class SplashScreenComponent implements OnInit {
  loadingText = signal('Initializing...');
  loadingProgress = signal(0);

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.simulateLoading();
  }

  private simulateLoading(): void {
    const steps = [
      { text: 'Loading modules...', progress: 20 },
      { text: 'Connecting to database...', progress: 40 },
      { text: 'Initializing services...', progress: 60 },
      { text: 'Setting up authentication...', progress: 80 },
      { text: 'Ready!', progress: 100 }
    ];

    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        this.loadingText.set(steps[currentStep].text);
        this.loadingProgress.set(steps[currentStep].progress);
        currentStep++;
      } else {
        clearInterval(interval);
        this.checkAuthAndNavigate();
      }
    }, 800);
  }

  private checkAuthAndNavigate(): void {
    // Add a small delay for smooth transition
    setTimeout(() => {
      if (this.authService.isAuthenticated()) {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/login']);
      }
    }, 500);
  }
} 