import { Routes } from '@angular/router';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page';
import { SettingsPageComponent } from './pages/settings-page/settings-page';
import { JiraSprintWorkspaceComponent } from './components/jira-sprint-workspace/jira-sprint-workspace';
import { MergeReviewerComponent } from './components/merge-reviewer/merge-reviewer';
import { SlackDeploymentTrackerComponent } from './pages/slack-deployment-tracker/slack-deployment-tracker';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: DashboardPageComponent
  },
  {
    path: 'sprint-workspace',
    component: JiraSprintWorkspaceComponent
  },
  {
    path: 'deployment-tracker',
    component: SlackDeploymentTrackerComponent
  },
  {
    path: 'settings',
    component: SettingsPageComponent
  },
  {
    path: 'merge-reviewer',
    component: MergeReviewerComponent
  }
];
