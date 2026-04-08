import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login'; // dopasuj ścieżkę do swojego pliku login.ts

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // przekieruj pusty adres na logowanie
  { path: '**', redirectTo: '/login' } // każdą nieznaną stronę przekieruj na logowanie
];
