import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  isLoading = signal<boolean>(false);

  private activeRequests = 0;
  private timeoutId: any;

  show() {
    this.activeRequests++;

    // Jeśli to pierwszy request, uruchamiamy timer na 200ms.
    // Jeśli request zakończy się przed tym czasem, spinner w ogóle nie "mignie".
    if (this.activeRequests === 1) {
      this.timeoutId = setTimeout(() => {
        this.isLoading.set(true);
      }, 200); // 200ms to rynkowy standard opóźnienia loadera
    }
  }

  hide() {
    this.activeRequests--;

    if (this.activeRequests <= 0) {
      this.activeRequests = 0;

      // Anulujemy timer (jeśli request był super szybki) i zdejmujemy flagę
      clearTimeout(this.timeoutId);
      this.isLoading.set(false);
    }
  }
}
