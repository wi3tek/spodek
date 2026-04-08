import {Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {LeagueService} from '../../core/services/league.service';
import {League} from '../../core/models/league.model';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  constructor(private router: Router) {
  }

  private leagueService = inject(LeagueService);
  leagues: League[] = [];

  ngOnInit() {
    this.loadLeagues();
  }

  loadLeagues() {
    this.leagueService.getLeagues().subscribe({
      next: (data) => this.leagues = data,
      error: (err) => console.error('Błąd pobierania lig:', err)
    });
  }

  logout() {
    // 1. Usuwamy token z pamięci przeglądarki
    localStorage.removeItem('access_token');

    // 2. Opcjonalnie: czyścimy inne dane sesji, jeśli je masz
    console.log('Wylogowano pomyślnie. Do zobaczenia!');

    // 3. Przekierowujemy do ekranu logowania
    this.router.navigate(['/login']);
  }

  // ... reszta kodu (ngOnInit, loadLeagues, logout)

  openLeague(id: string | undefined) {
    if (!id) return;

    // Na razie zróbmy prosty test, żeby zobaczyć, czy kliknięcie na tablecie działa
    console.log('Kliknięto ligę o ID:', id);
    alert('Docelowo przeniosę Cię do widoku ligi o ID: ' + id);

    // W przyszłości, jak stworzymy LeagueDetailComponent, odkomentujesz to:
    // this.router.navigate(['/dashboard/league', id]);
  }

  addNewLeague() {
    this.router.navigate(['/dashboard/league/new']);
  }
}
