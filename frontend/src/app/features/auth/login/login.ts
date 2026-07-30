import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { HeaderService } from '../../../core/services/header.service'; // <--- DODANO IMPORT

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent implements OnInit {
  publicLeagueCode: string = '';
  activeTab: 'login' | 'guest' = 'login';
  credentials = { login: '', password: '' };

  private authService = inject(AuthService);
  private router = inject(Router);
  private headerService = inject(HeaderService); // <--- DODANO INJECT

  ngOnInit() {
    // Twardy reset - jeśli użytkownik tu wchodzi, upewniamy się, że nie ma starych śmieci
    localStorage.removeItem('access_token');

    // Wymuszamy ukrycie headera dla tego konkretnego widoku
    this.headerService.setState({ isVisible: false });
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
