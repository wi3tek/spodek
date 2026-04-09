import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import {LoadingService} from '../services/loading.service';


export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Odpalamy ładowanie
  loadingService.show();

  return next(req).pipe(
    // Finalize wykona się ZAWSZE – przy sukcesie i przy błędzie
    finalize(() => loadingService.hide())
  );
};
