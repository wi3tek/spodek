import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent implements OnInit {
  publicLeagueCode: string = '';
  activeTab: 'login' | 'guest' = 'login'; // Zmienna sterująca zakładkami

  // Implementacja interfejsu
  credentials = { login: '', password: '' };

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    // Twardy reset - jeśli użytkownik tu wchodzi, upewniamy się, że nie ma starych śmieci
    localStorage.removeItem('access_token');
  }

  onSubmit() {
    this.authService.login(this.credentials).subscribe({
      next: (response: any) => {
        const token = response.token;
        if (token) {
          localStorage.setItem('access_token', token);
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        console.error('Błąd:', err);
        alert('Nie udało się zalogować');
      },
    });
  }

  protected enterAsGuest() {
    const code = this.publicLeagueCode.trim();
    if (code.length > 0) {
      this.router.navigate(['/live', code]);
    } else {
      alert('Proszę podać kod ligi.');
    }
  }
}
