import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  requestCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingState = new BehaviorSubject<LoadingState>({
    isLoading: false,
    message: '',
    requestCount: 0
  });

  public loadingState$ = this.loadingState.asObservable();

  /**
   * Start loading with optional message
   */
  startLoading(message?: string): void {
    const currentState = this.loadingState.value;
    const newState: LoadingState = {
      isLoading: true,
      message: message || currentState.message,
      requestCount: currentState.requestCount + 1
    };
    console.log('LoadingService: startLoading', { message, newState });
    this.loadingState.next(newState);
  }

  /**
   * Stop loading
   */
  stopLoading(): void {
    const currentState = this.loadingState.value;
    const newRequestCount = Math.max(0, currentState.requestCount - 1);
    
    const newState: LoadingState = {
      isLoading: newRequestCount > 0,
      message: newRequestCount > 0 ? currentState.message : '',
      requestCount: newRequestCount
    };
    console.log('LoadingService: stopLoading', { newState });
    this.loadingState.next(newState);
  }

  /**
   * Set loading message
   */
  setMessage(message: string): void {
    const currentState = this.loadingState.value;
    const newState: LoadingState = {
      ...currentState,
      message
    };
    this.loadingState.next(newState);
  }

  /**
   * Reset loading state
   */
  reset(): void {
    this.loadingState.next({
      isLoading: false,
      message: '',
      requestCount: 0
    });
  }

  /**
   * Get current loading state
   */
  getLoadingState(): LoadingState {
    return this.loadingState.value;
  }

  /**
   * Check if currently loading
   */
  isLoading(): boolean {
    return this.loadingState.value.isLoading;
  }
} 