import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LeagueService } from '../../core/services/league.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeasonService } from '../../core/services/season.service';
import { Season } from '../../core/models/season.model';

@Component({
  selector: 'app-league-seasons',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './league-seasons.component.html',
  styleUrls: ['./league-seasons.component.scss']
})
export class LeagueSeasonsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seasonService = inject(SeasonService);
  private leagueService = inject(LeagueService);

  leagueId = signal<string | null>(null);
  league = signal<any>(null);
  seasons = signal<Season[]>([]);

  showAddForm = signal(false);
  newSeasonName = signal('');
  newSeasonUniqueTeams = signal(true); // Nowy sygnał dla formularza

  editingSeasonId = signal<string | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.leagueId.set(id);
      this.loadData(id);
    }
  }

  loadData(id: string) {
    this.leagueService.getLeagueById(id).subscribe(l => this.league.set(l));
    this.seasonService.getSeasonsByLeague(id).subscribe(s => this.seasons.set(s));
  }

  saveSeason() {
    const id = this.leagueId();
    const name = this.newSeasonName().trim();
    if (!id || !name) return;

    // Tworzymy payload - używamy wartości z sygnału
    const newSeason: Partial<Season> = {
      name: name,
      leagueId: id,
      status: 'ACTIVE',
      uniqueTeams: this.newSeasonUniqueTeams()
    };

    this.seasonService.createSeason(newSeason).subscribe(() => {
      this.newSeasonName.set('');
      this.newSeasonUniqueTeams.set(true); // Resetujemy do domyślnej
      this.showAddForm.set(false);
      this.loadData(id);
    });
  }

  saveEdit(season: Season) {
    if (!season.id) return;

    // TWARDY PAYLOAD: Kopiujemy właściwości, by uniknąć problemów z referencją Angulara,
    // i wymuszamy, by uniqueTeams było czystym typem boolean.
    const payload: Season = {
      ...season,
      uniqueTeams: !!season.uniqueTeams
    };

    this.seasonService.updateSeason(season.id, payload).subscribe(() => {
      this.editingSeasonId.set(null);
      if (this.leagueId()) this.loadData(this.leagueId()!);
    });
  }

  toggleStatus(season: Season) {
    season.status = season.status === 'ACTIVE' ? 'FINISHED' : 'ACTIVE';
    this.saveEdit(season);
  }

  logout() {
    localStorage.removeItem('spodek_token');
    this.router.navigate(['/login']);
  }
}
