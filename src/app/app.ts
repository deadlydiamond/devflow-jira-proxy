import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShellLayoutComponent } from './shell-layout/shell-layout';
import { CommandPaletteComponent } from './components/command-palette/command-palette';
import { ToastComponent } from './components/toast/toast';
import { InfiniteProgressComponent } from './components/infinite-progress/infinite-progress';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ShellLayoutComponent, CommandPaletteComponent, ToastComponent, InfiniteProgressComponent],
  template: `
    <app-infinite-progress />
    <app-shell-layout>
      <router-outlet />
    </app-shell-layout>
    <app-command-palette />
    <app-toast />
  `
})
export class App {
  title = 'devflow';
}
