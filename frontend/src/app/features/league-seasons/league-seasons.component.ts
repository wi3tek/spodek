import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LeagueService } from '../../core/services/league.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeasonService } from '../../core/services/season.service';
import { Season } from '../../core/models/season.model';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-league-seasons',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent],
  templateUrl: './league-seasons.component.html',
  styleUrls: ['./league-seasons.component.scss'],
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

  // Zmienne/Sygnały dla nowego sezonu
  newSeasonName = signal<string>('');
  newSeasonImage = signal<string>('');
  newSeasonMinMatches = signal<number>(10);
  newSeasonUniqueTeams = signal<boolean>(true);

  editingSeasonId = signal<string | null>(null);

  // Sygnał do przechowywania oryginalnego stanu sezonu (przed edycją)
  originalSeason = signal<Season | null>(null);
  newSeasonLogoUrl = signal<string>('');

  // --- NASŁUCHIWANIE NA KLAWISZ ESCAPE ---
  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: KeyboardEvent) {
    // Zamyka tryb edycji sezonu
    if (this.editingSeasonId()) {
      this.cancelEdit();
    }
    // Zamyka opcjonalnie też formularz dodawania nowego sezonu
    if (this.showAddForm()) {
      this.showAddForm.set(false);
    }
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.leagueId.set(id);
      this.loadData(id);
    }
  }

  loadData(id: string) {
    this.leagueService.getLeagueById(id).subscribe((l) => this.league.set(l));
    this.seasonService.getSeasonsByLeague(id).subscribe((s) => {
      // Sortowanie: od najnowszego startDate (góra) do najstarszego (dół)
      const sortedSeasons = s.sort((a, b) => {
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      });
      this.seasons.set(sortedSeasons);
    });
  }

  saveSeason() {
    const id = this.leagueId();
    const name = this.newSeasonName().trim();
    if (!id || !name) return;

    // Tworzymy payload
    const newSeason: Partial<Season> = {
      name: name,
      leagueId: id,
      image: this.newSeasonImage(),
      logoUrl: this.newSeasonLogoUrl(), // <--- DODANO
      minPlayerMatchAmount: this.newSeasonMinMatches(),
      uniqueTeams: this.newSeasonUniqueTeams(),
      status: 'ACTIVE',
    };

    this.seasonService.createSeason(newSeason).subscribe(() => {
      // Czyszczenie całego formularza po poprawnym zapisie
      this.newSeasonName.set('');
      this.newSeasonImage.set('');
      this.newSeasonMinMatches.set(10);
      this.newSeasonUniqueTeams.set(true);
      this.newSeasonLogoUrl.set('');
      this.showAddForm.set(false);
      this.loadData(id);
    });
  }

  startEditing(season: Season) {
    this.editingSeasonId.set(season.id!);
    this.originalSeason.set({ ...season }); // Robimy płytką kopię
  }

  // --- NOWE: ANULOWANIE EDYCJI (Z COFNIĘCIEM ZMIAN) ---
  cancelEdit() {
    if (this.editingSeasonId() && this.originalSeason()) {
      const original = this.originalSeason()!;
      // Przywraca oryginalne wartości do sezonu na liście (cofa zmiany z ngModel)
      this.seasons.update((currentSeasons) =>
        currentSeasons.map((s) => (s.id === original.id ? { ...original } : s)),
      );
    }
    this.editingSeasonId.set(null);
    this.originalSeason.set(null);
  }

  updateEndDate(season: any, dateString: string) {
    if (dateString) {
      season.endDate = new Date(dateString).toISOString();
    } else {
      season.endDate = null;
    }
  }

  hasChanges(season: Season): boolean {
    const original = this.originalSeason();
    if (!original) return false;

    return (
      season.name !== original.name ||
      season.image !== original.image ||
      season.minPlayerMatchAmount !== original.minPlayerMatchAmount ||
      season.uniqueTeams !== original.uniqueTeams ||
      season.status !== original.status ||
      season.endDate !== original.endDate || // <--- DODANO SPRAWDZANIE DATY
      season.logoUrl !== original?.logoUrl
    );
  }

  saveEdit(season: Season) {
    if (!season.id) return;

    // JEŚLI SEZON JEST ZAKOŃCZONY, A DATA JEST PUSTA -> DOMYŚLNIE AKTUALNA DATA
    if (season.status === 'FINISHED' && !season.endDate) {
      season.endDate = new Date().toISOString();
    }

    const payload: Season = {
      ...season,
      uniqueTeams: season.uniqueTeams,
    };

    this.seasonService.updateSeason(season.id, payload).subscribe(() => {
      this.editingSeasonId.set(null);
      this.originalSeason.set(null);

      if (this.leagueId()) this.loadData(this.leagueId()!);
    });
  }

  toggleStatus(season: Season) {
    season.status = season.status === 'ACTIVE' ? 'FINISHED' : 'ACTIVE';
    this.saveEdit(season);
  }

  finishSeason(season: any) {
    season.status = 'FINISHED';
    season.endDate = new Date().toISOString();
  }

  restoreSeason(season: any) {
    season.status = 'ACTIVE';
    season.endDate = null;
  }
}
