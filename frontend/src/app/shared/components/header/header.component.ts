import { Component, Input, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';

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

  public themeService = inject(ThemeService);
  private router = inject(Router);

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
}
