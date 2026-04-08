import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LeagueService } from '../../core/services/league.service';
import { CommonModule } from '@angular/common';
import {SeasonService} from '../../core/services/season.service';

@Component({
  selector: 'app-league-seasons',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './league-seasons.component.html',
  styleUrls: ['./league-seasons.component.scss']
})
export class LeagueSeasonsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private seasonService = inject(SeasonService);
  private leagueService = inject(LeagueService);

  leagueId = signal<string | null>(null);
  league = signal<any>(null);
  seasons = signal<any[]>([]);

  // Przykładowe dane do Tabeli Zbiorczej (potem będą liczone z API Match)
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
}
