import { Routes } from '@angular/router';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page';
import { SettingsPageComponent } from './pages/settings-page/settings-page';
import { JiraSprintWorkspaceComponent } from './components/jira-sprint-workspace/jira-sprint-workspace';
import { MergeReviewerComponent } from './components/merge-reviewer/merge-reviewer';
import { SlackDeploymentTrackerComponent } from './pages/slack-deployment-tracker/slack-deployment-tracker';
import { SquadManagementPageComponent } from './pages/squad-management-page/squad-management-page';
import { LoginPageComponent } from './pages/login-page/login-page';
import { SplashScreenComponent } from './components/splash-screen/splash-screen';
import { SuperadminPanelComponent } from './pages/superadmin-panel/superadmin-panel';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/splash',
    pathMatch: 'full'
  },
  {
    path: 'splash',
    component: SplashScreenComponent
  },
  {
    path: 'login',
    component: LoginPageComponent
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
  },
  {
    path: 'squad-management',
    component: SquadManagementPageComponent
  },
  {
    path: 'superadmin',
    component: SuperadminPanelComponent
  }
];
