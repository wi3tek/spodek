import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  credentials = { email: '', password: '' };

  constructor(private authService: AuthService) {}

  onSubmit() {
    this.authService.login(this.credentials).subscribe({
      next: (res) => {
        console.log('Zalogowano! Token:', res.token);
        alert('Sukces! Zalogowano do Spodka.');
      },
      error: (err) => {
        console.error('Błąd logowania:', err);
        alert('Nie udało się zalogować.');
      }
    });
  }
}
