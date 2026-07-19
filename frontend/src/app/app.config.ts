import { ApplicationConfig, provideZoneChangeDetection, isDevMode, LOCALE_ID } from '@angular/core';
import {provideRouter} from '@angular/router';
import {provideHttpClient, withInterceptors} from '@angular/common/http';

import {routes} from './app.routes';
import {authInterceptor} from './core/interceptors/auth.interceptor';
import {loadingInterceptor} from './core/interceptors/loading.interceptor';
import { provideServiceWorker } from '@angular/service-worker';
import { registerLocaleData } from '@angular/common'; // Import Twojego nowego interceptora
import localePl from '@angular/common/locales/pl';

registerLocaleData(localePl);


export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'pl' },
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        authInterceptor,    // Ten dokłada token do nagłówka
        loadingInterceptor  // Ten odpala i gasi kółko ładowania
      ])
    ), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })
  ]
};
