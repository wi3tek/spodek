import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {LoadingService} from '../../core/services/loading.service';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loadingService.isLoading()) {
      <div class="spinner-overlay">
        <div class="beer-loader"></div>
      </div>
    }
  `,
  styles: [`
    .spinner-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(255, 255, 255, 0.7);
      display: flex; justify-content: center; align-items: center;
      z-index: 9999;
    }
    .beer-loader {
      width: 50px; height: 50px;
      border: 5px solid #f1f5f9;
      border-top: 5px solid #d4af37; /* Twój Beer Gold */
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  `]
})
export class LoadingSpinnerComponent {
  loadingService = inject(LoadingService);
}
