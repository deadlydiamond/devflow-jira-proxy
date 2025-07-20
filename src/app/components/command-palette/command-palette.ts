import { Component, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ThemeService } from '../../services/theme';
import { LocalStorageService } from '../../services/local-storage';

export interface Command {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
  icon?: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'settings' | 'tasks';
}

@Component({
  selector: 'app-command-palette',
  imports: [CommonModule, FormsModule],
  templateUrl: './command-palette.html',
  styleUrl: './command-palette.css'
})
export class CommandPaletteComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly localStorageService = inject(LocalStorageService);

  isOpen = false;
  searchQuery = '';
  selectedIndex = 0;
  filteredCommands: Command[] = [];
  allCommands: Command[] = [];

  ngOnInit(): void {
    this.initializeCommands();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key === 'k') {
      event.preventDefault();
      this.togglePalette();
    }

    if (!this.isOpen) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.closePalette();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.selectNext();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectPrevious();
        break;
      case 'Enter':
        event.preventDefault();
        this.executeSelectedCommand();
        break;
    }
  }

  private initializeCommands(): void {
    this.allCommands = [
      // Navigation commands
      {
        id: 'go-dashboard',
        title: 'Go to Dashboard',
        description: 'Navigate to the main dashboard',
        keywords: ['dashboard', 'home', 'main', 'overview'],
        icon: '🏠',
        category: 'navigation',
        action: () => this.router.navigate(['/dashboard'])
      },
      {
        id: 'go-tasks',
        title: 'Go to Tasks',
        description: 'Navigate to the tasks page',
        keywords: ['tasks', 'todo', 'list', 'work'],
        icon: '📋',
        category: 'navigation',
        action: () => this.router.navigate(['/tasks'])
      },
      {
        id: 'go-settings',
        title: 'Open Settings',
        description: 'Navigate to the settings page',
        keywords: ['settings', 'config', 'preferences', 'options'],
        icon: '⚙️',
        category: 'navigation',
        action: () => this.router.navigate(['/settings'])
      },
      {
        id: 'go-demo',
        title: 'Component Demo',
        description: 'Navigate to the component demo page',
        keywords: ['demo', 'components', 'showcase', 'examples'],
        icon: '🎨',
        category: 'navigation',
        action: () => this.router.navigate(['/demo'])
      },

      // Actions commands
      {
        id: 'toggle-theme',
        title: 'Toggle Dark Mode',
        description: 'Switch between light and dark themes',
        keywords: ['theme', 'dark', 'light', 'mode', 'toggle'],
        icon: '🌙',
        category: 'actions',
        action: () => this.themeService.toggleTheme()
      },
      {
        id: 'clear-focused-tasks',
        title: 'Clear Focused Tasks',
        description: 'Remove all completed tasks from localStorage',
        keywords: ['clear', 'tasks', 'completed', 'remove', 'clean'],
        icon: '🗑️',
        category: 'actions',
        action: () => this.clearFocusedTasks()
      },
      {
        id: 'export-data',
        title: 'Export Data',
        description: 'Export all localStorage data as JSON',
        keywords: ['export', 'data', 'backup', 'download'],
        icon: '📤',
        category: 'actions',
        action: () => this.exportData()
      },
      {
        id: 'import-data',
        title: 'Import Data',
        description: 'Import data from JSON file',
        keywords: ['import', 'data', 'restore', 'upload'],
        icon: '📥',
        category: 'actions',
        action: () => this.importData()
      },

      // Settings commands
      {
        id: 'clear-storage',
        title: 'Clear All Data',
        description: 'Remove all data from localStorage',
        keywords: ['clear', 'storage', 'reset', 'wipe', 'delete'],
        icon: '💥',
        category: 'settings',
        action: () => this.clearAllData()
      },
      {
        id: 'show-storage-info',
        title: 'Show Storage Info',
        description: 'Display localStorage usage information',
        keywords: ['storage', 'info', 'usage', 'size', 'keys'],
        icon: '📊',
        category: 'settings',
        action: () => this.showStorageInfo()
      }
    ];

    this.filteredCommands = [...this.allCommands];
  }

  togglePalette(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchQuery = '';
      this.selectedIndex = 0;
      this.filterCommands();
      // Focus the search input after a brief delay
      setTimeout(() => {
        const searchInput = document.getElementById('command-search');
        if (searchInput) {
          (searchInput as HTMLInputElement).focus();
        }
      }, 100);
    }
  }

  closePalette(): void {
    this.isOpen = false;
    this.searchQuery = '';
    this.selectedIndex = 0;
  }

  onSearchChange(): void {
    this.filterCommands();
    this.selectedIndex = 0;
  }

  private filterCommands(): void {
    if (!this.searchQuery.trim()) {
      this.filteredCommands = [...this.allCommands];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredCommands = this.allCommands.filter(command => {
      const searchableText = [
        command.title.toLowerCase(),
        command.description?.toLowerCase() || '',
        ...(command.keywords?.map(k => k.toLowerCase()) || [])
      ].join(' ');

      return searchableText.includes(query);
    });
  }

  selectNext(): void {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
  }

  selectPrevious(): void {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex = this.selectedIndex === 0 
      ? this.filteredCommands.length - 1 
      : this.selectedIndex - 1;
  }

  executeSelectedCommand(): void {
    if (this.filteredCommands.length === 0) return;
    
    const selectedCommand = this.filteredCommands[this.selectedIndex];
    if (selectedCommand) {
      selectedCommand.action();
      this.closePalette();
    }
  }

  onCommandClick(command: Command): void {
    command.action();
    this.closePalette();
  }

  // Command implementations
  private clearFocusedTasks(): void {
    this.localStorageService.set('focusedTasks', []);
  }

  private exportData(): void {
    const allData: Record<string, any> = {};
    const keys = this.localStorageService.getKeys();
    
    keys.forEach(key => {
      allData[key] = this.localStorageService.get(key);
    });

    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `devflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  private importData(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const data = JSON.parse(e.target.result);
            Object.keys(data).forEach(key => {
              this.localStorageService.set(key, data[key]);
            });
            console.log('Data imported successfully');
          } catch (error) {
            console.error('Error importing data:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  private clearAllData(): void {
    this.localStorageService.clear();
  }

  private showStorageInfo(): void {
    const keys = this.localStorageService.getKeys();
    const size = this.localStorageService.getSize();
    const info = {
      totalKeys: keys.length,
      totalSize: `${(size / 1024).toFixed(2)} KB`,
      keys: keys
    };
    console.log('Storage Info:', info);
    alert(`Storage Info:\nKeys: ${info.totalKeys}\nSize: ${info.totalSize}\nKeys: ${keys.join(', ')}`);
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      navigation: '🧭',
      actions: '⚡',
      settings: '⚙️',
      tasks: '📋'
    };
    return icons[category] || '📄';
  }
}
