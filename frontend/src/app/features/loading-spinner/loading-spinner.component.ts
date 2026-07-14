import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../core/services/loading.service';
import { FifaLoaderComponent } from '../../shared/components/fifa-loader/fifa-loader.component';
// Upewnij się, że ścieżka poniżej jest poprawna dla Twojej struktury folderów!

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule, FifaLoaderComponent], // Dodajemy nasz nowy komponent
  template: `
    @if (loadingService.isLoading()) {
      <div class="spinner-overlay">
        <app-fifa-loader></app-fifa-loader>
      </div>
    }
  `,
  styles: [
    `
      .spinner-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(3px); /* Dodałem lekkie rozmycie tła dla efektu premium! */
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }
    `,
  ],
})
export class LoadingSpinnerComponent {
  loadingService = inject(LoadingService);
}
