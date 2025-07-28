import { Component } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { ShellLayoutComponent } from './shell-layout/shell-layout';
import { CommandPaletteComponent } from './components/command-palette/command-palette';
import { ToastComponent } from './components/toast/toast';
import { InfiniteProgressComponent } from './components/infinite-progress/infinite-progress';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ShellLayoutComponent, CommandPaletteComponent, ToastComponent, InfiniteProgressComponent, CommonModule],
  template: `
    <app-infinite-progress />
    <ng-container *ngIf="shouldShowLayout(); else standaloneContent">
      <app-shell-layout>
        <router-outlet />
      </app-shell-layout>
    </ng-container>
    <ng-template #standaloneContent>
      <router-outlet />
    </ng-template>
    <app-command-palette />
    <app-toast />
  `
})
export class App {
  title = 'devflow';

  constructor(private router: Router, private authService: AuthService) {}

  shouldShowLayout(): boolean {
    const currentPath = this.router.url;
    // Don't show layout for login, splash, and other standalone pages
    const standaloneRoutes = ['/login', '/splash'];
    return !standaloneRoutes.includes(currentPath);
  }
}
