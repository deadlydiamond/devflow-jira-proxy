import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService, User, UserRole } from '../../services/auth.service';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-superadmin-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './superadmin-panel.html',
  styleUrl: './superadmin-panel.css'
})
export class SuperadminPanelComponent implements OnInit {
  users = signal<User[]>([]);
  showModal = signal(false);
  isEditing = signal(false);
  isLoading = signal(false);
  selectedUser: User | null = null;
  userForm: FormGroup;
  UserRole = UserRole; // Make enum available in template

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService
  ) {
    this.userForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', [Validators.required]],
      is_active: [true]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.authService.getAllUsers().subscribe({
      next: (users) => {
        this.users.set(users);
      },
      error: (error) => {
        this.toastService.error('Failed to load users: ' + error.message);
      }
    });
  }

  openAddUserModal(): void {
    this.isEditing.set(false);
    this.selectedUser = null;
    this.userForm.reset({
      name: '',
      email: '',
      password: '',
      role: '',
      is_active: true
    });
    this.showModal.set(true);
  }

  editUser(user: User): void {
    this.isEditing.set(true);
    this.selectedUser = user;
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedUser = null;
  }

  saveUser(): void {
    if (this.userForm.valid) {
      this.isLoading.set(true);
      
      if (this.isEditing() && this.selectedUser) {
        // Update user
        this.authService.updateUserRole(this.selectedUser.id, this.userForm.get('role')?.value).subscribe({
          next: (response) => {
            if (response.success) {
              this.toastService.success('User updated successfully');
              this.loadUsers();
              this.closeModal();
            } else {
              this.toastService.error('Failed to update user');
            }
            this.isLoading.set(false);
          },
          error: (error) => {
            this.toastService.error('Failed to update user: ' + error.message);
            this.isLoading.set(false);
          }
        });
      } else {
        // Create new user
        const userData = {
          name: this.userForm.get('name')?.value,
          email: this.userForm.get('email')?.value,
          password: this.userForm.get('password')?.value,
          role: this.userForm.get('role')?.value
        };
        
        this.authService.register(userData).subscribe({
          next: (response) => {
            if (response.success) {
              this.toastService.success('User created successfully');
              this.loadUsers();
              this.closeModal();
            } else {
              this.toastService.error('Failed to create user');
            }
            this.isLoading.set(false);
          },
          error: (error) => {
            this.toastService.error('Failed to create user: ' + error.message);
            this.isLoading.set(false);
          }
        });
      }
    }
  }

  deleteUser(user: User): void {
    if (confirm(`Are you sure you want to delete "${user.name}"?`)) {
      this.authService.deleteUser(user.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('User deleted successfully');
            this.loadUsers();
          } else {
            this.toastService.error('Failed to delete user');
          }
        },
        error: (error) => {
          this.toastService.error('Failed to delete user: ' + error.message);
        }
      });
    }
  }

  getActiveUsersCount(): number {
    return this.users().filter(user => user.is_active).length;
  }

  get2FAEnabledCount(): number {
    return this.users().filter(user => user.two_factor_enabled).length;
  }

  getRoleCount(role: UserRole): number {
    return this.users().filter(user => user.role === role).length;
  }

  getUserInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  getRoleBadgeClass(role: UserRole): string {
    switch (role) {
      case UserRole.SUPERADMIN:
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case UserRole.LEAD:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case UserRole.ENGINEER:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case UserRole.PO:
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
} 