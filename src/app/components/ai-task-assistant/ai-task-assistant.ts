import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OpenAiService } from '../../services/openai';
import { CardComponent } from '../card/card';
import { ButtonComponent } from '../button/button';

@Component({
  selector: 'app-ai-task-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  templateUrl: './ai-task-assistant.html',
  styleUrl: './ai-task-assistant.css'
})
export class AiTaskAssistantComponent {
  private readonly openaiService = inject(OpenAiService);

  // Input fields
  taskTitle = '';
  taskDescription = '';
  userStory = '';
  
  // AI Results
  estimatedTime = '';
  improvedTitle = '';
  commitMessage = '';
  generatedSubtasks: string[] = [];
  testCases: string[] = [];
  codeReviewChecklist: string[] = [];
  
  // Loading states
  isEstimatingTime = false;
  isImprovingTitle = false;
  isGeneratingCommit = false;
  isGeneratingSubtasks = false;
  isGeneratingTests = false;
  isGeneratingChecklist = false;
  
  // Error states
  errorMessage = '';

  /**
   * Estimate time for a task
   */
  estimateTaskTime(): void {
    if (!this.taskTitle.trim()) {
      this.errorMessage = 'Please enter a task title first';
      return;
    }

    if (!this.openaiService.isTokenConfigured()) {
      this.errorMessage = 'Please configure OpenAI API token in Settings first';
      return;
    }

    this.isEstimatingTime = true;
    this.errorMessage = '';

    this.openaiService.estimateSubtaskTime(this.taskTitle).subscribe({
      next: (result) => {
        this.estimatedTime = result;
        this.isEstimatingTime = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.isEstimatingTime = false;
      }
    });
  }

  /**
   * Improve task title
   */
  improveTaskTitle(): void {
    if (!this.taskTitle.trim()) {
      this.errorMessage = 'Please enter a task title first';
      return;
    }

    if (!this.openaiService.isTokenConfigured()) {
      this.errorMessage = 'Please configure OpenAI API token in Settings first';
      return;
    }

    this.isImprovingTitle = true;
    this.errorMessage = '';

    this.openaiService.improveTaskTitle(this.taskTitle).subscribe({
      next: (result) => {
        this.improvedTitle = result;
        this.isImprovingTitle = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.isImprovingTitle = false;
      }
    });
  }

  /**
   * Generate commit message
   */
  generateCommitMessage(): void {
    if (!this.taskTitle.trim()) {
      this.errorMessage = 'Please enter a task title first';
      return;
    }

    if (!this.openaiService.isTokenConfigured()) {
      this.errorMessage = 'Please configure OpenAI API token in Settings first';
      return;
    }

    this.isGeneratingCommit = true;
    this.errorMessage = '';

    this.openaiService.generateCommitMessage(this.taskTitle).subscribe({
      next: (result) => {
        this.commitMessage = result;
        this.isGeneratingCommit = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.isGeneratingCommit = false;
      }
    });
  }

  /**
   * Generate subtasks from user story
   */
  generateSubtasks(): void {
    if (!this.userStory.trim()) {
      this.errorMessage = 'Please enter a user story first';
      return;
    }

    if (!this.openaiService.isTokenConfigured()) {
      this.errorMessage = 'Please configure OpenAI API token in Settings first';
      return;
    }

    this.isGeneratingSubtasks = true;
    this.errorMessage = '';

    this.openaiService.generateSubtasksFromStory(this.userStory).subscribe({
      next: (result) => {
        this.generatedSubtasks = result;
        this.isGeneratingSubtasks = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.isGeneratingSubtasks = false;
      }
    });
  }

  /**
   * Generate test cases
   */
  generateTestCases(): void {
    if (!this.taskDescription.trim()) {
      this.errorMessage = 'Please enter a task description first';
      return;
    }

    if (!this.openaiService.isTokenConfigured()) {
      this.errorMessage = 'Please configure OpenAI API token in Settings first';
      return;
    }

    this.isGeneratingTests = true;
    this.errorMessage = '';

    this.openaiService.generateTestCases(this.taskDescription).subscribe({
      next: (result) => {
        this.testCases = result;
        this.isGeneratingTests = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.isGeneratingTests = false;
      }
    });
  }

  /**
   * Generate code review checklist
   */
  generateCodeReviewChecklist(): void {
    if (!this.taskTitle.trim()) {
      this.errorMessage = 'Please enter a task title first';
      return;
    }

    if (!this.openaiService.isTokenConfigured()) {
      this.errorMessage = 'Please configure OpenAI API token in Settings first';
      return;
    }

    this.isGeneratingChecklist = true;
    this.errorMessage = '';

    this.openaiService.generateCodeReviewChecklist(this.taskTitle).subscribe({
      next: (result) => {
        this.codeReviewChecklist = result;
        this.isGeneratingChecklist = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.isGeneratingChecklist = false;
      }
    });
  }

  /**
   * Copy text to clipboard
   */
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.estimatedTime = '';
    this.improvedTitle = '';
    this.commitMessage = '';
    this.generatedSubtasks = [];
    this.testCases = [];
    this.codeReviewChecklist = [];
    this.errorMessage = '';
  }

  /**
   * Apply improved title
   */
  applyImprovedTitle(): void {
    if (this.improvedTitle) {
      this.taskTitle = this.improvedTitle;
      this.improvedTitle = '';
    }
  }
} 
 