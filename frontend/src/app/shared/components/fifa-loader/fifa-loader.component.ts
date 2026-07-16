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
        border: 5px solid transparent;

        /* POPRAWKA: Dynamiczne kolory loadera dostosowane do motywu */
        border-top-color: var(--sash-red);
        border-right-color: rgba(42, 57, 141, 0.4); /* Półprzezroczysty Hermes */
        border-bottom-color: rgba(42, 57, 141, 0.1);

        border-radius: 50%;
        animation: xbox-spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
        box-shadow: 0 0 12px rgba(0, 0, 0, 0.15);
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
          transform: scale(0.9);
          opacity: 0.8;
        }
        100% {
          transform: scale(1.1);
          opacity: 1;
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
