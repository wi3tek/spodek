import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service'; // Upewnij się co do ścieżki

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Wstrzykujemy AuthService, żeby mieć dostęp do zintegrowanego wylogowania
  const authService = inject(AuthService);
  const token = authService.getToken(); // Pobieramy token bezpośrednio przez metodę z serwisu

  let clonedReq = req;

  // SPRAWDZAMY: Czy to jest zapytanie do endpointu logowania?
  const isAuthRequest = req.url.includes('/auth/login');

  // Doklejamy token TYLKO jeśli go mamy ORAZ to nie jest logowanie
  if (token && !isAuthRequest) {
    clonedReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Zamiast ręcznego usuwania tokena, wywołujemy pełne wylogowanie z serwisu.
        // Dzięki temu timer zostaje poprawnie "zabity", a sygnały wyzerowane.
        authService.logout('Sesja wygasła. Zaloguj się ponownie.');
      }
      return throwError(() => error);
    }),
  );
};
