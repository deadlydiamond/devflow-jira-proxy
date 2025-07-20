import { Component, inject, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../services/loading';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-infinite-progress',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="loadingService.loadingState$ | async as loadingState">
      <div *ngIf="loadingState.isLoading" 
           class="fixed top-0 left-0 w-full z-[9999]">
        <!-- Infinite Progress Bar -->
        <div class="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse">
          <div class="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-shimmer"></div>
        </div>
        
        <!-- Loading Message (optional) -->
        <div *ngIf="loadingState.message" 
             class="bg-surface border-b border-border px-4 py-2 text-sm text-text-light/80">
          {{ loadingState.message }}
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
    
    .animate-shimmer {
      animation: shimmer 2s infinite;
    }
  `]
})
export class InfiniteProgressComponent implements OnInit, OnDestroy {
  protected readonly loadingService = inject(LoadingService);
  private subscription = new Subscription();

  ngOnInit(): void {
    // Debug loading state changes
    this.subscription.add(
      this.loadingService.loadingState$.subscribe(state => {
        console.log('InfiniteProgress: Loading state changed', state);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
} 