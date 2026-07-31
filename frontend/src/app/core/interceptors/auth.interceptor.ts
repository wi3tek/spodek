import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const isAuthRequest = req.url.includes('/auth/login');

  let clonedReq = req;

  if (token && !isAuthRequest) {
    clonedReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Łapiemy zarówno brak autoryzacji jak i brak dostępu (np. zmieniona rola)
      if (error.status === 401 || error.status === 403) {
        authService.logout('Brak uprawnień lub sesja wygasła. Zaloguj się ponownie.');
      }
      return throwError(() => error);
    }),
  );
};
