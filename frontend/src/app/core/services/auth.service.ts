import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthResponse {
  token: string;
  name: string;
  // expiresIn przestało być nam potrzebne, liczymy czas prosto z tokena
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private apiUrl = environment.apiUrl;

  public sessionTimeLeft = signal<number | null>(null);
  private timerRef: any;

  // 1. Zaktualizowana metoda: przyjmuje tylko token, sama oblicza resztę
  public handleAuthentication(token: string) {
    localStorage.setItem('access_token', token);

    const expiresInSeconds = this.calculateRemainingSecondsFromToken(token);

    if (expiresInSeconds > 0) {
      this.startSessionTimer(expiresInSeconds);
    } else {
      this.logout('Otrzymany token stracił ważność. Zaloguj się ponownie.');
    }
  }

  // NOWE: Bezpieczne parsowanie daty wygaśnięcia z payloadu JWT
  private calculateRemainingSecondsFromToken(token: string): number {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload)); // atob bezpiecznie dekoduje Base64

      // 'exp' w tokenie JWT to zawsze UNIX timestamp w sekundach
      const expirationDateSeconds = decoded.exp;
      const currentSeconds = Math.floor(Date.now() / 1000);

      return expirationDateSeconds - currentSeconds;
    } catch (e) {
      console.error('Błąd parsowania tokena JWT', e);
      return 0; // W przypadku uszkodzonego tokena wymuszamy wylogowanie
    }
  }

  public startSessionTimer(expiresInSeconds: number) {
    this.clearTimer();
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

    if (left === 0) {
      this.logout('Czas Twojej sesji minął. Ze względów bezpieczeństwa wylogowano automatycznie.');
    }
  }

  // 2. Właściwa implementacja strzału do backendu
  public refreshToken() {
    this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh`, {}).subscribe({
      next: (res) => {
        // Zależymy wyłącznie na pewnym tokenie
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
    localStorage.removeItem('access_token');

    if (message) {
      alert(message);
    }
    this.router.navigate(['/login']);
  }

  private clearTimer() {
    if (this.timerRef) clearInterval(this.timerRef);
  }

  public formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const formattedMinutes = m < 10 && h > 0 ? `0${m}` : m;
    const formattedSeconds = s < 10 ? `0${s}` : s;

    // Jeżeli zostało ponad godzinę, wyświetla "1:00:00", jeżeli mniej to np. "59:05"
    if (h > 0) {
      return `${h}:${formattedMinutes}:${formattedSeconds}`;
    }
    return `${formattedMinutes}:${formattedSeconds}`;
  }

  login(credentials: any) {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((response) => {
        if (response.token) {
          // Uproszczono wywołanie – handleAuthentication robi wszystko za nas
          this.handleAuthentication(response.token);
          this.router.navigate(['/dashboard']);
        }
      }),
    );
  }

  getToken() {
    return localStorage.getItem('access_token');
  }
}
