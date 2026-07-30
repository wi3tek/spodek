import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../core/services/loading.service';
import { SpodaLoaderComponent } from '../../shared/components/spoda-loader/spoda-loader.component';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule, SpodaLoaderComponent],
  template: `
    @if (loadingService.isLoading()) {
      <div class="spinner-overlay">
        <spoda-loader></spoda-loader>
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
        backdrop-filter: blur(3px);
        display: flex;
        justify-content: center;
        align-items: center;
        /* ZMIANA: Mniej niż z-index headera (który ma 1000) */
        z-index: 990;
      }
    `,
  ],
})
export class LoadingSpinnerComponent {
  loadingService = inject(LoadingService);
}
