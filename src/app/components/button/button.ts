import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  imports: [CommonModule],
  templateUrl: './button.html',
  styleUrl: './button.css'
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() fullWidth: boolean = false;
  
  @Output() clicked = new EventEmitter<void>();

  get buttonClasses(): string {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };
    
    const variantClasses = {
      primary: 'bg-primary hover:bg-primary/90 text-white focus:ring-primary/50',
      secondary: 'bg-gray-100 dark:bg-surface hover:bg-gray-200 dark:hover:bg-surface/80 text-gray-900 dark:text-text-light border border-gray-300 dark:border-border focus:ring-gray-500/50',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/50',
      ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-surface text-gray-700 dark:text-text-light focus:ring-gray-500/50'
    };
    
    const widthClass = this.fullWidth ? 'w-full' : '';
    
    return `${baseClasses} ${sizeClasses[this.size]} ${variantClasses[this.variant]} ${widthClass}`;
  }

  onClick(): void {
    if (!this.disabled && !this.loading) {
      this.clicked.emit();
    }
  }
}
