import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {LoadingSpinnerComponent} from './features/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,LoadingSpinnerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('spodek-ui');
}
