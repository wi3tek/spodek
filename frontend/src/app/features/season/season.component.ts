import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // KONIECZNE
import { SeasonService } from '../../core/services/season.service';
import { MatchService } from '../../core/services/match.service';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-season',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './season.component.html',
  styleUrls: ['./season.component.scss']
})
export class SeasonComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private matchService = inject(MatchService);
  private seasonService = inject(SeasonService);
  private adminService = inject(AdminService);

  // --- DANE ---
  seasonId = signal<string | null>(null);
  season = signal<any>(null);
  matches = signal<any[]>([]);
  allPlayers = signal<any[]>([]);
  allTeams = signal<any[]>([]);
  today = new Date();

  // --- STAN FORMULARZA ---
  showMatchForm = signal(false);
  editingMatch = signal<any | null>(null);
  searchHomeTeam = signal('');
  searchAwayTeam = signal('');
  searchPlayerQuery = signal('');
  matchStateTrigger = signal(0);

  tableData = signal<any[]>([]); // Możesz tu użyć interface SeasonTableEntryDTO jeśli go masz

  // Obiekt roboczy meczu
  newMatch: any = {
    matchweek: 1,
    homeSide: { teamId: '', assetId: '', teamName: '', goals: 0, players: [] }, // ZMIANA
    awaySide: { teamId: '', assetId: '', teamName: '', goals: 0, players: [] }, // ZMIANA
    finished: false
  };

  // --- REAKTYWNE PODPOWIEDZI (COMPUTED) ---

  // Gracze: Alfabetycznie, max 10, tylko ci, którzy NIE są jeszcze w tym meczu
  filteredPlayers = computed(() => {
    const query = this.searchPlayerQuery().toLowerCase();
    this.matchStateTrigger(); // KRYTYCZNE: Odświeża listę po dodaniu/usunięciu gracza!

    const selectedIds = this.getSelectedPlayerIds();

    return this.allPlayers()
      .filter(p =>
        !selectedIds.includes(p.id) &&
        (p.alias.toLowerCase().includes(query) || p.name.toLowerCase().includes(query))
      )
      .sort((a, b) => a.alias.localeCompare(b.alias))
      .slice(0, 10);
  });

  homeTeamSuggestions = computed(() => {
    const query = this.searchHomeTeam().toLowerCase();
    this.matchStateTrigger();
    if (query.length < 3) return [];

    const usedInWeek = this.getUsedTeamIdsInMatchweek();
    const awayTeamId = this.newMatch.awaySide.teamId; // ZMIANA NA teamId

    return this.allTeams().filter(t =>
      t.id !== awayTeamId && // Porównujemy Mongo ID
      !usedInWeek.includes(t.id) &&
      ((t.teamName || t.name || '').toLowerCase().includes(query) || (t.alias || '').toLowerCase().includes(query))
    );
  });

  awayTeamSuggestions = computed(() => {
    const query = this.searchAwayTeam().toLowerCase();
    this.matchStateTrigger();
    if (query.length < 3) return [];

    const usedInWeek = this.getUsedTeamIdsInMatchweek();
    const homeTeamId = this.newMatch.homeSide.teamId; // ZMIANA NA teamId

    return this.allTeams().filter(t =>
      t.id !== homeTeamId && // Porównujemy Mongo ID
      !usedInWeek.includes(t.id) &&
      ((t.teamName || t.name || '').toLowerCase().includes(query) || (t.alias || '').toLowerCase().includes(query))
    );
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.seasonId.set(id);
      this.loadSeasonData(id);
      this.loadInitialData(); // Pobieramy graczy i drużyny do selectów
    }
  }

  loadInitialData() {
    // Zakładamy, że AdminService ma metody zwracające Observable z listami
    this.adminService.getPlayers().subscribe(p => this.allPlayers.set(p));
    this.adminService.getTeams().subscribe(t => this.allTeams.set(t));
  }

  loadSeasonData(id: string) {
    // 1. Pobierz dane o sezonie
    this.seasonService.getSeasonById(id).subscribe(s => this.season.set(s));

    // 2. Pobierz listę meczów
    this.matchService.getMatchesBySeason(id).subscribe(m => {
      this.matches.set(m.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    });

    // 3. Pobierz tabelę (to jest nasza nowa rura!)
    this.seasonService.getSeasonTable(id).subscribe({
      next: (table) => {
        this.tableData.set(table);
      },
      error: (err) => console.error('Błąd pobierania tabeli:', err)
    });
  }

  // --- LOGIKA FORMULARZA ---

  onPlayerSelect(side: 'home' | 'away', event: Event) {
    const select = event.target as HTMLSelectElement;
    const playerId = select.value;
    if (!playerId) return;

    const player = this.allPlayers().find(p => p.id === playerId);
    if (player) {
      this.addPlayerToSide(side, player);
    }
    select.value = ''; // Reset selecta, żeby można było wybrać kolejnego
  }

  removePlayer(side: 'home' | 'away', playerId: string) {
    const target = side === 'home' ? this.newMatch.homeSide : this.newMatch.awaySide;
    target.players = target.players.filter((p: any) => p.playerId !== playerId);
    this.matchStateTrigger.update(v => v + 1); // Wymusza powrót gracza do selecta!
  }

  selectTeam(side: 'home' | 'away', team: any) {
    const targetSide = side === 'home' ? this.newMatch.homeSide : this.newMatch.awaySide;

    // KRYTYCZNE ROZDZIELENIE:
    targetSide.teamId = team.id; // PRAWDZIWE MONGO ID (do bazy i walidacji)
    targetSide.assetId = team.assetId || 'default'; // NAZWA GRAFIKI (tylko do <img src>)
    targetSide.teamName = team.alias || team.teamName || team.name;

    if (side === 'home') this.searchHomeTeam.set('');
    else this.searchAwayTeam.set('');

    this.matchStateTrigger.update(v => v + 1);
  }

  clearTeam(side: 'home' | 'away') {
    const targetSide = side === 'home' ? this.newMatch.homeSide : this.newMatch.awaySide;
    targetSide.teamId = '';  // CZYŚCIMY MONGO ID
    targetSide.assetId = '';
    targetSide.teamName = '';

    this.matchStateTrigger.update(v => v + 1);
  }

// --- DYNAMICZNE WYNIKI MECZU ---
  get homeGoals(): number {
    return this.newMatch.homeSide.players.reduce((sum: number, p: any) => sum + (p.goals || 0), 0);
  }

  get awayGoals(): number {
    return this.newMatch.awaySide.players.reduce((sum: number, p: any) => sum + (p.goals || 0), 0);
  }

  // NOWE: Dynamiczne asysty
  get homeAssists(): number {
    return this.newMatch.homeSide.players.reduce((sum: number, p: any) => sum + (p.assists || 0), 0);
  }

  get awayAssists(): number {
    return this.newMatch.awaySide.players.reduce((sum: number, p: any) => sum + (p.assists || 0), 0);
  }
  saveFullMatch() {
    if (!this.isFormValid()) return;

    // --- NOWA WALIDACJA ASYST ---
    if (this.homeAssists > this.homeGoals) {
      alert(`BŁĄD GOSPODARZY: Drużyna zdobyła ${this.homeGoals} bramek, ale graczom przypisano aż ${this.homeAssists} asyst! Zmniejsz liczbę asyst.`);
      return; // Przerwanie zapisu
    }

    if (this.awayAssists > this.awayGoals) {
      alert(`BŁĄD GOŚCI: Drużyna zdobyła ${this.awayGoals} bramek, ale graczom przypisano aż ${this.awayAssists} asyst! Zmniejsz liczbę asyst.`);
      return; // Przerwanie zapisu
    }

    // Automatycznie przepisujemy policzone gole do obiektu tuż przed wysłaniem na backend
    this.newMatch.homeSide.goals = this.homeGoals;
    this.newMatch.awaySide.goals = this.awayGoals;

    const payload = {
      ...this.newMatch,
      seasonId: this.seasonId()
    };

    const request = this.editingMatch()
      ? this.matchService.updateMatch(this.editingMatch().id, payload)
      : this.matchService.createMatch(payload);

    request.subscribe({
      next: () => {
        this.loadSeasonData(this.seasonId()!);
        this.closeForm();
      },
      error: (err) => alert('Błąd zapisu: ' + (err.error?.message || 'Nieznany błąd serwera'))
    });
  }

  isFormValid(): boolean {
    const m = this.newMatch;
    return !!(
      m.homeSide.assetId &&
      m.awaySide.assetId &&
      m.homeSide.players.length > 0 &&
      m.awaySide.players.length > 0
    );
  }

  // --- POMOCNICZE ---

  addNewMatch() {
    this.resetForm();
    this.showMatchForm.set(true);

    // Wymuszamy płynny scroll do góry po wyrenderowaniu formularza
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }

  editMatch(match: any) {
    if (match.finished) return;
    this.editingMatch.set(match);

    // Głęboka kopia obiektu
    this.newMatch = JSON.parse(JSON.stringify(match));

    this.searchHomeTeam.set(match.homeSide.teamName || '');
    this.searchAwayTeam.set(match.awaySide.teamName || '');

    this.matchStateTrigger.update(v => v + 1); // Wymusza przeliczenie walidacji i selectów
    this.showMatchForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeForm() {
    this.showMatchForm.set(false);
    this.resetForm();
  }

  private resetForm() {
    this.editingMatch.set(null);
    this.searchHomeTeam.set('');
    this.searchAwayTeam.set('');
    this.newMatch = {
      matchweek: this.matches().length > 0 ? this.matches()[this.matches().length - 1].matchweek : 1,
      homeSide: { assetId: '', goals: 0, players: [] },
      awaySide: { assetId: '', goals: 0, players: [] },
      finished: false
    };
  }



  // (Reszta Twoich metod: getSelectedPlayerIds, getUsedTeamIdsInMatchweek, addPlayerToSide)
  // [Wklej tutaj kod, który już miałeś wcześniej]

  logout() {
    localStorage.removeItem('spodek_token');
    this.router.navigate(['/login']);
  }

  addPlayerToSide(side: 'home' | 'away', player: any) {
    const target = side === 'home' ? this.newMatch.homeSide : this.newMatch.awaySide;
    const isAlreadyAdded = target.players.some((p: any) => p.playerId === player.id);

    if (!isAlreadyAdded && target.players.length < 2) {
      target.players.push({
        playerId: player.id,
        alias: player.alias,
        goals: 0,      // Inicjalizacja statystyk
        assists: 0,
        yellowCards: 0,
        redCards: 0
      });
      this.matchStateTrigger.update(v => v + 1);
    }
  }

  /**
   * Pobiera listę wszystkich ID graczy wybranych obecnie w formularzu
   * Służy do filtrowania listy podpowiedzi (brak duplikatów)
   */
  getSelectedPlayerIds(): string[] {
    const homeIds = this.newMatch.homeSide.players.map((p: any) => p.playerId);
    const awayIds = this.newMatch.awaySide.players.map((p: any) => p.playerId);
    return [...homeIds, ...awayIds];
  }

  /**
   * Zwraca listę ID drużyn, które wystąpiły już w danej kolejce
   * Działa tylko jeśli w opcjach sezonu flaga uniqueTeams jest na true
   */
  getUsedTeamIdsInMatchweek(): string[] {
    if (!this.season()?.uniqueTeams) return [];
    return this.matches()
      .filter(m => m.matchweek === this.newMatch.matchweek && m.id !== this.editingMatch()?.id)
      // Pobieramy prawdziwe ID z bazy (teamId lub gameTeamId, zależy co wysyła backend), a NIE assetId ("default")
      .flatMap(m => [m.homeSide.teamId || m.homeSide.assetId, m.awaySide.teamId || m.awaySide.assetId]);
  }

// --- POPRAWKA W USUWANIU MECZU ---
  deleteMatch(matchId: string) {
    if (confirm('Czy na pewno chcesz usunąć ten mecz?')) {
      this.matchService.deleteMatch(matchId).subscribe(() => {
        // 1. Odświeżamy dane z serwera
        this.loadSeasonData(this.seasonId()!);
        // 2. Wymuszamy reset list unikalności
        this.matchStateTrigger.update(v => v + 1);
        // 3. Jeśli formularz był otwarty na tym meczu - zamykamy
        if (this.editingMatch()?.id === matchId) {
          this.closeForm();
        }
      });
    }
  }

  selectContent(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    if (input) {
      input.select();
    }
  }

  protected readonly Math = Math;


  // Stan sortowania
  sortKey = signal<string>('points'); // domyślne sortowanie po punktach
  sortDirection = signal<'asc' | 'desc'>('desc');

  sortedTable = computed(() => {
    const data = [...this.tableData()]; // kopiujemy dane z oryginalnego sygnału
    const key = this.sortKey();
    const dir = this.sortDirection();

    return data.sort((a, b) => {
      let valA = a[key];
      let valB = b[key];

      // Obsługa sortowania (jeśli wartości są równe, używamy punktów jako "tie-breakera")
      if (valA === valB) {
        return b.points - a.points;
      }

      return dir === 'asc' ? valA - valB : valB - valA;
    });
  });

  toggleSort(key: string) {
    if (this.sortKey() === key) {
      // Jeśli klikasz w to samo -> zmień kierunek
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      // Jeśli klikasz w nowy nagłówek -> sortuj malejąco (bo w sporcie to naturalne)
      this.sortKey.set(key);
      this.sortDirection.set('desc');
    }
  }
}
