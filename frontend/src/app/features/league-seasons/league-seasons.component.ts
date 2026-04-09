import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router'; // Dodany Router
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
  private router = inject(Router); // Dodany router do logout
  private seasonService = inject(SeasonService);
  private leagueService = inject(LeagueService);

  leagueId = signal<string | null>(null);
  league = signal<any>(null);
  seasons = signal<Season[]>([]);

  showAddForm = signal(false);
  newSeasonName = signal('');
  editingSeasonId = signal<string | null>(null);

  aggregateTable = signal([
    { player: 'Wietek', m: 12, pkt: 28, wspW: 2.33, bilans: '+15' },
    { player: 'Szef', m: 10, pkt: 20, wspW: 2.00, bilans: '+8' },
    { player: 'Młody', m: 14, pkt: 15, wspW: 1.07, bilans: '-4' }
  ]);

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

    const newSeason: Partial<Season> = {
      name: name,
      leagueId: id,
      status: 'ACTIVE'
    };

    this.seasonService.createSeason(newSeason).subscribe(() => {
      this.newSeasonName.set('');
      this.showAddForm.set(false);
      this.loadData(id);
    });
  }

  saveEdit(season: Season) {
    if (!season.id) return;
    this.seasonService.updateSeason(season.id, season).subscribe(() => {
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

  addNewSeason() {
    this.showAddForm.set(true);
  }
}
