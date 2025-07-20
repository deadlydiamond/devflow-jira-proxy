import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocalStorageService } from '../../services/local-storage';
import { CardComponent } from '../../components/card/card';
import { ButtonComponent } from '../../components/button/button';
import { JiraIntegrationComponent } from '../../components/jira-integration/jira-integration';
import { AiTaskAssistantComponent } from '../../components/ai-task-assistant/ai-task-assistant';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type TaskStatus = 'todo' | 'in-progress' | 'done' | 'all';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent, JiraIntegrationComponent, AiTaskAssistantComponent],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.css'
})
export class TasksPageComponent implements OnInit {
  private readonly localStorage = inject(LocalStorageService);
  
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  selectedStatus: TaskStatus = 'all';
  newTaskTitle = '';
  newTaskDescription = '';
  newTaskPriority: 'low' | 'medium' | 'high' = 'medium';

  ngOnInit(): void {
    this.loadTasks();
    this.loadFilter();
    this.applyFilter();
  }

  private loadTasks(): void {
    const tasks = this.localStorage.get<Task[]>('tasks', this.getDefaultTasks());
    this.tasks = tasks ?? this.getDefaultTasks();
  }

  private loadFilter(): void {
    const filter = this.localStorage.get<TaskStatus>('task_filter', 'all');
    this.selectedStatus = filter ?? 'all';
  }

  private getDefaultTasks(): Task[] {
    return [
      {
        id: '1',
        title: 'Implement user authentication',
        description: 'Add login and registration functionality with JWT tokens',
        status: 'in-progress',
        priority: 'high',
        isPinned: true,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-16')
      },
      {
        id: '2',
        title: 'Setup development environment',
        description: 'Configure Docker containers and database connections',
        status: 'done',
        priority: 'medium',
        isPinned: false,
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-12')
      },
      {
        id: '3',
        title: 'Design API endpoints',
        description: 'Create RESTful API documentation and implement core endpoints',
        status: 'todo',
        priority: 'high',
        isPinned: true,
        createdAt: new Date('2024-01-14'),
        updatedAt: new Date('2024-01-14')
      },
      {
        id: '4',
        title: 'Write unit tests',
        description: 'Cover all critical functionality with comprehensive tests',
        status: 'todo',
        priority: 'medium',
        isPinned: false,
        createdAt: new Date('2024-01-13'),
        updatedAt: new Date('2024-01-13')
      }
    ];
  }

  createTask(): void {
    if (!this.newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: this.newTaskTitle,
      description: this.newTaskDescription,
      status: 'todo',
      priority: this.newTaskPriority,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.unshift(newTask);
    this.saveTasks();
    this.applyFilter();

    // Clear form
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.newTaskPriority = 'medium';
  }

  updateTaskStatus(taskId: string, newStatus: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && (newStatus === 'todo' || newStatus === 'in-progress' || newStatus === 'done')) {
      task.status = newStatus as Task['status'];
      task.updatedAt = new Date();
      this.saveTasks();
      this.applyFilter();
    }
  }

  togglePinTask(taskId: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.isPinned = !task.isPinned;
      task.updatedAt = new Date();
      this.saveTasks();
      this.applyFilter();
    }
  }

  deleteTask(taskId: string): void {
    this.tasks = this.tasks.filter(task => task.id !== taskId);
    this.saveTasks();
    this.applyFilter();
  }

  onFilterChange(): void {
    this.localStorage.set('task_filter', this.selectedStatus);
    this.applyFilter();
  }

  selectStatus(status: string): void {
    if (status === 'all' || status === 'todo' || status === 'in-progress' || status === 'done') {
      this.selectedStatus = status as TaskStatus;
      this.onFilterChange();
    }
  }

  updateTaskStatusFromEvent(taskId: string, event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      this.updateTaskStatus(taskId, target.value);
    }
  }

  private applyFilter(): void {
    if (this.selectedStatus === 'all') {
      this.filteredTasks = [...this.tasks];
    } else {
      this.filteredTasks = this.tasks.filter(task => task.status === this.selectedStatus);
    }
  }

  private saveTasks(): void {
    this.localStorage.set('tasks', this.tasks);
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'todo': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  getStatusCount(status: string): number {
    if (status === 'all') return this.tasks.length;
    return this.tasks.filter(task => task.status === status).length;
  }
}
