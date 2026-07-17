import { Component, inject } from '@angular/core'; // Dodaj OnInit
import { Router, RouterLink } from '@angular/router'; // Dodaj RouterLink i RouterLinkActive
import { LeagueService } from '../../core/services/league.service';
import { League } from '../../core/models/league.model';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true, // Upewnij się, że to masz
  imports: [RouterLink, HeaderComponent], // <-- TO JEST KLUCZ!
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
