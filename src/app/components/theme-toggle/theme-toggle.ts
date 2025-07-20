import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-theme-toggle',
  imports: [CommonModule],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.css',
  animations: [
    trigger('iconAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8) rotate(-10deg)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1) rotate(0deg)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.8) rotate(10deg)' }))
      ])
    ])
  ]
})
export class ThemeToggleComponent {
  private readonly themeService = inject(ThemeService);
  
  protected readonly isDarkMode = this.themeService.getDarkModeSignal();

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  getAriaLabel(): string {
    return this.isDarkMode() 
      ? 'Switch to light mode' 
      : 'Switch to dark mode';
  }

  getTooltip(): string {
    return this.isDarkMode() 
      ? 'Switch to light mode' 
      : 'Switch to dark mode';
  }
}
