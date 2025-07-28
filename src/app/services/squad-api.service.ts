import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

export interface Squad {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  lead_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  squad_id?: string;
  name: string;
  email?: string;
  role?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SquadApiService {
  private readonly API_BASE_URL = '/api/supabase-database';
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  private currentUserId = 'default-user';

  constructor(private http: HttpClient) {}

  // Squad operations
  getSquads(): Observable<ApiResponse<Squad[]>> {
    this.loadingSubject.next(true);
    return this.http.get<Squad[]>(`${this.API_BASE_URL}/squads?userId=${this.currentUserId}`)
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        map(squads => ({ success: true, data: squads })),
        catchError(this.handleError)
      );
  }

  getSquad(id: string): Observable<ApiResponse<Squad>> {
    this.loadingSubject.next(true);
    return this.http.get<Squad>(`${this.API_BASE_URL}/squads/${id}`)
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        map(squad => ({ success: true, data: squad })),
        catchError(this.handleError)
      );
  }

  createSquad(squad: Omit<Squad, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Observable<ApiResponse<Squad>> {
    this.loadingSubject.next(true);
    return this.http.post<{ success: boolean }>(`${this.API_BASE_URL}/squads`, {
      userId: this.currentUserId,
      ...squad
    }).pipe(
      tap(() => this.loadingSubject.next(false)),
      map(response => ({ success: response.success })),
      catchError(this.handleError)
    );
  }

  updateSquad(id: string, squad: Partial<Squad>): Observable<ApiResponse<Squad>> {
    this.loadingSubject.next(true);
    return this.http.put<{ success: boolean }>(`${this.API_BASE_URL}/squads`, {
      id,
      ...squad
    }).pipe(
      tap(() => this.loadingSubject.next(false)),
      map(response => ({ success: response.success })),
      catchError(this.handleError)
    );
  }

  deleteSquad(id: string): Observable<ApiResponse<void>> {
    this.loadingSubject.next(true);
    return this.http.delete<{ success: boolean }>(`${this.API_BASE_URL}/squads?id=${id}`)
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        map(response => ({ success: response.success })),
        catchError(this.handleError)
      );
  }

  getSquadMembers(squadId: string): Observable<ApiResponse<TeamMember[]>> {
    this.loadingSubject.next(true);
    return this.http.get<TeamMember[]>(`${this.API_BASE_URL}/team-members?userId=${this.currentUserId}&squadId=${squadId}`)
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        map(members => ({ success: true, data: members })),
        catchError(this.handleError)
      );
  }

  // Team member operations
  getMembers(): Observable<ApiResponse<TeamMember[]>> {
    this.loadingSubject.next(true);
    return this.http.get<TeamMember[]>(`${this.API_BASE_URL}/team-members?userId=${this.currentUserId}`)
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        map(members => ({ success: true, data: members })),
        catchError(this.handleError)
      );
  }

  getMember(id: string): Observable<ApiResponse<TeamMember>> {
    this.loadingSubject.next(true);
    return this.http.get<TeamMember>(`${this.API_BASE_URL}/team-members/${id}`)
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        map(member => ({ success: true, data: member })),
        catchError(this.handleError)
      );
  }

  createMember(member: Omit<TeamMember, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Observable<ApiResponse<TeamMember>> {
    this.loadingSubject.next(true);
    return this.http.post<{ success: boolean }>(`${this.API_BASE_URL}/team-members`, {
      userId: this.currentUserId,
      ...member
    }).pipe(
      tap(() => this.loadingSubject.next(false)),
      map(response => ({ success: response.success })),
      catchError(this.handleError)
    );
  }

  updateMember(id: string, member: Partial<TeamMember>): Observable<ApiResponse<TeamMember>> {
    this.loadingSubject.next(true);
    return this.http.put<{ success: boolean }>(`${this.API_BASE_URL}/team-members`, {
      id,
      ...member
    }).pipe(
      tap(() => this.loadingSubject.next(false)),
      map(response => ({ success: response.success })),
      catchError(this.handleError)
    );
  }

  deleteMember(id: string): Observable<ApiResponse<void>> {
    this.loadingSubject.next(true);
    return this.http.delete<{ success: boolean }>(`${this.API_BASE_URL}/team-members?id=${id}`)
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        map(response => ({ success: response.success })),
        catchError(this.handleError)
      );
  }

  // Assignment operations
  assignMemberToSquad(memberId: string, squadId: string): Observable<ApiResponse<void>> {
    this.loadingSubject.next(true);
    return this.http.put<{ success: boolean }>(`${this.API_BASE_URL}/team-members`, {
      id: memberId,
      squad_id: squadId
    }).pipe(
      tap(() => this.loadingSubject.next(false)),
      map(response => ({ success: response.success })),
      catchError(this.handleError)
    );
  }

  removeMemberFromSquad(memberId: string): Observable<ApiResponse<void>> {
    this.loadingSubject.next(true);
    return this.http.put<{ success: boolean }>(`${this.API_BASE_URL}/team-members`, {
      id: memberId,
      squad_id: null
    }).pipe(
      tap(() => this.loadingSubject.next(false)),
      map(response => ({ success: response.success })),
      catchError(this.handleError)
    );
  }

  // Error handling
  private handleError(error: HttpErrorResponse): Observable<never> {
    this.loadingSubject.next(false);
    
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || error.message || `Server returned code ${error.status}`;
    }
    
    console.error('API Error:', error);
    return throwError(() => new Error(errorMessage));
  }
} 