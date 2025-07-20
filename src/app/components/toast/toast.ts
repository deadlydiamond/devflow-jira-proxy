import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../services/toast';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-3 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div 
        *ngFor="let toast of toasts$ | async; trackBy: trackByToastId"
        class="max-w-sm p-4 rounded-lg shadow-lg border transition-all duration-300 transform animate-in slide-in-from-right-2"
        [class]="getToastClasses(toast.type)"
      >
        <div class="flex items-start justify-between">
            <div class="flex-1">
              <p class="text-sm font-medium" [class]="getTextClasses(toast.type)">
                {{ toast.message }}
              </p>
          </div>
          <button
            (click)="removeToast(toast.id)"
            class="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Close"
          >
            🗙
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      pointer-events: none;
    }
    
    .fixed > div {
      pointer-events: auto;
    }
  `]
})
export class ToastComponent {
  private readonly toastService = inject(ToastService);
  toasts$ = this.toastService.toasts$;

  removeToast(id: string): void {
    this.toastService.remove(id);
  }

  trackByToastId(index: number, toast: ToastMessage): string {
    return toast.id;
  }

  getToastClasses(type: ToastMessage['type']): string {
    const baseClasses = 'animate-in slide-in-from-right-2';
    
    switch (type) {
      case 'success':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800`;
      case 'error':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800`;
      case 'warning':
        return `${baseClasses} bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800`;
      case 'info':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800`;
      default:
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800`;
    }
  }

  getTextClasses(type: ToastMessage['type']): string {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'text-blue-800 dark:text-blue-200';
      default:
        return 'text-gray-800 dark:text-gray-200';
    }
  }


} 
 