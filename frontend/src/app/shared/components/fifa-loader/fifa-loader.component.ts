import { Component } from '@angular/core';

@Component({
  selector: 'app-fifa-loader',
  standalone: true,
  template: `
    <div class="fifa-loader-container">
      <div class="fifa-loader">
        <div class="xbox-ring"></div>
        <img src="/logo.png" alt="Ładowanie..." class="loader-logo" width="45" height="45" />
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        width: 100%;
        flex: 1;
        justify-content: center;
      }

      .fifa-loader-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 100px;
        animation: fadeIn 0.2s ease-in;
      }

      .fifa-loader {
        position: relative;
        width: 65px;
        height: 65px;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .xbox-ring {
        position: absolute;
        width: 100%;
        height: 100%;
        /* Pogrubiony pierścień (5px) */
        border: 5px solid transparent;

        /* Główny kolor logo */
        border-top-color: #33291f;
        /* Średni odcień dla efektu smugi (30% krycia) */
        border-right-color: rgba(51, 41, 31, 0.3);
        /* Bardzo jasny odcień zamykający smugę (10% krycia) */
        border-bottom-color: rgba(51, 41, 31, 0.1);

        border-radius: 50%;
        animation: xbox-spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;

        /* Cień również dopasowany do nowego koloru */
        box-shadow: 0 0 12px rgba(51, 41, 31, 0.25);
      }

      .loader-logo {
        width: 45px;
        height: 45px;
        object-fit: contain;
        animation: logo-pulse 1.5s ease-in-out infinite alternate;
      }

      @keyframes xbox-spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      @keyframes logo-pulse {
        0% {
          transform: scale(0.95);
        }
        100% {
          transform: scale(1.05);
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ],
})
export class FifaLoaderComponent {}
