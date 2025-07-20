import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface ChatRequest {
  model: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
}

export interface ChatResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  estimate?: string;
  suggestedTitle?: string;
  commitMessage?: string;
  generatedSubtasks?: string[];
  dailySummary?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OpenAiService {
  private readonly http = inject(HttpClient);
  private readonly API_BASE = 'https://api.openai.com/v1';
  private readonly DEFAULT_MODEL = 'gpt-4';

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('openaiToken');
    if (!token) {
      throw new Error('OpenAI token not configured');
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private makeChatRequest(messages: ChatRequest['messages'], temperature: number = 0.7): Observable<string> {
    const request: ChatRequest = {
      model: this.DEFAULT_MODEL,
      messages,
      temperature
    };

    return this.http.post<ChatResponse>(`${this.API_BASE}/chat/completions`, request, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.choices[0]?.message?.content || 'No response received'),
      catchError(error => {
        console.error('OpenAI API error:', error);
        if (error.status === 401) {
          return throwError(() => new Error('Invalid OpenAI API token'));
        } else if (error.status === 429) {
          return throwError(() => new Error('Rate limit exceeded. Please try again later.'));
        } else if (error.status === 0) {
          return throwError(() => new Error('Network error. Please check your connection.'));
        } else {
          return throwError(() => new Error(`OpenAI API error: ${error.message || 'Unknown error'}`));
        }
      })
    );
  }

  /**
   * Test OpenAI token by fetching available models
   */
  testToken(): Observable<boolean> {
    return this.http.get(`${this.API_BASE}/models`, {
      headers: this.getHeaders()
    }).pipe(
      map(() => true),
      catchError(error => {
        console.error('Token test failed:', error);
        return throwError(() => new Error('Invalid API token'));
      })
    );
  }

  /**
   * Estimate time for a subtask
   */
  estimateSubtaskTime(title: string): Observable<string> {
    const messages = [
      { role: 'system' as const, content: 'You are a helpful assistant that estimates how long a developer task will take. Return the number of hours only.' },
      { role: 'user' as const, content: `Estimate time for: ${title}` }
    ];

    return this.makeChatRequest(messages, 0.3);
  }

  /**
   * Generate subtasks from a Jira story
   */
  generateSubtasksFromStory(story: string): Observable<string[]> {
    const messages = [
      { role: 'system' as const, content: 'You are an experienced software developer. Break down the given feature request into short frontend and backend subtasks (max 6 total). Return only the subtask titles, one per line, no numbering.' },
      { role: 'user' as const, content: `Story: ${story}` }
    ];

    return this.makeChatRequest(messages, 0.5).pipe(
      map(response => {
        return response
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .slice(0, 6); // Ensure max 6 subtasks
      })
    );
  }

  /**
   * Improve task title for clarity
   */
  improveTaskTitle(title: string): Observable<string> {
    const messages = [
      { role: 'system' as const, content: 'You improve task titles to be clearer, more actionable, and properly capitalized for developers.' },
      { role: 'user' as const, content: title }
    ];

    return this.makeChatRequest(messages, 0.4);
  }

  /**
   * Generate commit message from task title
   */
  generateCommitMessage(taskTitle: string): Observable<string> {
    const messages = [
      { role: 'system' as const, content: 'You generate clean Git commit messages from task titles. Use conventional commit format: type(scope): description' },
      { role: 'user' as const, content: taskTitle }
    ];

    return this.makeChatRequest(messages, 0.3);
  }

  /**
   * Summarize task board for daily standup
   */
  summarizeTaskBoard(tasks: Task[]): Observable<string> {
    const taskList = tasks.map(task => `${task.title} (${task.status})`).join(', ');
    
    const messages = [
      { role: 'system' as const, content: 'You summarize task progress for a standup meeting. Group by status: Done, In Progress, Blocked. Use short bullet points with emojis.' },
      { role: 'user' as const, content: `Tasks: [${taskList}]` }
    ];

    return this.makeChatRequest(messages, 0.5);
  }

  /**
   * Generate test cases from task description
   */
  generateTestCases(taskDescription: string): Observable<string[]> {
    const messages = [
      { role: 'system' as const, content: 'You are a QA engineer. Generate 3-5 test cases for the given task. Return only the test case descriptions, one per line, no numbering.' },
      { role: 'user' as const, content: `Task: ${taskDescription}` }
    ];

    return this.makeChatRequest(messages, 0.4).pipe(
      map(response => {
        return response
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .slice(0, 5); // Ensure max 5 test cases
      })
    );
  }

  /**
   * Generate code review checklist
   */
  generateCodeReviewChecklist(taskTitle: string): Observable<string[]> {
    const messages = [
      { role: 'system' as const, content: 'You are a senior developer. Generate a code review checklist for the given task. Return only the checklist items, one per line, no numbering.' },
      { role: 'user' as const, content: `Task: ${taskTitle}` }
    ];

    return this.makeChatRequest(messages, 0.4).pipe(
      map(response => {
        return response
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .slice(0, 8); // Ensure max 8 checklist items
      })
    );
  }

  /**
   * Generate translations from story description
   */
  generateTranslations(storyDescription: string): Observable<string> {
    const messages = [
      { 
        role: 'system' as const, 
        content: `You are a translation expert. Analyze the given story description and identify ONLY user-facing text that would be implemented in code using transloco translation library.

        Rules:
        1. Use EXACT English text as the JSON key (case-sensitive, with spaces)
        2. Only identify UI labels, buttons, form fields, error messages, success messages
        3. Skip technical descriptions, code examples, URLs, internal logic
        4. Generate Arabic translations for the identified text
        5. Keep response concise and fast
        
        Example format:
        {
          "Create Audit Visit": "إنشاء زيارة تدقيق",
          "Audit Location": "موقع التدقيق",
          "Lead Auditor": "مدير التدقيق",
          "Submit": "إرسال",
          "Cancel": "إلغاء"
        }`
      },
      { role: 'user' as const, content: `Story Description: ${storyDescription}` }
    ];

    return this.makeChatRequest(messages, 0.2); // Lower temperature for faster, more consistent results
  }

  /**
   * Generate corner case questions like a senior PO
   */
  generateCornerCaseQuestions(storyDescription: string): Observable<string[]> {
    const messages = [
      { 
        role: 'system' as const, 
        content: `You are a senior Product Owner with 10+ years of experience. Cross-examine the given story and ask critical corner case questions that could reveal potential issues, edge cases, or missing requirements.

        Focus on:
        1. **Data Validation**: What happens with invalid/empty data?
        2. **User Permissions**: Who can access what? What about unauthorized access?
        3. **Business Rules**: Are there exceptions to the main flow?
        4. **Integration Points**: What if external systems are down?
        5. **Performance**: What happens under high load?
        6. **Error Handling**: How are errors communicated to users?
        7. **Data Consistency**: What about concurrent updates?
        8. **Accessibility**: How does it work for users with disabilities?
        9. **Mobile/Responsive**: What about different screen sizes?
        10. **Internationalization**: What about different languages/regions?

        Ask specific, probing questions that would make a developer think twice.
        Return only the questions, one per line, no numbering.
        Keep questions concise but thorough.`
      },
      { role: 'user' as const, content: `Story: ${storyDescription}` }
    ];

    return this.makeChatRequest(messages, 0.4).pipe(
      map(response => {
        return response
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .slice(0, 8); // Ensure max 8 questions
      })
    );
  }

  /**
   * Generate response from custom prompt
   */
  generateFromPrompt(prompt: string): Observable<string> {
    const messages = [
      { role: 'user' as const, content: prompt }
    ];

    return this.makeChatRequest(messages, 0.4);
  }

  /**
   * Get token from localStorage
   */
  getToken(): string | null {
    return localStorage.getItem('openaiToken');
  }

  /**
   * Set token in localStorage
   */
  setToken(token: string): void {
    localStorage.setItem('openaiToken', token);
  }

  /**
   * Clear token from localStorage
   */
  clearToken(): void {
    localStorage.removeItem('openaiToken');
  }

  /**
   * Check if token is configured
   */
  isTokenConfigured(): boolean {
    return !!this.getToken();
  }
} 
 