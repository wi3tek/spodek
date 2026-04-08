import {Router, Routes} from '@angular/router';
import {LoginComponent} from './features/auth/login/login';
import {DashboardComponent} from './features/dashboard/dashboard.component';
import {LeagueFormComponent} from './features/leagues/league-form/league-form.component';
import {inject} from '@angular/core';
import {AdminComponent} from './features/admin/admin.component';
import {LeagueSeasonsComponent} from './features/league-seasons/league-seasons.component';

const authGuard = () => {
  const router = inject(Router);
  if (localStorage.getItem('access_token')) {
    return true; // Jest token, wchodzisz
  }
  return router.navigate(['/login']); // Nie ma tokena, wracaj do logowania
};

export const routes: Routes = [
  {path: 'login', component: LoginComponent},
  {path: 'dashboard', component: DashboardComponent, canActivate: [authGuard]}, // NOWA TRASA
  {path: '', redirectTo: '/login', pathMatch: 'full'},
  {path: 'dashboard/league/new', component: LeagueFormComponent, canActivate: [authGuard]},
  {path: 'admin', component: AdminComponent, canActivate: [authGuard]},
  {path: 'league', component: AdminComponent, canActivate: [authGuard]},
  {path: 'league/:id', component: LeagueSeasonsComponent, canActivate: [authGuard]
  },
  {path: '**', redirectTo: '/login'}
];
