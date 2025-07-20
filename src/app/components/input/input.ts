import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-input',
  imports: [CommonModule],
  templateUrl: './input.html',
  styleUrl: './input.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ]
})
export class InputComponent implements ControlValueAccessor {
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' = 'text';
  @Input() placeholder: string = '';
  @Input() label?: string;
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() readonly: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() error?: string;
  @Input() hint?: string;
  
  @Output() valueChange = new EventEmitter<string>();
  @Output() focus = new EventEmitter<FocusEvent>();
  @Output() blur = new EventEmitter<FocusEvent>();

  value: string = '';
  touched: boolean = false;
  inputId: string = Math.random().toString(36).substr(2, 9);

  // ControlValueAccessor implementation
  onChange = (value: string) => {};
  onTouched = () => {};

  get inputClasses(): string {
    const baseClasses = 'w-full rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-4 py-3 text-base'
    };
    
    const stateClasses = this.error 
      ? 'border-red-300 dark:border-red-600 focus:ring-red-500/50 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100'
      : 'border-gray-300 dark:border-border bg-white dark:bg-surface text-gray-900 dark:text-text-light focus:ring-primary/50 focus:border-primary';
    
    return `${baseClasses} ${sizeClasses[this.size]} ${stateClasses}`;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
    this.valueChange.emit(this.value);
  }

  onFocus(event: FocusEvent): void {
    this.focus.emit(event);
  }

  onBlur(event: FocusEvent): void {
    this.touched = true;
    this.onTouched();
    this.blur.emit(event);
  }

  // ControlValueAccessor methods
  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
