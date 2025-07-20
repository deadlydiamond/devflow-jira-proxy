import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalStorageService } from '../../services/local-storage';

export interface Story {
  id: string;
  title: string;
  description?: string;
  author?: string;
  date?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
}

@Component({
  selector: 'app-pinned-story-card',
  imports: [CommonModule],
  templateUrl: './pinned-story-card.html',
  styleUrl: './pinned-story-card.css'
})
export class PinnedStoryCardComponent implements OnInit {
  @Input() story!: Story;
  @Input() showPinButton: boolean = true;
  @Input() showTags: boolean = true;
  @Input() showPriority: boolean = true;
  
  @Output() pinned = new EventEmitter<Story>();
  @Output() unpinned = new EventEmitter<Story>();
  @Output() clicked = new EventEmitter<Story>();

  private readonly localStorageService = inject(LocalStorageService);
  
  isPinned: boolean = false;

  ngOnInit(): void {
    this.loadPinStatus();
  }

  private loadPinStatus(): void {
    const pinnedStories = this.localStorageService.get<string[]>('pinnedStories', []) || [];
    this.isPinned = pinnedStories.includes(this.story.id);
  }

  togglePin(): void {
    const pinnedStories = this.localStorageService.get<string[]>('pinnedStories', []) || [];
    
    if (this.isPinned) {
      // Unpin
      const updatedPinnedStories = pinnedStories.filter(id => id !== this.story.id);
      this.localStorageService.set('pinnedStories', updatedPinnedStories);
      this.isPinned = false;
      this.unpinned.emit(this.story);
    } else {
      // Pin
      const updatedPinnedStories = [...pinnedStories, this.story.id];
      this.localStorageService.set('pinnedStories', updatedPinnedStories);
      this.isPinned = true;
      this.pinned.emit(this.story);
    }
  }

  onCardClick(): void {
    this.clicked.emit(this.story);
  }

  get priorityColor(): string {
    switch (this.story.priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  }

  get priorityText(): string {
    return this.story.priority ? this.story.priority.charAt(0).toUpperCase() + this.story.priority.slice(1) : 'None';
  }
}
