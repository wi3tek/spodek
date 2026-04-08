import { Router } from '@angular/router';
import { Component, inject } from '@angular/core';
import { LeagueService } from '../../../core/services/league.service';
// 1. Zaktualizowany import z @angular/forms
import { NonNullableFormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; // 2. Dodajemy CommonModule

@Component({
  selector: 'app-league-form',
  // 3. Wrzucamy moduły do tablicy:
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './league-form.component.html',
  styleUrl: './league-form.component.scss'
})
export class LeagueFormComponent {
  private fb = inject(NonNullableFormBuilder);
  private leagueService = inject(LeagueService);
  private router = inject(Router);

  leagueForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]]
  });

  onSubmit() {
    if (this.leagueForm.valid) {
      this.leagueService.createLeague(this.leagueForm.getRawValue()).subscribe({
        next: () => {
          console.log('Liga zapisana!');
          this.router.navigate(['/dashboard']);
        },
        error: (err) => console.error('Błąd zapisu', err)
      });
    }
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }
}
