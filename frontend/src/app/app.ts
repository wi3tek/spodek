import { Component, signal, effect, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingSpinnerComponent } from './features/loading-spinner/loading-spinner.component';
import { CommonModule } from '@angular/common';
import {SwUpdate, VersionReadyEvent} from '@angular/service-worker';
import {filter} from 'rxjs';

interface AppUpdateData {
  version?: string;
  changelog?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoadingSpinnerComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
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
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
        )
        // Zwróć uwagę na dodane (evt) poniżej
        .subscribe((evt) => {

          // Pobieramy dane zdefiniowane w ngsw-config.json
          // Musimy rzutować typ ("as AppUpdateData"), ponieważ domyślnie Angular widzi to jako typ "object"
          const appData = evt.latestVersion.appData as AppUpdateData | undefined;

          // Wyciągamy wersję, a jeśli z jakiegoś powodu jej brak, używamy domyślnego tekstu
          const versionNumber = appData?.version ? ` (wersja ${appData.version})` : '';

          if (confirm(`Dostępna jest nowa wersja aplikacji${versionNumber}. Czy chcesz zaktualizować teraz?`)) {
            window.location.reload();
          }
        });
    }
  }
}
