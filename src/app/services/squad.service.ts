import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  squadId: string | null;
  avatar?: string;
  joinDate: Date;
  isActive: boolean;
}

export interface Squad {
  id: string;
  name: string;
  description: string;
  leadId: string | null;
  memberIds: string[];
  createdAt: Date;
  isActive: boolean;
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class SquadService {
  private squadsSubject = new BehaviorSubject<Squad[]>([]);
  private membersSubject = new BehaviorSubject<TeamMember[]>([]);

  public squads$ = this.squadsSubject.asObservable();
  public members$ = this.membersSubject.asObservable();

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    // Load from localStorage or set default data
    const savedSquads = localStorage.getItem('squads');
    const savedMembers = localStorage.getItem('teamMembers');

    if (savedSquads) {
      this.squadsSubject.next(JSON.parse(savedSquads));
    } else {
      // Set default squads
      const defaultSquads: Squad[] = [
        {
          id: '1',
          name: 'Frontend Squad',
          description: 'Handles all frontend development and UI/UX',
          leadId: null,
          memberIds: [],
          createdAt: new Date(),
          isActive: true,
          color: '#3B82F6'
        },
        {
          id: '2',
          name: 'Backend Squad',
          description: 'Manages API development and database operations',
          leadId: null,
          memberIds: [],
          createdAt: new Date(),
          isActive: true,
          color: '#10B981'
        },
        {
          id: '3',
          name: 'DevOps Squad',
          description: 'Infrastructure and deployment management',
          leadId: null,
          memberIds: [],
          createdAt: new Date(),
          isActive: true,
          color: '#F59E0B'
        }
      ];
      this.squadsSubject.next(defaultSquads);
      this.saveSquads(defaultSquads);
    }

    if (savedMembers) {
      this.membersSubject.next(JSON.parse(savedMembers));
    } else {
      // Set default members
      const defaultMembers: TeamMember[] = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john.doe@company.com',
          role: 'Senior Frontend Developer',
          squadId: '1',
          joinDate: new Date('2023-01-15'),
          isActive: true
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane.smith@company.com',
          role: 'Backend Developer',
          squadId: '2',
          joinDate: new Date('2023-02-01'),
          isActive: true
        },
        {
          id: '3',
          name: 'Mike Johnson',
          email: 'mike.johnson@company.com',
          role: 'DevOps Engineer',
          squadId: '3',
          joinDate: new Date('2023-01-20'),
          isActive: true
        }
      ];
      this.membersSubject.next(defaultMembers);
      this.saveMembers(defaultMembers);
    }
  }

  // Squad CRUD operations
  createSquad(squad: Omit<Squad, 'id' | 'createdAt'>): Squad {
    const newSquad: Squad = {
      ...squad,
      id: this.generateId(),
      createdAt: new Date()
    };
    
    const currentSquads = this.squadsSubject.value;
    const updatedSquads = [...currentSquads, newSquad];
    this.squadsSubject.next(updatedSquads);
    this.saveSquads(updatedSquads);
    
    return newSquad;
  }

  updateSquad(id: string, updates: Partial<Squad>): Squad | null {
    const currentSquads = this.squadsSubject.value;
    const squadIndex = currentSquads.findIndex(s => s.id === id);
    
    if (squadIndex === -1) return null;
    
    const updatedSquad = { ...currentSquads[squadIndex], ...updates };
    const updatedSquads = [...currentSquads];
    updatedSquads[squadIndex] = updatedSquad;
    
    this.squadsSubject.next(updatedSquads);
    this.saveSquads(updatedSquads);
    
    return updatedSquad;
  }

  deleteSquad(id: string): boolean {
    const currentSquads = this.squadsSubject.value;
    const squadToDelete = currentSquads.find(s => s.id === id);
    
    if (!squadToDelete) return false;
    
    // Remove squad from all members
    const currentMembers = this.membersSubject.value;
    const updatedMembers = currentMembers.map(member => 
      member.squadId === id ? { ...member, squadId: null } : member
    );
    this.membersSubject.next(updatedMembers);
    this.saveMembers(updatedMembers);
    
    // Remove squad
    const updatedSquads = currentSquads.filter(s => s.id !== id);
    this.squadsSubject.next(updatedSquads);
    this.saveSquads(updatedSquads);
    
    return true;
  }

  getSquad(id: string): Squad | null {
    return this.squadsSubject.value.find(s => s.id === id) || null;
  }

  // Team Member CRUD operations
  createMember(member: Omit<TeamMember, 'id' | 'joinDate'>): TeamMember {
    const newMember: TeamMember = {
      ...member,
      id: this.generateId(),
      joinDate: new Date()
    };
    
    const currentMembers = this.membersSubject.value;
    const updatedMembers = [...currentMembers, newMember];
    this.membersSubject.next(updatedMembers);
    this.saveMembers(updatedMembers);
    
    return newMember;
  }

  updateMember(id: string, updates: Partial<TeamMember>): TeamMember | null {
    const currentMembers = this.membersSubject.value;
    const memberIndex = currentMembers.findIndex(m => m.id === id);
    
    if (memberIndex === -1) return null;
    
    const updatedMember = { ...currentMembers[memberIndex], ...updates };
    const updatedMembers = [...currentMembers];
    updatedMembers[memberIndex] = updatedMember;
    
    this.membersSubject.next(updatedMembers);
    this.saveMembers(updatedMembers);
    
    return updatedMember;
  }

  deleteMember(id: string): boolean {
    const currentMembers = this.membersSubject.value;
    const updatedMembers = currentMembers.filter(m => m.id !== id);
    
    this.membersSubject.next(updatedMembers);
    this.saveMembers(updatedMembers);
    
    return true;
  }

  getMember(id: string): TeamMember | null {
    return this.membersSubject.value.find(m => m.id === id) || null;
  }

  // Helper methods
  getMembersBySquad(squadId: string): TeamMember[] {
    return this.membersSubject.value.filter(m => m.squadId === squadId);
  }

  getSquadLead(squadId: string): TeamMember | null {
    const squad = this.getSquad(squadId);
    if (!squad || !squad.leadId) return null;
    return this.getMember(squad.leadId);
  }

  assignMemberToSquad(memberId: string, squadId: string | null): boolean {
    const member = this.getMember(memberId);
    if (!member) return false;
    
    return this.updateMember(memberId, { squadId }) !== null;
  }

  setSquadLead(squadId: string, memberId: string | null): boolean {
    const squad = this.getSquad(squadId);
    if (!squad) return false;
    
    return this.updateSquad(squadId, { leadId: memberId }) !== null;
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private saveSquads(squads: Squad[]): void {
    localStorage.setItem('squads', JSON.stringify(squads));
  }

  private saveMembers(members: TeamMember[]): void {
    localStorage.setItem('teamMembers', JSON.stringify(members));
  }

  // Get statistics
  getSquadStats(squadId: string): { totalMembers: number; activeMembers: number; leadName: string | null } {
    const members = this.getMembersBySquad(squadId);
    const squad = this.getSquad(squadId);
    const lead = squad ? this.getSquadLead(squadId) : null;
    
    return {
      totalMembers: members.length,
      activeMembers: members.filter(m => m.isActive).length,
      leadName: lead?.name || null
    };
  }
} 