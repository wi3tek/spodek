import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LeagueService } from '../../core/services/league.service';
import { League } from '../../core/models/league.model';
import { HeaderService } from '../../core/services/header.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink], // Usunięto HeaderComponent
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private leagueService = inject(LeagueService);
  private headerService = inject(HeaderService);

  leagues: League[] = [];

  ngOnInit() {
    this.headerService.setState({
      title: 'Centrum ligowe',
    });

    this.loadLeagues();
  }

  loadLeagues() {
    this.leagueService.getLeagues().subscribe({
      next: (data) => (this.leagues = data),
      error: (err) => console.error('Błąd pobierania lig:', err),
    });
  }

  openLeague(id: string | undefined) {
    if (!id) return;
    console.log('Kliknięto ligę o ID:', id);
    alert('Docelowo przeniosę Cię do widoku ligi o ID: ' + id);
  }

  addNewLeague() {
    this.router.navigate(['/dashboard/league/new']);
  }
}
