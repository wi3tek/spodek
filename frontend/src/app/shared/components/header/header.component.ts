import { Component, Input, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  @Input() title: string = 'FIFOWA ŚPODA';
  @Input() backLink?: any[] | string | null;
  @Input() backText?: string;
  @Input() isReadOnly: boolean = false; // NOWE: Flaga trybu gościa

  public themeService = inject(ThemeService);
  private router = inject(Router);
  authService = inject(AuthService);

  isMobileMenuOpen = signal(false);
  isScrolled = signal(false);

  // Nasłuchiwanie scrollowania strony
  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled.set(window.scrollY > 20);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  logout() {
    this.closeMobileMenu();
    localStorage.removeItem('spodek_token');
    this.router.navigate(['/login']);
  }

  // Zmienna przechowująca zdarzenie instalacji
  installPrompt: any;

  // Nasłuchiwanie na zgłoszenie gotowości do instalacji PWA
  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: Event) {
    event.preventDefault(); // Zablokuj domyślne zachowanie przeglądarki
    this.installPrompt = event; // Zapisz zdarzenie, by wyświetlić przycisk
  }

  installPWA() {
    if (!this.installPrompt) return;

    this.installPrompt.prompt();
    this.installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Aplikacja została zainstalowana.');
      }
      this.installPrompt = null; // Ukryj przycisk po reakcji użytkownika
    });
  }
}
