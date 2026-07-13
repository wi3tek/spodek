import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access_token');
  const router = inject(Router);

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
        localStorage.removeItem('access_token');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
