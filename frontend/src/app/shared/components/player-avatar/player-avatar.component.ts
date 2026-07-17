import { Component, input } from '@angular/core';

@Component({
  selector: 'app-player-avatar',
  standalone: true,
  template: `
    <div class="player-avatar-wrapper" [style.font-size]="fontSize()">
      @if (imageUrl()) {
        <img [src]="imageUrl()" alt="Avatar gracza" class="avatar-img" />
      } @else {
        <div class="avatar-placeholder">👤</div>
      }
      <strong class="player-alias">{{ alias() }}</strong>
    </div>
  `,
  styles: [
    `
      .player-avatar-wrapper {
        display: inline-flex;
        align-items: center;
        gap: 0.4em;
        /* Rozmiar czcionki będzie przekazywany z zewnątrz przez input() i sterował wielkością obrazka w 'em' */
      }

      .avatar-img {
        width: 1.8em;
        height: 1.8em;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
        border: 1px solid #e2e8f0;
      }

      .avatar-placeholder {
        width: 1.8em;
        height: 1.8em;
        border-radius: 50%;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2em; /* Zwiększamy nieco samą emotkę względem kółka */
        flex-shrink: 0;
        border: 1px solid #e2e8f0;
        color: #94a3b8;
      }

      .player-alias {
        font-size: 1em;
        margin: 0;
        padding: 0;
        color: var(--text-dark, #1e293b);
        word-break: break-word;
      }
    `,
  ],
})
export class PlayerAvatarComponent {
  // Wymagane dane wejściowe
  alias = input.required<string>();
  imageUrl = input<string | null | undefined>(null);

  // Opcjonalny rozmiar fontu (domyślnie 'inherit' dziedziczy z rodzica)
  fontSize = input<string>('inherit');
}
