import { Injectable, signal } from '@angular/core';

export interface HeaderState {
  title: string;
  backLink?: any[] | string | null;
  backText?: string;
  isReadOnly: boolean;
  logoUrl?: string | null;
  isVisible: boolean; // <--- NOWE
}

@Injectable({
  providedIn: 'root',
})
export class HeaderService {
  private readonly defaultState: HeaderState = {
    title: 'ŚPODA•FC',
    backLink: null,
    backText: undefined,
    logoUrl: '/logo.png',
    isReadOnly: false,
    isVisible: true, // <--- DOMYŚLNIE WŁĄCZONY
  };

  readonly state = signal<HeaderState>(this.defaultState);

  setState(newState: Partial<HeaderState>) {
    this.state.set({
      ...this.defaultState,
      ...newState,
      logoUrl: newState.logoUrl || this.defaultState.logoUrl,
    });
  }

  patchState(partial: Partial<HeaderState>) {
    this.state.update((current) => ({
      ...current,
      ...partial,
      logoUrl: partial.logoUrl || current.logoUrl || this.defaultState.logoUrl,
    }));
  }
}
