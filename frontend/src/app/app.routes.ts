import { Router, Routes } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './core/services/auth.service'; // Upewnij się co do ścieżki
import { LoginComponent } from './features/auth/login/login';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { LeagueFormComponent } from './features/leagues/league-form/league-form.component';
import { AdminComponent } from './features/admin/admin.component';
import { LeagueSeasonsComponent } from './features/league-seasons/league-seasons.component';
import { SeasonComponent } from './features/season/season.component';
import { NotFoundComponent } from './shared/not-found/not-found.component';

const authGuard = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (authService.isTokenValid()) {
    return true;
  }

  authService.logout(); // Zapewniamy całkowite wyczyszczenie śmieci i stanu
  return router.parseUrl('/login');
};

const guestGuard = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (authService.isTokenValid()) {
    return router.parseUrl('/dashboard');
  }

  // Usuń stary nieważny token, jeśli istnieje
  if (localStorage.getItem('access_token')) {
    localStorage.removeItem('access_token');
  }

  return true;
};

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },

  // ZMIANA: Pusta trasa domyślnie celuje w "serce" aplikacji
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  { path: 'dashboard/league/new', component: LeagueFormComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [authGuard] },
  { path: 'league', component: AdminComponent, canActivate: [authGuard] },
  { path: 'league/:id', component: LeagueSeasonsComponent, canActivate: [authGuard] },
  { path: 'season/:id', component: SeasonComponent, canActivate: [authGuard] },
  { path: 'live/:code', component: SeasonComponent },

  { path: '404', component: NotFoundComponent },
  { path: '**', component: NotFoundComponent },
];
