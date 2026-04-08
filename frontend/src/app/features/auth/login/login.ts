import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {AuthService} from '../../../core/services/auth.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  credentials = {login: '', password: ''};

  constructor(private authService: AuthService, private router: Router) {
  }
  onSubmit() {
    // Wysyłamy obiekt 'credentials' do serwisu
    this.authService.login(this.credentials).subscribe({
      next: (response: any) => {
        const token = response.token;
        if (token) {
          localStorage.setItem('access_token', token);
          // Teraz używamy Routera, by przejść do dashboardu
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        console.error('Błąd:', err);
        alert('Nie udało się zalogować');
      }
    });
  }
}
