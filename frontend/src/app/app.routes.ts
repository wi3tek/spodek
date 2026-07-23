import { Router, Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { LeagueFormComponent } from './features/leagues/league-form/league-form.component';
import { inject } from '@angular/core';
import { AdminComponent } from './features/admin/admin.component';
import { LeagueSeasonsComponent } from './features/league-seasons/league-seasons.component';
import { SeasonComponent } from './features/season/season.component';
import { NotFoundComponent } from './shared/not-found/not-found.component';

// Guard pilnujący dostępu do prywatnych stref (Wymaga tokena)
const authGuard = () => {
  const router = inject(Router);
  if (localStorage.getItem('access_token')) {
    return true;
  }
  // Używamy parseUrl, co jest nowszą, szybszą metodą na przekierowania wewnątrz guardów
  return router.parseUrl('/login');
};

// NOWY: Guard pilnujący ekranu logowania (Odrzuca zalogowanych)
const guestGuard = () => {
  const router = inject(Router);
  if (localStorage.getItem('access_token')) {
    return router.parseUrl('/dashboard'); // Zalogowany? Lecisz na dashboard
  }
  return true; // Niezalogowany? Wchodzisz na logowanie
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
