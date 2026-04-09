import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  // Sygnał, który mówi całej aplikacji: "Pokaż spinner!"
  isLoading = signal<boolean>(false);
  private activeRequests = 0;

  show() {
    this.activeRequests++;
    this.isLoading.set(true);
  }

  hide() {
    this.activeRequests--;
    if (this.activeRequests <= 0) {
      this.activeRequests = 0;
      this.isLoading.set(false);
    }
  }
}
