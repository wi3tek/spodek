import { Component, Input, inject, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { CommonService } from '../../../core/services/common.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  @Input() title: string = 'ŚPODA•FC';
  @Input() backLink?: any[] | string | null;
  @Input() backText?: string;
  @Input() isReadOnly: boolean = false;
  @Input() logoUrl?: string | null = null;

  public themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly swUpdate = inject(SwUpdate);
  authService = inject(AuthService);
  commonService = inject(CommonService);

  isMobileMenuOpen = signal(false);
  isScrolled = signal(false);

  // --- STAN PWA ---
  installPrompt: any = null;
  isStandalone = signal(false);
  isIOS = signal(false);
  showIosInstruction = signal(false);

  ngOnInit() {
    // 1. Sprawdzamy czy apka już jest odpalona jako PWA
    const isStandAlone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    this.isStandalone.set(isStandAlone);

    // 2. Sprawdzamy czy to urządzenie Apple
    const userAgent = window.navigator.userAgent.toLowerCase();
    this.isIOS.set(/iphone|ipad|ipod/.test(userAgent));

    // 3. Automatyczna aktualizacja w tle
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          document.location.reload(); // Wymusza twardy restart po pobraniu nowej wersji
        });
    }
  }

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
    this.authService.logout();
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: Event) {
    event.preventDefault();
    this.installPrompt = event;
  }

  installPWA() {
    if (this.isIOS()) {
      this.showIosInstruction.set(true);
      setTimeout(() => this.showIosInstruction.set(false), 6000);
      return;
    }

    if (this.installPrompt) {
      this.installPrompt.prompt();
      this.installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          this.isStandalone.set(true);
        }
        this.installPrompt = null;
      });
    }
  }
}
