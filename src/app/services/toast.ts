import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  timestamp: Date;
  persistent?: boolean; // New property for persistent toasts
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts = new BehaviorSubject<ToastMessage[]>([]);
  public toasts$ = this.toasts.asObservable();

  /**
   * Show a success toast
   */
  success(message: string, duration: number = 5000): void {
    this.show(message, 'success', duration);
  }

  /**
   * Show an error toast
   */
  error(message: string, duration: number = 8000): void {
    this.show(message, 'error', duration);
  }

  /**
   * Show a warning toast
   */
  warning(message: string, duration: number = 6000): void {
    this.show(message, 'warning', duration);
  }

  /**
   * Show an info toast
   */
  info(message: string, duration: number = 5000): void {
    this.show(message, 'info', duration);
  }

  /**
   * Show a persistent success toast (doesn't auto-hide)
   */
  persistentSuccess(message: string): void {
    this.show(message, 'success', 0, true);
  }

  /**
   * Show a persistent error toast (doesn't auto-hide)
   */
  persistentError(message: string): void {
    this.show(message, 'error', 0, true);
  }

  /**
   * Show a persistent warning toast (doesn't auto-hide)
   */
  persistentWarning(message: string): void {
    this.show(message, 'warning', 0, true);
  }

  /**
   * Show a persistent info toast (doesn't auto-hide)
   */
  persistentInfo(message: string): void {
    this.show(message, 'info', 0, true);
  }

  /**
   * Show a toast message
   */
  private show(message: string, type: ToastMessage['type'], duration: number, persistent: boolean = false): void {
    const toast: ToastMessage = {
      id: this.generateId(),
      type,
      message,
      duration: persistent ? 0 : duration,
      timestamp: new Date(),
      persistent
    };

    const currentToasts = this.toasts.value;
    this.toasts.next([...currentToasts, toast]);

    // Auto-remove after duration (only for non-persistent toasts)
    if (duration > 0 && !persistent) {
      setTimeout(() => {
        this.remove(toast.id);
      }, duration);
    }
  }

  /**
   * Remove a specific toast
   */
  remove(id: string): void {
    const currentToasts = this.toasts.value;
    this.toasts.next(currentToasts.filter(toast => toast.id !== id));
  }

  /**
   * Clear all toasts
   */
  clear(): void {
    this.toasts.next([]);
  }

  /**
   * Clear only persistent toasts
   */
  clearPersistent(): void {
    const currentToasts = this.toasts.value;
    const nonPersistentToasts = currentToasts.filter(toast => !toast.persistent);
    this.toasts.next(nonPersistentToasts);
  }

  /**
   * Generate unique ID for toast
   */
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
} 
 