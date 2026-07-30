import { Component, inject, signal, computed, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { CommonService } from '../../../core/services/common.service';
import { HeaderService } from '../../../core/services/header.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  public themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly swUpdate = inject(SwUpdate);
  public authService = inject(AuthService);
  public commonService = inject(CommonService);
  private readonly headerService = inject(HeaderService);

  // Zastępujemy @Input sygnałami computed
  title = computed(() => this.headerService.state().title);
  backLink = computed(() => this.headerService.state().backLink);
  backText = computed(() => this.headerService.state().backText);
  isReadOnly = computed(() => this.headerService.state().isReadOnly);
  logoUrl = computed(() => this.headerService.state().logoUrl);

  isMobileMenuOpen = signal(false);
  isScrolled = signal(false);

  // --- STAN PWA ---
  installPrompt: any = null;
  isStandalone = signal(false);
  isIOS = signal(false);
  showIosInstruction = signal(false);

  ngOnInit() {
    const isStandAlone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    this.isStandalone.set(isStandAlone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    this.isIOS.set(/iphone|ipad|ipod/.test(userAgent));

    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          document.location.reload();
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
