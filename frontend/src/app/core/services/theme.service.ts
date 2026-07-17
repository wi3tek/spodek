import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  // Sygnał trzymający stan motywu
  isWorldCupTheme = signal<boolean>(localStorage.getItem('theme_worldcup') === 'true');

  constructor() {
    // Automatyczna reakcja na zmianę sygnału (zmienia klasę w <body> i zapisuje w localStorage)
    effect(() => {
      const active = this.isWorldCupTheme();
      if (active) {
        document.body.classList.add('theme-worldcup');
      } else {
        document.body.classList.remove('theme-worldcup');
      }
      localStorage.setItem('theme_worldcup', String(active));
    });
  }

  toggleTheme() {
    this.isWorldCupTheme.update((active) => !active);
  }
}
