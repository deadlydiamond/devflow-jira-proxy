import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'devflow_theme';
  private readonly themeSignal = signal<Theme>(this.getStoredTheme());

  constructor() {
    this.applyTheme(this.themeSignal());
  }

  getTheme(): Theme {
    return this.themeSignal();
  }

  getDarkModeSignal() {
    return this.themeSignal;
  }

  setTheme(theme: Theme): void {
    this.themeSignal.set(theme);
    this.applyTheme(theme);
    this.storeTheme(theme);
  }

  toggleTheme(): void {
    const currentTheme = this.themeSignal();
    const newTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  private getStoredTheme(): Theme {
    const stored = localStorage.getItem(this.THEME_KEY);
    return (stored as Theme) || 'dark';
  }

  private storeTheme(theme: Theme): void {
    localStorage.setItem(this.THEME_KEY, theme);
  }

  private applyTheme(theme: Theme): void {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
