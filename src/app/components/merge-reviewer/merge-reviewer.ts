import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../services/toast';
import { OpenAiService } from '../../services/openai';
import { GitLabService } from '../../services/gitlab';



interface ReviewResult {
  type: 'error' | 'warning' | 'suggestion';
  message: string;
  code?: string;
  line?: number;
  copyCommand?: string;
}

interface DiffChange {
  type: 'added' | 'removed' | 'modified';
  line: number;
  oldCode?: string;
  newCode?: string;
  context?: string;
}

interface GitLabMR {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  state: string;
  created_at: string;
  updated_at: string;
  target_branch: string;
  source_branch: string;
  web_url: string;
  commits_count: number;
  changes_count: number;
}

interface GitLabDiff {
  diff: string;
  new_path: string;
  old_path: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
}

// GitLab API Response interfaces
interface GitLabApprovalResponse {
  id: number;
  iid: number;
  state: string;
  merged_at?: string;
  merged_by?: {
    id: number;
    name: string;
    username: string;
  };
}

@Component({
  selector: 'app-merge-reviewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './merge-reviewer.html',
  styleUrls: ['./merge-reviewer.css']
})
export class MergeReviewerComponent {
  private readonly toastService = inject(ToastService);
  private readonly openAiService = inject(OpenAiService);
  private readonly http = inject(HttpClient);
  private readonly gitlabService = inject(GitLabService);

  inputContent = '';
  originalContent = '';
  gitlabUrl = '';
  isAnalyzing = false;
  isAiReviewing = false;
  isLoadingGitLab = false;
  isApproving = false;
  isMerging = false;
  showDiff = false;
  errors: ReviewResult[] = [];
  warnings: ReviewResult[] = [];
  suggestions: ReviewResult[] = [];
  aiReviewResults: ReviewResult[] = [];
  diffChanges: DiffChange[] = [];
  gitlabMR: GitLabMR | null = null;
  
  // Store real GitLab info for approval
  private realGitLabInfo: { projectId: string; mrIid: string } | null = null;
  
  // MR approval status
  mrApprovalStatus = {
    approvedByMe: false,
    totalApprovals: 0,
    requiredApprovals: 2,
    canMerge: false
  };

  get hasResults(): boolean {
    return this.errors.length > 0 || this.warnings.length > 0 || this.suggestions.length > 0 || this.aiReviewResults.length > 0;
  }

  get hasGitLabToken(): boolean {
    return !!this.gitlabService.getToken();
  }

  // GitLab API methods
  private extractGitLabInfo(url: string): { projectId: string; mrIid: string } | null {
    try {
      // Parse GitLab URL to extract project path and MR IID
      // Example: https://gitlab.com/whitehelmetxyz/WhiteHelmet-FrontEnd/-/merge_requests/2462
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part !== '');
      
      const mrIndex = pathParts.findIndex(part => part === 'merge_requests');
      if (mrIndex === -1) return null;

      // Extract project path (everything before merge_requests, excluding the '-' separator)
      const projectPathParts = pathParts.slice(0, mrIndex).filter(part => part !== '-');
      const projectPath = projectPathParts.join('/');
      const mrIid = pathParts[mrIndex + 1];
      
      if (!mrIid) return null;

      // For GitLab API, we need to URL encode the project path
      const encodedProjectPath = encodeURIComponent(projectPath);
      
      // Debug logging
      console.log('GitLab URL Parsing:', {
        originalUrl: url,
        projectPath,
        encodedProjectPath,
        mrIid,
        pathParts,
        projectPathParts
      });
      
      return {
        projectId: encodedProjectPath, // Use encoded project path as project ID
        mrIid: mrIid
      };
    } catch (error) {
      console.error('Error parsing GitLab URL:', error);
      return null;
    }
  }

  private async makeGitLabApiCall(endpoint: string, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: any): Promise<any> {
    const token = this.gitlabService.getToken();
    if (!token) {
      throw new Error('GitLab API token not configured');
    }

    const gitlabUrl = this.gitlabService.getGitLabUrl();
    const url = `${gitlabUrl}/api/v4${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const options = {
      headers,
      body: body ? JSON.stringify(body) : undefined
    };

    // Debug logging
    console.log('GitLab API Call:', {
      method,
      url,
      endpoint,
      hasToken: !!token,
      gitlabUrl
    });

    try {
      // Use firstValueFrom instead of toPromise() for better compatibility
      const response = await this.http.request(method, url, options).toPromise();
      console.log('GitLab API Response:', response);
      return response;
    } catch (error: any) {
      console.error('GitLab API Error:', {
        status: error.status,
        message: error.message,
        url,
        endpoint
      });
      
      if (error.status === 401) {
        throw new Error('Invalid GitLab API token');
      } else if (error.status === 403) {
        throw new Error('Insufficient permissions to perform this action');
      } else if (error.status === 404) {
        throw new Error(`Merge request not found. URL: ${url}`);
      } else {
        throw new Error(`GitLab API error: ${error.message || 'Unknown error'}`);
      }
    }
  }



  async analyzeContent(): Promise<void> {
    if (!this.inputContent.trim()) {
      this.toastService.warning('Please enter some content to analyze.');
      return;
    }

    this.isAnalyzing = true;
    this.clearResults();

    try {
      // Determine if input is a GitLab MR URL, GitHub URL, or file content
      if (this.isGitLabMRUrl(this.inputContent)) {
        await this.analyzeGitLabMR(this.inputContent);
      } else if (this.isGitHubUrl(this.inputContent)) {
        await this.analyzeGitHubUrl(this.inputContent);
      } else {
        this.analyzeFileContent(this.inputContent);
      }
    } catch (error) {
      this.toastService.error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isAnalyzing = false;
    }
  }

  private isGitLabMRUrl(url: string): boolean {
    return url.includes('gitlab.com') && url.includes('merge_requests');
  }

  async analyzeGitLabMR(url: string): Promise<void> {
    this.isLoadingGitLab = true;
    
    try {
      // Extract project ID and MR IID from URL
      const gitlabInfo = this.extractGitLabInfo(url);
      if (!gitlabInfo) {
        throw new Error('Invalid GitLab merge request URL');
      }

      // Store real GitLab info for approval
      this.realGitLabInfo = gitlabInfo;

      // Check if we have API token configured
      if (!this.gitlabService.getToken()) {
        this.toastService.warning('⚠️ GitLab API token required for real integration. Please configure it in Settings.');
        // Fall back to mock analysis
        await this.mockGitLabAnalysis(url);
        return;
      }

      // Try to fetch real MR data
      try {
        await this.fetchRealGitLabMR(gitlabInfo.projectId, gitlabInfo.mrIid);
      } catch (error) {
        this.toastService.warning('⚠️ Using mock data due to API error');
        await this.mockGitLabAnalysis(url);
      }
      
    } catch (error) {
      this.toastService.error(`GitLab analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isLoadingGitLab = false;
    }
  }

  private async fetchRealGitLabMR(projectId: string, mrIid: string): Promise<void> {
    // Fetch MR details
    const mrData = await this.makeGitLabApiCall(`/projects/${projectId}/merge_requests/${mrIid}`);
    
    // Fetch MR diff
    const diffData = await this.makeGitLabApiCall(`/projects/${projectId}/merge_requests/${mrIid}/changes`);
    
    this.gitlabMR = {
      id: mrData.id,
      iid: mrData.iid,
      project_id: mrData.project_id,
      title: mrData.title,
      description: mrData.description,
      state: mrData.state,
      created_at: mrData.created_at,
      updated_at: mrData.updated_at,
      target_branch: mrData.target_branch,
      source_branch: mrData.source_branch,
      web_url: mrData.web_url,
      commits_count: mrData.commits_count || 0,
      changes_count: diffData.changes?.length || 0
    };

    // Parse the diff
    if (diffData.changes && diffData.changes.length > 0) {
      const diffText = diffData.changes.map((change: any) => change.diff).join('\n');
      this.parseGitLabDiff(diffText);
    }

    this.toastService.success(`✅ Real GitLab MR loaded: ${this.gitlabMR.title}`);
  }

  private async mockGitLabAnalysis(url: string): Promise<void> {
    // Simulate fetching MR data
    this.gitlabMR = {
      id: 2462,
      iid: 2462,
      project_id: 123,
      title: 'Feature: Add new user management functionality',
      description: 'This MR adds comprehensive user management features including role-based access control.',
      state: 'opened',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      target_branch: 'main',
      source_branch: 'feature/user-management',
      web_url: url,
      commits_count: 1,
      changes_count: 6
    };

    // Simulate diff content
    const mockDiff = `--- a/src/app/components/user-management/user-list.component.ts
+++ b/src/app/components/user-management/user-list.component.ts
@@ -1,5 +1,6 @@
 import { Component } from '@angular/core';
+import { UserService } from '../../services/user.service';
 
 @Component({
   selector: 'app-user-list',
@@ -10,7 +11,12 @@ export class UserListComponent {
   users: User[] = [];
 
   constructor() {
-    console.log('User list component initialized');
+    this.loadUsers();
   }

   loadUsers(): void {
     this.userService.getUsers().subscribe(users => {
       this.users = users;
     });
   }
 }
 
--- a/src/app/services/user.service.ts
+++ b/src/app/services/user.service.ts
@@ -0,0 +1,25 @@
+import { Injectable } from '@angular/core';
+import { HttpClient } from '@angular/common/http';
+import { Observable } from 'rxjs';
+
+@Injectable({
+  providedIn: 'root'
+})
+export class UserService {
+  private apiUrl = '/api/users';
+
+  constructor(private http: HttpClient) {}
+
+  getUsers(): Observable<User[]> {
+    return this.http.get<User[]>(this.apiUrl);
+  }

+  createUser(user: User): Observable<User> {
+    return this.http.post<User>(this.apiUrl, user);
+  }
+}`;

    // Parse the diff and set content
    this.parseGitLabDiff(mockDiff);
    
    // Analyze the changes
    this.analyzeFileContent(this.inputContent);
    
    this.toastService.success('✅ GitLab MR analysis completed! Found 6 file changes');
  }

  private parseGitLabDiff(diff: string): void {
    const lines = diff.split('\n');
    let currentFile = '';
    let isInHunk = false;
    let lineNumber = 0;
    
    const originalLines: string[] = [];
    const modifiedLines: string[] = [];
    const fileChanges: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
        currentFile = line.substring(6); // Remove '--- a/' or '+++ b/'
        if (!fileChanges.includes(currentFile)) {
          fileChanges.push(currentFile);
        }
      } else if (line.startsWith('@@')) {
        isInHunk = true;
        // Parse line numbers from @@ -old_start,old_count +new_start,new_count @@
        const match = line.match(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
        if (match) {
          lineNumber = parseInt(match[3]); // new_start
        }
      } else if (isInHunk) {
        if (line.startsWith('+')) {
          modifiedLines.push(line.substring(1));
          originalLines.push('');
        } else if (line.startsWith('-')) {
          originalLines.push(line.substring(1));
          modifiedLines.push('');
        } else {
          originalLines.push(line);
          modifiedLines.push(line);
        }
      }
    }
    
    this.originalContent = originalLines.join('\n');
    this.inputContent = modifiedLines.join('\n');
    this.generateDiff();
    
    // Show file changes info
    if (fileChanges.length > 0) {
      this.toastService.info(`📁 Files changed: ${fileChanges.length} - ${fileChanges.join(', ')}`);
    }
  }

  private isGitHubUrl(content: string): boolean {
    return content.includes('github.com') && (content.includes('blob') || content.includes('raw'));
  }

  private async analyzeGitHubUrl(url: string): Promise<void> {
    // Convert GitHub URL to raw content URL
    const rawUrl = this.convertToRawUrl(url);
    
    try {
      const response = await fetch(rawUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
      }
      
      const content = await response.text();
      this.analyzeFileContent(content);
    } catch (error) {
      this.toastService.error(`Failed to fetch GitHub content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private convertToRawUrl(githubUrl: string): string {
    // Convert GitHub blob URL to raw URL
    return githubUrl
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');
  }

  private analyzeFileContent(content: string): void {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Check for console.log statements
      this.checkConsoleLog(line, lineNumber);
      
      // Check for translation issues
      this.checkTranslationIssues(line, lineNumber);
      
      // Check for code breaking issues
      this.checkCodeBreakingIssues(line, lineNumber);
      
      // Check for transloco pipe usage
      this.checkTranslocoPipeUsage(line, lineNumber);
    });

    // Generate summary suggestions
    this.generateSuggestions();
  }

  private checkConsoleLog(line: string, lineNumber: number): void {
    const consoleLogPatterns = [
      /console\.log\s*\(/,
      /console\.warn\s*\(/,
      /console\.error\s*\(/,
      /console\.debug\s*\(/,
      /console\.info\s*\(/
    ];

    consoleLogPatterns.forEach(pattern => {
      if (pattern.test(line)) {
        this.errors.push({
          type: 'error',
          message: 'Console statement found - should be removed before merge',
          code: line.trim(),
          line: lineNumber,
          copyCommand: `// Remove console statement at line ${lineNumber}`
        });
      }
    });
  }

  private checkTranslationIssues(line: string, lineNumber: number): void {
    // Check for hardcoded strings that should be translated
    const hardcodedStringPatterns = [
      /"[^"]*[a-zA-Z][^"]*"/, // Quoted strings with letters
      /'[^']*[a-zA-Z][^']*'/, // Single quoted strings with letters
      /`[^`]*[a-zA-Z][^`]*`/  // Template literals with letters
    ];

    // Skip lines that already use translation
    const translationPatterns = [
      /\.translate\s*\(/,
      /trans\s*\(/,
      /i18n\s*\(/,
      /transloco\s*\.\s*translate/,
      /'[^']*\.json'/, // Translation file references
      /"[^"]*\.json"/  // Translation file references
    ];

    const hasTranslation = translationPatterns.some(pattern => pattern.test(line));
    
    if (!hasTranslation) {
      hardcodedStringPatterns.forEach(pattern => {
        const matches = line.match(pattern);
        if (matches && matches[0].length > 3) { // Only flag strings longer than 3 chars
          this.warnings.push({
            type: 'warning',
            message: 'Hardcoded string found - consider using translation',
            code: line.trim(),
            line: lineNumber,
            copyCommand: `// Replace hardcoded string with translation at line ${lineNumber}`
          });
        }
      });
    }
  }

  private checkCodeBreakingIssues(line: string, lineNumber: number): void {
    // Check for potential code breaking issues
    const breakingPatterns = [
      {
        pattern: /import\s+.*\s+from\s+['"][^'"]*['"]\s*;?\s*$/,
        message: 'Unused import detected',
        type: 'warning' as const
      },
      {
        pattern: /export\s+.*\s+from\s+['"][^'"]*['"]\s*;?\s*$/,
        message: 'Unused export detected',
        type: 'warning' as const
      },
      {
        pattern: /TODO\s*:/i,
        message: 'TODO comment found - should be addressed before merge',
        type: 'warning' as const
      },
      {
        pattern: /FIXME\s*:/i,
        message: 'FIXME comment found - should be addressed before merge',
        type: 'error' as const
      },
      {
        pattern: /debugger\s*;?/,
        message: 'Debugger statement found - should be removed before merge',
        type: 'error' as const
      },
      {
        pattern: /\.catch\s*\(\s*\)/,
        message: 'Empty catch block detected',
        type: 'warning' as const
      }
    ];

    breakingPatterns.forEach(({ pattern, message, type }) => {
      if (pattern.test(line)) {
        const result: ReviewResult = {
          type,
          message,
          code: line.trim(),
          line: lineNumber,
          copyCommand: `// ${message} at line ${lineNumber}`
        };
        
        if (type === 'error') {
          this.errors.push(result);
        } else {
          this.warnings.push(result);
        }
      }
    });
  }

  private checkTranslocoPipeUsage(line: string, lineNumber: number): void {
    // Check for proper transloco pipe usage
    const translocoPipePattern = /\|\s*transloco/;
    const stringPattern = /['"`][^'"`]*[a-zA-Z][^'"`]*['"`]/;
    
    if (stringPattern.test(line) && !translocoPipePattern.test(line)) {
      // Check if this looks like a display string that should use transloco
      const stringMatch = line.match(stringPattern);
      if (stringMatch && stringMatch[0].length > 5) {
        this.suggestions.push({
          type: 'suggestion',
          message: 'Consider using transloco pipe for better translation support',
          code: line.trim(),
          line: lineNumber,
          copyCommand: `// Add transloco pipe: {{ 'your.key' | transloco }}`
        });
      }
    }
  }

  private generateSuggestions(): void {
    // Generate general suggestions based on analysis
    if (this.errors.length > 0) {
      this.suggestions.push({
        type: 'suggestion',
        message: 'Fix all errors before merging to ensure code quality',
        copyCommand: '// Review and fix all errors before merge'
      });
    }

    if (this.warnings.length > 5) {
      this.suggestions.push({
        type: 'suggestion',
        message: 'Consider addressing warnings to improve code quality',
        copyCommand: '// Review and address warnings for better code quality'
      });
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.suggestions.push({
        type: 'suggestion',
        message: 'Great! No major issues found. Ready for merge.',
        copyCommand: '// Code review passed - ready for merge'
      });
    }
  }

  async performAiReview(): Promise<void> {
    if (!this.inputContent.trim()) {
      this.toastService.warning('Please enter some content to review.');
      return;
    }

    if (!this.openAiService.isTokenConfigured()) {
      this.toastService.warning('⚠️ OpenAI token not configured. AI review will be skipped.');
      return;
    }

    this.isAiReviewing = true;
    this.aiReviewResults = [];

    try {
      const aiReview = await this.openAiService.generateFromPrompt(
        `You are a senior software developer performing a code review. Analyze the following code for:

1. **Code Quality Issues**: 
   - Code style and consistency
   - Performance problems
   - Security vulnerabilities
   - Best practices violations

2. **Translation Issues**:
   - Hardcoded strings that should use transloco
   - Missing translation keys
   - Inconsistent translation usage

3. **Console Log Issues**:
   - Any console.log, console.warn, console.error statements
   - Debug statements that should be removed

4. **Code Breaking Issues**:
   - Potential runtime errors
   - Type safety issues
   - Import/export problems
   - Unused variables or imports

5. **Suggestions for Improvement**:
   - Code optimization opportunities
   - Better patterns or approaches
   - Documentation improvements

Format your response as a structured review with clear sections. Be specific and actionable.

Code to review:
${this.inputContent}`
      ).toPromise();

      if (aiReview) {
        // Parse AI response and create review results
        this.parseAiReviewResponse(aiReview);
        this.toastService.success('✅ AI review completed!');
      }
    } catch (error) {
      this.toastService.error(`❌ AI review failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isAiReviewing = false;
    }
  }

  private parseAiReviewResponse(aiResponse: string): void {
    // Split response into sections and create review results
    const sections = aiResponse.split(/\n(?=#|\*\*)/);
    
    sections.forEach(section => {
      if (section.trim()) {
        const lines = section.split('\n');
        const title = lines[0].replace(/^[#\*\s]+/, '').trim();
        const content = lines.slice(1).join('\n').trim();
        
        if (content) {
          this.aiReviewResults.push({
            type: 'suggestion',
            message: title,
            code: content,
            copyCommand: `// AI Review: ${title}\n${content}`
          });
        }
      }
    });
  }

  setOriginalContent(content: string): void {
    this.originalContent = content;
    this.generateDiff();
  }

  private generateDiff(): void {
    if (!this.originalContent || !this.inputContent) {
      this.diffChanges = [];
      return;
    }

    const originalLines = this.originalContent.split('\n');
    const currentLines = this.inputContent.split('\n');
    this.diffChanges = [];

    // Simple diff algorithm
    for (let i = 0; i < Math.max(originalLines.length, currentLines.length); i++) {
      const originalLine = originalLines[i] || '';
      const currentLine = currentLines[i] || '';

      if (originalLine !== currentLine) {
        if (i >= originalLines.length) {
          // New line added
          this.diffChanges.push({
            type: 'added',
            line: i + 1,
            newCode: currentLine,
            context: this.getContext(currentLines, i)
          });
        } else if (i >= currentLines.length) {
          // Line removed
          this.diffChanges.push({
            type: 'removed',
            line: i + 1,
            oldCode: originalLine,
            context: this.getContext(originalLines, i)
          });
        } else {
          // Line modified
          this.diffChanges.push({
            type: 'modified',
            line: i + 1,
            oldCode: originalLine,
            newCode: currentLine,
            context: this.getContext(currentLines, i)
          });
        }
      }
    }
  }

  private getContext(lines: string[], index: number): string {
    const start = Math.max(0, index - 2);
    const end = Math.min(lines.length, index + 3);
    return lines.slice(start, end).join('\n');
  }

  toggleDiff(): void {
    this.showDiff = !this.showDiff;
    if (this.showDiff) {
      this.generateDiff();
    }
  }

  clearResults(): void {
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];
    this.aiReviewResults = [];
    this.diffChanges = [];
    this.showDiff = false;
    this.gitlabMR = null;
    this.gitlabUrl = '';
    this.realGitLabInfo = null;
    this.mrApprovalStatus = {
      approvedByMe: false,
      totalApprovals: 0,
      requiredApprovals: 2,
      canMerge: false
    };
  }

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toastService.success('✅ Copied to clipboard!');
    } catch (error) {
      this.toastService.error('❌ Failed to copy to clipboard');
    }
  }

  async approveMergeRequest(): Promise<void> {
    if (!this.gitlabMR) {
      this.toastService.error('❌ No merge request loaded to approve');
      return;
    }

    // Check if GitLab API token is configured
    if (!this.gitlabService.getToken()) {
      this.toastService.error('❌ GitLab API token not configured. Please configure it in Settings.');
      return;
    }

    this.isApproving = true;

    try {
      // Check if there are any errors that should prevent approval
      if (this.errors.length > 0) {
        const hasCriticalErrors = this.errors.some(error => 
          error.message.includes('console') || 
          error.message.includes('breaking') ||
          error.message.includes('error')
        );
        
        if (hasCriticalErrors) {
          this.toastService.warning('⚠️ Critical errors found. Please fix them before approving.');
          return;
        }
      }

      this.toastService.info('⏳ Approving merge request...');

      // Use stored real GitLab info for approval
      if (!this.realGitLabInfo) {
        throw new Error('No GitLab info available for approval');
      }

      // Approve the MR
      const approveResponse = await this.makeGitLabApiCall(
        `/projects/${this.realGitLabInfo.projectId}/merge_requests/${this.realGitLabInfo.mrIid}/approve`,
        'POST'
      );

      // Update approval status
      this.mrApprovalStatus.approvedByMe = true;
      this.mrApprovalStatus.totalApprovals = (approveResponse.approved_by?.length || 0) + 1;
      this.mrApprovalStatus.canMerge = this.mrApprovalStatus.totalApprovals >= this.mrApprovalStatus.requiredApprovals;

      this.toastService.success(`✅ Merge request approved successfully! (${this.mrApprovalStatus.totalApprovals}/${this.mrApprovalStatus.requiredApprovals} approvals)`);
      
      // Show approval summary
      const summary = this.generateApprovalSummary();
      this.toastService.info(`📊 Approval Summary: ${summary}`);
      
    } catch (error) {
      this.toastService.error(`❌ Failed to approve merge request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Provide specific error guidance
      if (error instanceof Error) {
        if (error.message.includes('Invalid GitLab API token')) {
          this.toastService.error('Please check your GitLab API token configuration');
        } else if (error.message.includes('Insufficient permissions')) {
          this.toastService.error('Your GitLab token does not have permission to approve this MR');
        } else if (error.message.includes('Merge request not found')) {
          this.toastService.error('The merge request was not found or has been deleted');
        }
      }
    } finally {
      this.isApproving = false;
    }
  }

  async mergeMergeRequest(): Promise<void> {
    if (!this.gitlabMR) {
      this.toastService.error('❌ No merge request loaded to merge');
      return;
    }

    // Check if GitLab API token is configured
    if (!this.gitlabService.getToken()) {
      this.toastService.error('❌ GitLab API token not configured. Please configure it in Settings.');
      return;
    }

    // Check if we have enough approvals
    if (!this.mrApprovalStatus.canMerge) {
      this.toastService.error(`❌ Not enough approvals. Need ${this.mrApprovalStatus.requiredApprovals} approvals, but only have ${this.mrApprovalStatus.totalApprovals}.`);
      return;
    }

    this.isMerging = true;

    try {
      this.toastService.info('⏳ Merging the approved merge request...');

      // Use stored real GitLab info for merging
      if (!this.realGitLabInfo) {
        throw new Error('No GitLab info available for merging');
      }

      const mergeData = {
        merge_commit_message: `Merge request merged via DevFlow AI Review\n\nReview Summary:\n${this.generateApprovalSummary()}`,
        squash_commit_message: `Squashed merge: ${this.gitlabMR.title}`,
        should_remove_source_branch: true,
        merge_when_pipeline_succeeds: false
      };

      const mergeResponse = await this.makeGitLabApiCall(
        `/projects/${this.realGitLabInfo.projectId}/merge_requests/${this.realGitLabInfo.mrIid}/merge`,
        'PUT',
        mergeData
      ) as GitLabApprovalResponse;

      // Update MR state based on real API response
      if (this.gitlabMR) {
        this.gitlabMR.state = mergeResponse.state;
        this.gitlabMR = { ...this.gitlabMR };
      }

      this.toastService.success('✅ Merge request merged successfully via GitLab API!');
      
      // Show additional info if available
      if (mergeResponse.merged_at) {
        this.toastService.info(`🕒 Merged at: ${new Date(mergeResponse.merged_at).toLocaleString()}`);
      }
      if (mergeResponse.merged_by) {
        this.toastService.info(`👤 Merged by: ${mergeResponse.merged_by.name} (@${mergeResponse.merged_by.username})`);
      }
      
    } catch (error) {
      this.toastService.error(`❌ Failed to merge merge request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Provide specific error guidance
      if (error instanceof Error) {
        if (error.message.includes('Invalid GitLab API token')) {
          this.toastService.error('Please check your GitLab API token configuration');
        } else if (error.message.includes('Insufficient permissions')) {
          this.toastService.error('Your GitLab token does not have permission to merge this MR');
        } else if (error.message.includes('Merge request not found')) {
          this.toastService.error('The merge request was not found or has been deleted');
        }
      }
    } finally {
      this.isMerging = false;
    }
  }

  private generateApprovalSummary(): string {
    const totalIssues = this.errors.length + this.warnings.length + this.suggestions.length;
    const aiSuggestions = this.aiReviewResults.length;
    
    return `${totalIssues} issues reviewed, ${aiSuggestions} AI suggestions, ${this.diffChanges.length} changes approved`;
  }
} 