import { Injectable, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LiveService {
  private http = inject(HttpClient);
  private zone = inject(NgZone); // Wymagane, by Angular odświeżał widok po odebraniu zdarzenia!

  // Stary fallback, gdybyś potrzebował jednorazowego pobrania
  getLiveResults(seasonCode: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/public/live/${seasonCode}`);
  }

  // NOWOŚĆ: Strumieniowanie SSE
  streamLiveResults(seasonCode: string): Observable<any> {
    return new Observable((observer) => {
      // Otwieramy kanał do nowego endpointu na backendzie
      const eventSource = new EventSource(`${environment.apiUrl}/public/live/stream/${seasonCode}`);

      eventSource.addEventListener('INIT', (event: any) => {
        console.log('📡 Połączono ze strumieniem Kanapa Live!');
      });

      // Kiedy backend wyrzuci nowy Cache, my go odbieramy
      eventSource.addEventListener('UPDATE', (event: any) => {
        this.zone.run(() => {
          observer.next(JSON.parse(event.data));
        });
      });

      // Utrzymanie serwerów w chmurze przy życiu
      eventSource.addEventListener('PING', (event: any) => {
        console.log('💓 Heartbeat odebrany');
      });

      // EventSource automatycznie wznawia połączenie w tle (magia przeglądarek!)
      eventSource.onerror = (error) => {
        this.zone.run(() => {
          console.warn('⚠️ Utracono połączenie. Przeglądarka ponawia próbę w tle...', error);
        });
      };

      // Gdy zamkniemy okno lub zmienimy komponent, zamykamy rurę
      return () => {
        eventSource.close();
        console.log('🔌 Strumień Live został zamknięty.');
      };
    });
  }
}
