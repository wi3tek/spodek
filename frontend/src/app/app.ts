import {Component, signal, effect, inject} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingSpinnerComponent } from './features/loading-spinner/loading-spinner.component';
import { CommonModule } from '@angular/common';
import {SwUpdate, VersionReadyEvent} from '@angular/service-worker';
import {filter} from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoadingSpinnerComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('spodek-ui');
  private swUpdate = inject(SwUpdate);
  // ODCZYT: Sprawdzamy czy w localStorage zapisano włączony motyw
  isWorldCupTheme = signal<boolean>(localStorage.getItem('theme_worldcup') === 'true');

  constructor() {
    // Reagujemy na każdą zmianę sygnału (zaskoczy też przy pierwszym załadowaniu)
    effect(() => {
      const active = this.isWorldCupTheme();

      if (active) {
        document.body.classList.add('theme-worldcup');
      } else {
        document.body.classList.remove('theme-worldcup');
      }

      // ZAPIS: Aktualizujemy localStorage po każdym kliknięciu
      localStorage.setItem('theme_worldcup', String(active));
    });
  }

  // Funkcja wywoływana kliknięciem przycisku (zmienia stan na odwrotny)
  toggleTheme() {
    this.isWorldCupTheme.update((active) => !active);
  }

  ngOnInit() {
    // Upewniamy się, że Service Worker jest włączony (np. działa tylko na produkcji)
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          // Filtrujemy zdarzenia, interesuje nas tylko moment, gdy nowa wersja jest gotowa
          filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
        )
        .subscribe(() => {
          // Opcja 1: Automatyczne (agresywne) odświeżenie bez pytania
          // window.location.reload();

          // Opcja 2: (Zalecana) Pytamy użytkownika, czy chce zaktualizować
          if (confirm('Dostępna jest nowa wersja aplikacji. Czy chcesz zaktualizować teraz?')) {
            window.location.reload();
          }
        });
    }
  }
}
