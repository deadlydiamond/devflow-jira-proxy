import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SquadApiService, Squad, TeamMember } from '../../services/squad-api.service';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-squad-management-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './squad-management-page.html',
  styleUrls: ['./squad-management-page.css']
})
export class SquadManagementPageComponent implements OnInit {
  squads = signal<Squad[]>([]);
  members = signal<TeamMember[]>([]);
  selectedSquad = signal<Squad | null>(null);
  selectedMember = signal<TeamMember | null>(null);
  
  showSquadModal = signal(false);
  showMemberModal = signal(false);
  isEditingSquad = signal(false);
  isEditingMember = signal(false);
  
  squadForm: FormGroup;
  memberForm: FormGroup;
  
  availableMembers: TeamMember[] = [];
  unassignedMembers: TeamMember[] = [];

  constructor(
    private squadApiService: SquadApiService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.squadForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      color: ['#3B82F6', Validators.required],
      isActive: [true]
    });

    this.memberForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.email]],
      role: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loadSquads();
    this.loadMembers();
  }

  private loadSquads(): void {
    this.squadApiService.getSquads().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.squads.set(response.data);
        }
      },
      error: (error) => {
        this.toastService.error('Failed to load squads: ' + error.message);
      }
    });
  }

  private loadMembers(): void {
    this.squadApiService.getMembers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.members.set(response.data);
          this.updateAvailableMembers();
        }
      },
      error: (error) => {
        this.toastService.error('Failed to load members: ' + error.message);
      }
    });
  }

  private updateAvailableMembers(): void {
    this.availableMembers = this.members().filter(m => m.is_active);
    this.unassignedMembers = this.members().filter(m => !m.squad_id && m.is_active);
  }

  // Squad CRUD operations
  openSquadModal(squad?: Squad): void {
    this.isEditingSquad.set(!!squad);
    this.selectedSquad.set(squad || null);
    
    if (squad) {
      this.squadForm.patchValue({
        name: squad.name,
        description: squad.description,
        color: squad.color,
        isActive: squad.is_active
      });
    } else {
      this.squadForm.reset({
        name: '',
        description: '',
        color: '#3B82F6',
        isActive: true
      });
    }
    
    this.showSquadModal.set(true);
  }

  closeSquadModal(): void {
    this.showSquadModal.set(false);
    this.selectedSquad.set(null);
    this.squadForm.reset();
  }

  saveSquad(): void {
    if (this.squadForm.valid) {
      const formValue = this.squadForm.value;
      const squadData = {
        name: formValue.name,
        description: formValue.description,
        color: formValue.color,
        is_active: formValue.isActive
      };

      if (this.isEditingSquad() && this.selectedSquad()) {
        this.squadApiService.updateSquad(this.selectedSquad()!.id, squadData).subscribe({
          next: (response) => {
            if (response.success) {
              this.toastService.success('Squad updated successfully');
              this.loadSquads();
              this.closeSquadModal();
            } else {
              this.toastService.error(response.message || 'Failed to update squad');
            }
          },
          error: (error) => {
            this.toastService.error('Failed to update squad: ' + error.message);
          }
        });
      } else {
        this.squadApiService.createSquad(squadData).subscribe({
          next: (response) => {
            if (response.success) {
              this.toastService.success('Squad created successfully');
              this.loadSquads();
              this.closeSquadModal();
            } else {
              this.toastService.error(response.message || 'Failed to create squad');
            }
          },
          error: (error) => {
            this.toastService.error('Failed to create squad: ' + error.message);
          }
        });
      }
    }
  }

  deleteSquad(squad: Squad): void {
    if (confirm(`Are you sure you want to delete the squad "${squad.name}"?`)) {
      this.squadApiService.deleteSquad(squad.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Squad deleted successfully');
            this.loadSquads();
          } else {
            this.toastService.error(response.message || 'Failed to delete squad');
          }
        },
        error: (error) => {
          this.toastService.error('Failed to delete squad: ' + error.message);
        }
      });
    }
  }

  // Member CRUD operations
  openMemberModal(member?: TeamMember): void {
    this.isEditingMember.set(!!member);
    this.selectedMember.set(member || null);
    
    if (member) {
      this.memberForm.patchValue({
        name: member.name,
        email: member.email,
        role: member.role,
        isActive: member.is_active
      });
    } else {
      this.memberForm.reset({
        name: '',
        email: '',
        role: '',
        isActive: true
      });
    }
    
    this.showMemberModal.set(true);
  }

  closeMemberModal(): void {
    this.showMemberModal.set(false);
    this.selectedMember.set(null);
    this.memberForm.reset();
  }

  saveMember(): void {
    if (this.memberForm.valid) {
      const formValue = this.memberForm.value;
      const memberData = {
        name: formValue.name,
        email: formValue.email,
        role: formValue.role,
        is_active: formValue.isActive
      };

      if (this.isEditingMember() && this.selectedMember()) {
        this.squadApiService.updateMember(this.selectedMember()!.id, memberData).subscribe({
          next: (response) => {
            if (response.success) {
              this.toastService.success('Team member updated successfully');
              this.loadMembers();
              this.closeMemberModal();
            } else {
              this.toastService.error(response.message || 'Failed to update team member');
            }
          },
          error: (error) => {
            this.toastService.error('Failed to update team member: ' + error.message);
          }
        });
      } else {
        this.squadApiService.createMember(memberData).subscribe({
          next: (response) => {
            if (response.success) {
              this.toastService.success('Team member added successfully');
              this.loadMembers();
              this.closeMemberModal();
            } else {
              this.toastService.error(response.message || 'Failed to create team member');
            }
          },
          error: (error) => {
            this.toastService.error('Failed to create team member: ' + error.message);
          }
        });
      }
    }
  }

  deleteMember(member: TeamMember): void {
    if (confirm(`Are you sure you want to delete "${member.name}"?`)) {
      this.squadApiService.deleteMember(member.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Team member deleted successfully');
            this.loadMembers();
          } else {
            this.toastService.error(response.message || 'Failed to delete team member');
          }
        },
        error: (error) => {
          this.toastService.error('Failed to delete team member: ' + error.message);
        }
      });
    }
  }

  // Helper methods
  getSquadMembers(squadId: string): TeamMember[] {
    return this.members().filter(m => m.squad_id === squadId);
  }

  getSquadLead(squadId: string): TeamMember | null {
    // For now, return null as we don't have squad leads in the new API
    return null;
  }

  getSquadStats(squadId: string) {
    const members = this.getSquadMembers(squadId);
    return {
      totalMembers: members.length,
      activeMembers: members.filter(m => m.is_active).length,
      leadName: 'Not assigned' // For now, return default as we don't have squad leads in the new API
    };
  }

  assignMemberToSquad(memberId: string, squadId: string | null): void {
    if (squadId) {
      this.squadApiService.assignMemberToSquad(memberId, squadId).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Member assigned to squad successfully');
            this.loadMembers();
          } else {
            this.toastService.error(response.message || 'Failed to assign member to squad');
          }
        },
        error: (error) => {
          this.toastService.error('Failed to assign member to squad: ' + error.message);
        }
      });
    } else {
      this.squadApiService.removeMemberFromSquad(memberId).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Member removed from squad successfully');
            this.loadMembers();
          } else {
            this.toastService.error(response.message || 'Failed to remove member from squad');
          }
        },
        error: (error) => {
          this.toastService.error('Failed to remove member from squad: ' + error.message);
        }
      });
    }
  }

  onSquadAssignmentChange(memberId: string, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const squadId = target.value || null;
    this.assignMemberToSquad(memberId, squadId);
  }

  setSquadLead(squadId: string, memberId: string | null): void {
    // For now, just show a message as we don't have squad leads in the new API
    this.toastService.info('Squad lead functionality not implemented in current API');
  }

  getMemberInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  getMemberAvatarColor(name: string): string {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }
} 