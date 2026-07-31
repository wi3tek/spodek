import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthResponse {
  token: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  public sessionTimeLeft = signal<number | null>(null);
  public showSessionWarning = signal<boolean>(false);
  private timerRef: any;

  timeleft = 60 * 5;

  constructor() {
    this.checkSessionOnStart();
  }

  // Weryfikacja przy starcie aplikacji (każdego komponentu wstrzykującego ten serwis)
  private checkSessionOnStart() {
    const token = this.getToken();
    if (token) {
      const expiresInSeconds = this.calculateRemainingSecondsFromToken(token);
      if (expiresInSeconds > 0) {
        this.startSessionTimer(expiresInSeconds);
      } else {
        this.logout('Sesja wygasła pod Twoją nieobecność. Zaloguj się ponownie.');
      }
    }
  }

  public handleAuthentication(token: string) {
    localStorage.setItem('access_token', token);
    const expiresInSeconds = this.calculateRemainingSecondsFromToken(token);

    if (expiresInSeconds > 0) {
      this.startSessionTimer(expiresInSeconds);
    } else {
      this.logout('Otrzymany token stracił ważność. Zaloguj się ponownie.');
    }
  }

  private calculateRemainingSecondsFromToken(token: string): number {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      const expirationDateSeconds = decoded.exp;
      const currentSeconds = Math.floor(Date.now() / 1000);
      return expirationDateSeconds - currentSeconds;
    } catch (e) {
      console.error('Błąd parsowania tokena JWT', e);
      return 0;
    }
  }

  public startSessionTimer(expiresInSeconds: number) {
    this.clearTimer();
    this.showSessionWarning.set(false); // Resetujemy flagę doliczonego czasu
    const expiresAtMs = Date.now() + expiresInSeconds * 1000;
    this.updateTimeLeft(expiresAtMs);

    this.timerRef = setInterval(() => {
      this.updateTimeLeft(expiresAtMs);
    }, 1000);
  }

  private updateTimeLeft(expiresAtMs: number) {
    const now = Date.now();
    const left = Math.max(0, Math.floor((expiresAtMs - now) / 1000));
    this.sessionTimeLeft.set(left);

    // Flaga doliczonego czasu, gdy zostaje <= 5 minut (300 sekund)
    this.showSessionWarning.set(left > 0 && left <= this.timeleft);

    if (left === 0) {
      this.logout('Czas sesji dobiegł końca. Wylogowano ze względów bezpieczeństwa.');
    }
  }

  public refreshToken() {
    this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh`, {}).subscribe({
      next: (res) => {
        this.handleAuthentication(res.token);
      },
      error: () => {
        this.logout('Nie udało się odświeżyć sesji. Zaloguj się ponownie.');
      },
    });
  }

  public logout(message?: string) {
    this.clearTimer();
    this.sessionTimeLeft.set(null);
    this.showSessionWarning.set(false);
    localStorage.removeItem('access_token');

    if (message) {
      alert(message);
    }
    this.router.navigate(['/login']);
  }

  private clearTimer() {
    if (this.timerRef) clearInterval(this.timerRef);
  }

  // Uproszczony formater - odliczamy maksymalnie od 05:00
  public formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  }

  login(credentials: any) {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((response) => {
        if (response.token) {
          this.handleAuthentication(response.token);
          this.router.navigate(['/dashboard']);
        }
      }),
    );
  }

  getToken() {
    return localStorage.getItem('access_token');
  }

  // Wygodna metoda na potrzeby Guardów
  isTokenValid(): boolean {
    const token = this.getToken();
    return token ? this.calculateRemainingSecondsFromToken(token) > 0 : false;
  }
}
