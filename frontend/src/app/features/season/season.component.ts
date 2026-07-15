import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeasonService } from '../../core/services/season.service';
import { MatchService } from '../../core/services/match.service';
import { AdminService } from '../../core/services/admin.service';
import { MatchweekService } from '../../core/services/matchweek.service';
import {debounceTime, distinctUntilChanged, Subject} from 'rxjs'; // NOWE
import { FifaLoaderComponent } from '../../shared/components/fifa-loader/fifa-loader.component';
import { MatchmakingService } from '../../core/services/matchmaking.service';
import { StatsComponent } from '../stats/stats.component'; // NOWE

@Component({
  selector: 'app-season',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, FifaLoaderComponent, StatsComponent],
  templateUrl: './season.component.html',
  styleUrls: ['./season.component.scss'],
})
export class SeasonComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private matchService = inject(MatchService);
  private seasonService = inject(SeasonService);
  private adminService = inject(AdminService);
  private matchweekService = inject(MatchweekService); // NOWE
  private matchmakingService = inject(MatchmakingService); // NOWE

  // --- DANE ---
  seasonId = signal<string | null>(null);
  season = signal<any>(null);
  matches = signal<any[]>([]);
  allPlayers = signal<any[]>([]);
  allTeams = signal<any[]>([]);
  today = new Date();

  // --- STAN FORMULARZA MECZU ---
  showMatchForm = signal(false);
  editingMatch = signal<any | null>(null);
  searchHomeTeam = signal('');
  searchAwayTeam = signal('');
  searchPlayerQuery = signal('');
  matchStateTrigger = signal(0);
  tableData = signal<any[]>([]);

  // --- STAN OBECNOŚCI I MATCHMAKINGU (NOWE) ---
  showAttendanceModal = signal(false);
  activeMatchweek = signal<number>(1);
  presentPlayerIds = signal<string[]>([]);
  visibleInModalIds = signal<string[]>([]);

  searchNewPlayerQuery = signal('');
  // Strumień do opóźniania żądań przy zmianie kolejki
  private matchweekSubject = new Subject<number>();

  isLoadingAttendance = signal(false); // NOWA FLAGA

  statsRefreshTrigger = signal(0);

  // --- ZMIANY W STANIE SUGEROWANYCH MECZÓW (PAGINACJA) ---
  allSuggestedMatches = signal<any[]>([]);
  currentSuggestionPage = signal(0);
  isSuggesting = signal(false); // Do zablokowania przycisku na czas ładowania

  // W locie wycinamy tylko 3 kafelki dla aktualnej strony
  suggestedMatches = computed(() => {
    const start = this.currentSuggestionPage() * 3;
    return this.allSuggestedMatches().slice(start, start + 3);
  });

  // Oblicza, którzy gracze ROZEGRALI jakikolwiek mecz w aktualnej kolejce
  playersWithMatchesInWeek = computed(() => {
    const week = this.activeMatchweek();
    const matchesInWeek = this.matches().filter((m) => m.matchweek === week);
    const lockedIds = new Set<string>();

    for (const match of matchesInWeek) {
      if (match.homeSide?.players) {
        match.homeSide.players.forEach((p: any) => lockedIds.add(p.playerId));
      }
      if (match.awaySide?.players) {
        match.awaySide.players.forEach((p: any) => lockedIds.add(p.playerId));
      }
    }
    return Array.from(lockedIds);
  });

  // Modal mapuje ID z visibleInModalIds na obiekty graczy i od razu ich sortuje
  modalDisplayPlayers = computed(() => {
    const visibleIds = this.visibleInModalIds();
    const presentIds = this.presentPlayerIds();
    const lockedIds = this.playersWithMatchesInWeek(); // Opcjonalnie: zablokowani zawsze na samej górze

    // 1. Wyciągamy graczy z bazy
    const unsortedPlayers = this.allPlayers().filter((p) => visibleIds.includes(p.id));

    // 2. Sortujemy:
    // Priorytet 1: Grał w tej kolejce (zablokowany checkbox) - na samą górę
    // Priorytet 2: Zaznaczony jako obecny (gotowy do gry)
    // Priorytet 3: Odznaczony (wyszarzony) - spada na dół
    // Priorytet 4: Alfabet
    return unsortedPlayers.sort((a, b) => {
      const isALocked = lockedIds.includes(a.id);
      const isBLocked = lockedIds.includes(b.id);

      const isAPresent = presentIds.includes(a.id);
      const isBPresent = presentIds.includes(b.id);

      // Krok 1: Kto grał (Locked) ten wyżej
      if (isALocked !== isBLocked) {
        return isALocked ? -1 : 1;
      }

      // Krok 2: Kto jest zaznaczony ten wyżej
      if (isAPresent !== isBPresent) {
        return isAPresent ? -1 : 1;
      }

      // Krok 3: Jeśli status jest ten sam, sortuj alfabetycznie po aliasie
      return a.alias.localeCompare(b.alias);
    });
  });

  attendanceSuggestions = computed(() => {
    const query = this.searchNewPlayerQuery().toLowerCase();
    if (query.length < 2) return [];

    const visibleIds = this.visibleInModalIds();

    return this.allPlayers()
      .filter(
        (p) =>
          !visibleIds.includes(p.id) &&
          (p.alias.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)),
      )
      .slice(0, 5);
  });

  newMatch: any = {
    matchweek: 1,
    homeSide: { teamId: '', assetId: '', teamName: '', goals: 0, players: [] },
    awaySide: { teamId: '', assetId: '', teamName: '', goals: 0, players: [] },
    finished: false,
  };

  // ... (Wszystkie Twoje computed() zostają BEZ ZMIAN)
  filteredPlayers = computed(() => {
    const query = this.searchPlayerQuery().toLowerCase();
    this.matchStateTrigger();
    const selectedIds = this.getSelectedPlayerIds();
    return this.allPlayers()
      .filter(
        (p) =>
          !selectedIds.includes(p.id) &&
          (p.alias.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)),
      )
      .sort((a, b) => a.alias.localeCompare(b.alias))
      .slice(0, 10);
  });

  homeTeamSuggestions = computed(() => {
    const query = this.searchHomeTeam().toLowerCase();
    this.matchStateTrigger();
    if (query.length < 3) return [];
    const usedInWeek = this.getUsedTeamIdsInMatchweek();
    const awayTeamId = this.newMatch.awaySide.teamId;
    return this.allTeams().filter(
      (t) =>
        t.id !== awayTeamId &&
        !usedInWeek.includes(t.id) &&
        ((t.teamName || t.name || '').toLowerCase().includes(query) ||
          (t.alias || '').toLowerCase().includes(query)),
    );
  });

  awayTeamSuggestions = computed(() => {
    const query = this.searchAwayTeam().toLowerCase();
    this.matchStateTrigger();
    if (query.length < 3) return [];
    const usedInWeek = this.getUsedTeamIdsInMatchweek();
    const homeTeamId = this.newMatch.homeSide.teamId;
    return this.allTeams().filter(
      (t) =>
        t.id !== homeTeamId &&
        !usedInWeek.includes(t.id) &&
        ((t.teamName || t.name || '').toLowerCase().includes(query) ||
          (t.alias || '').toLowerCase().includes(query)),
    );
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.seasonId.set(id);
      this.loadSeasonData(id);
      this.loadInitialData();
    }
  }

  loadInitialData() {
    this.adminService.getPlayers().subscribe((p) => this.allPlayers.set(p));
    this.adminService.getTeams().subscribe((t) => this.allTeams.set(t));
  }

  loadSeasonData(id: string) {
    this.seasonService.getSeasonById(id).subscribe((s) => this.season.set(s));

    this.matchService.getMatchesBySeason(id).subscribe((m) => {
      const sorted = m.sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      this.matches.set(sorted);

      // NOWE: Ustawienie aktywnej kolejki na podstawie ostatniego meczu
      if (sorted.length > 0) {
        this.activeMatchweek.set(sorted[0].matchweek);
      }
    });

    this.seasonService.getSeasonTable(id).subscribe({
      next: (table) => this.tableData.set(table),
      error: (err) => console.error('Błąd pobierania tabeli:', err),
    });
  }

  // NOWE ZABEZPIECZENIE: Najniższa dozwolona kolejka (najwyższa rozegrana)
  minAllowedMatchweek = computed(() => {
    const m = this.matches();
    if (m.length === 0) return 1;

    // Zwracamy najwyższą rozegraną kolejkę. Nie pozwalamy cofać się poniżej niej.
    return Math.max(...m.map((match) => match.matchweek));
  });

  // (Twój obecny maxAllowedMatchweek zostaje bez zmian)
  maxAllowedMatchweek = computed(() => {
    const m = this.matches();
    if (m.length === 0) return 1;
    const highestPlayed = Math.max(...m.map((match) => match.matchweek));
    return highestPlayed + 1;
  });

  // BRAKUJĄCY KONSTRUKTOR DLA DEBOUNCE'A (Opóźnienia)
  constructor() {
    this.matchweekSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe((newWeek) => {
      this.loadAttendanceForWeek(newWeek);
    });
  }

  // ZAKTUALIZOWANA METODA: Waliduje i blokuje złe wpisy
  onWeekChange(newWeek: number) {
    const max = this.maxAllowedMatchweek();
    const min = this.minAllowedMatchweek();
    let validWeek = newWeek;

    // Blokada przed przeskakiwaniem kolejek w górę
    if (newWeek > max) {
      alert(
        `Błąd! Nie możesz przeskoczyć do kolejki ${newWeek}. Najpierw rozegraj kolejkę ${max - 1}.`,
      );
      validWeek = max;
    }
    // Blokada przed cofaniem się do zamkniętych kolejek
    else if (newWeek < min) {
      alert(
        `Błąd! Kolejka ${newWeek} jest już zamknięta. Możesz zarządzać obecnością tylko dla bieżącej (${min}) lub nowej (${max}) kolejki.`,
      );
      validWeek = min;
    }
    // Zabezpieczenie przed bzdurnymi danymi
    else if (!newWeek) {
      validWeek = min;
    }

    // Odświeżamy UI natychmiast, żeby cofnąć błędną liczbę w inpucie
    this.activeMatchweek.set(validWeek);

    // WŁĄCZAMY LOADER NATYCHMIAST (przed opóźnieniem debounce)
    this.isLoadingAttendance.set(true);

    // Wysyłamy poprawną wartość do strumienia pobierającego z bazy
    this.matchweekSubject.next(validWeek);
  }
  loadAttendanceForWeek(week: number) {
    if (!this.seasonId()) return;

    this.isLoadingAttendance.set(true); // Upewniamy się, że loader działa przy pierwszym wejściu

    this.matchweekService.getMatchweek(this.seasonId()!, week).subscribe({
      next: (res) => {
        const backendPresent = res.presentPlayerIds || [];
        this.presentPlayerIds.set(backendPresent);

        const matchesInWeek = this.matches().filter((m) => m.matchweek === week);
        const playedIds = new Set<string>();
        matchesInWeek.forEach((m) => {
          m.homeSide?.players?.forEach((p: any) => playedIds.add(p.playerId));
          m.awaySide?.players?.forEach((p: any) => playedIds.add(p.playerId));
        });

        const allVisible = Array.from(new Set([...backendPresent, ...Array.from(playedIds)]));
        this.visibleInModalIds.set(allVisible);

        this.isLoadingAttendance.set(false); // WYŁĄCZAMY LOADER PO SUKCESIE
      },
      error: (err) => {
        console.error('Błąd pobierania obecności', err);
        this.isLoadingAttendance.set(false); // WYŁĄCZAMY LOADER W RAZIE BŁĘDU
      },
    });
  }

  togglePlayerPresence(playerId: string) {
    const current = this.presentPlayerIds();
    if (current.includes(playerId)) {
      // Odznaczamy (ale NIE USUWA to gracza z visibleInModalIds)
      this.presentPlayerIds.set(current.filter((id) => id !== playerId));
    } else {
      // Zaznaczamy z powrotem
      this.presentPlayerIds.set([...current, playerId]);
    }
  }

  addPlayerToAttendance(player: any) {
    // 1. Dodajemy do widoku modala
    const currentVisible = this.visibleInModalIds();
    if (!currentVisible.includes(player.id)) {
      this.visibleInModalIds.set([...currentVisible, player.id]);
    }
    // 2. Automatycznie zaznaczamy ptaszkiem
    const currentPresent = this.presentPlayerIds();
    if (!currentPresent.includes(player.id)) {
      this.presentPlayerIds.set([...currentPresent, player.id]);
    }
    this.searchNewPlayerQuery.set(''); // Czyścimy input
  }

  // ==========================================
  // RESZTA KODU POZOSTAJE BEZ ZMIAN
  // (wklej tu wszystkie swoje stare metody onPlayerSelect, saveFullMatch, deleteMatch itd.)
  // ==========================================

  onPlayerSelect(side: 'home' | 'away', event: Event) {
    const select = event.target as HTMLSelectElement;
    const playerId = select.value;
    if (!playerId) return;

    const player = this.allPlayers().find((p) => p.id === playerId);
    if (player) {
      this.addPlayerToSide(side, player);
    }
    select.value = '';
  }

  removePlayer(side: 'home' | 'away', playerId: string) {
    const target = side === 'home' ? this.newMatch.homeSide : this.newMatch.awaySide;
    target.players = target.players.filter((p: any) => p.playerId !== playerId);
    this.matchStateTrigger.update((v) => v + 1);
  }

  selectTeam(side: 'home' | 'away', team: any) {
    const targetSide = side === 'home' ? this.newMatch.homeSide : this.newMatch.awaySide;
    targetSide.teamId = team.id;
    targetSide.assetId = team.assetId || 'default';
    targetSide.teamName = team.alias || team.teamName || team.name;

    if (side === 'home') this.searchHomeTeam.set('');
    else this.searchAwayTeam.set('');

    this.matchStateTrigger.update((v) => v + 1);
  }

  clearTeam(side: 'home' | 'away') {
    const targetSide = side === 'home' ? this.newMatch.homeSide : this.newMatch.awaySide;
    targetSide.teamId = '';
    targetSide.assetId = '';
    targetSide.teamName = '';
    this.matchStateTrigger.update((v) => v + 1);
  }

  get homeGoals(): number {
    return this.newMatch.homeSide.players.reduce((sum: number, p: any) => sum + (p.goals || 0), 0);
  }
  get awayGoals(): number {
    return this.newMatch.awaySide.players.reduce((sum: number, p: any) => sum + (p.goals || 0), 0);
  }
  get homeAssists(): number {
    return this.newMatch.homeSide.players.reduce(
      (sum: number, p: any) => sum + (p.assists || 0),
      0,
    );
  }
  get awayAssists(): number {
    return this.newMatch.awaySide.players.reduce(
      (sum: number, p: any) => sum + (p.assists || 0),
      0,
    );
  }

  saveFullMatch() {
    if (!this.isFormValid()) return;
    if (this.homeAssists > this.homeGoals) {
      alert(`BŁĄD GOSPODARZY: Zbyt dużo asyst!`);
      return;
    }
    if (this.awayAssists > this.awayGoals) {
      alert(`BŁĄD GOŚCI: Zbyt dużo asyst!`);
      return;
    }

    this.newMatch.homeSide.goals = this.homeGoals;
    this.newMatch.awaySide.goals = this.awayGoals;

    // NOWE: Gwarancja przypisania poprawnej kolejki ze zsynchronizowanego nagłówka "Kanapy"
    this.newMatch.matchweek = this.activeMatchweek();

    const payload = { ...this.newMatch, seasonId: this.seasonId() };
    const request = this.editingMatch()
      ? this.matchService.updateMatch(this.editingMatch().id, payload)
      : this.matchService.createMatch(payload);

    request.subscribe({
      next: () => {
        this.loadSeasonData(this.seasonId()!);
        this.closeForm();
        this.statsRefreshTrigger.update((v) => v + 1);
      },
      error: (err) => alert('Błąd zapisu: ' + (err.error?.message || 'Nieznany błąd serwera')),
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

  addNewMatch() {
    this.resetForm();
    this.showMatchForm.set(true);

    // NOWE: Czyścimy stare sugestie przy otwieraniu nowego meczu
    this.allSuggestedMatches.set([]);
    this.currentSuggestionPage.set(0);

    // Tukej wołomy zaro po liste obecności z aktywnyj kolyjki!
    this.loadAttendanceForWeek(this.activeMatchweek());

    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  }

  editMatch(match: any) {
    if (match.finished) return;
    this.editingMatch.set(match);
    this.newMatch = JSON.parse(JSON.stringify(match));
    this.searchHomeTeam.set(match.homeSide.teamName || '');
    this.searchAwayTeam.set(match.awaySide.teamName || '');

    // Ustawiómy kolyjka na ta ze szpilu i ciągniemy z bazy szpilerów
    this.activeMatchweek.set(match.matchweek);
    this.loadAttendanceForWeek(match.matchweek);

    this.matchStateTrigger.update((v) => v + 1);
    this.showMatchForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.statsRefreshTrigger.update((v) => v + 1);
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
      matchweek: this.activeMatchweek(), // Domyślnie używamy aktywnej kolejki z sesji
      homeSide: { assetId: '', goals: 0, players: [] },
      awaySide: { assetId: '', goals: 0, players: [] },
      finished: false,
    };
  }

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
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
      });
      this.matchStateTrigger.update((v) => v + 1);
    }
  }

  getSelectedPlayerIds(): string[] {
    const homeIds = this.newMatch.homeSide.players.map((p: any) => p.playerId);
    const awayIds = this.newMatch.awaySide.players.map((p: any) => p.playerId);
    return [...homeIds, ...awayIds];
  }

  getUsedTeamIdsInMatchweek(): string[] {
    if (!this.season()?.uniqueTeams) return [];
    return this.matches()
      .filter((m) => m.matchweek === this.newMatch.matchweek && m.id !== this.editingMatch()?.id)
      .flatMap((m) => [
        m.homeSide.teamId || m.homeSide.assetId,
        m.awaySide.teamId || m.awaySide.assetId,
      ]);
  }

  deleteMatch(matchId: string) {
    if (confirm('Czy na pewno chcesz usunąć ten mecz?')) {
      this.matchService.deleteMatch(matchId).subscribe(() => {
        this.loadSeasonData(this.seasonId()!);
        this.matchStateTrigger.update((v) => v + 1);
        if (this.editingMatch()?.id === matchId) this.closeForm();

        this.statsRefreshTrigger.update((v) => v + 1);
      });
    }
  }

  selectContent(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    if (input) input.select();
  }
  protected readonly Math = Math;

  sortKey = signal<string>('winRatio');
  sortDirection = signal<'asc' | 'desc'>('desc');

  sortedTable = computed(() => {
    const data = [...this.tableData()];
    const key = this.sortKey();
    const dir = this.sortDirection();
    return data.sort((a, b) => {
      let valA = a[key];
      let valB = b[key];
      if (valA === valB) return b.points - a.points;
      return dir === 'asc' ? valA - valB : valB - valA;
    });
  });

  toggleSort(key: string) {
    if (this.sortKey() === key)
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    else {
      this.sortKey.set(key);
      this.sortDirection.set('desc');
    }
  }

  currentPage = signal(1);
  pageSize = 7;
  paginatedMatches = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize;
    return this.matches().slice(startIndex, startIndex + this.pageSize);
  });
  totalPages = computed(() => Math.ceil(this.matches().length / this.pageSize));
  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update((p) => p + 1);
  }
  prevPage() {
    if (this.currentPage() > 1) this.currentPage.update((p) => p - 1);
  }

  viewingMatch = signal<any | null>(null);
  viewMatchDetails(match: any) {
    this.viewingMatch.set(match);
  }
  closeMatchDetails() {
    this.viewingMatch.set(null);
  }

  private saveAttendanceHidden() {
    if (!this.seasonId()) return;
    this.matchweekService
      .updateAttendance(this.seasonId()!, this.activeMatchweek(), this.presentPlayerIds())
      .subscribe({
        next: () => {
          // ZMIANA: Usunięto blokadę (this.allSuggestedMatches().length > 0).
          // Teraz po każdej zmianie obecności, jeśli jest min. 4 graczy,
          // system od razu generuje nowe pary.
          if (this.presentPlayerIds().length >= 4) {
            this.generateSuggestions();
          } else {
            // Jeśli spadnie poniżej 4 graczy, czyścimy sugestie
            this.allSuggestedMatches.set([]);
          }
        },
        error: (err) => console.error('Błąd cichego zapisu obecności: ', err),
      });
  }

  // NOWA: Autozapis po zmianie checkboxa
  togglePlayerPresenceAndSave(playerId: string) {
    this.togglePlayerPresence(playerId);
    this.saveAttendanceHidden();
  }

  // NOWA: Autozapis po dodaniu z wyszukiwarki
  addPlayerToAttendanceAndSave(player: any) {
    this.addPlayerToAttendance(player);
    this.saveAttendanceHidden();
  }

  generateSuggestions() {
    if (!this.seasonId()) return;

    this.isSuggesting.set(true);
    this.matchmakingService
      .suggestMatches({
        seasonId: this.seasonId()!,
        matchweek: this.activeMatchweek(),
      })
      .subscribe({
        next: (suggestions) => {
          this.allSuggestedMatches.set(suggestions);
          this.currentSuggestionPage.set(0); // Zawsze resetuj do strony pierwszej
          this.isSuggesting.set(false);
        },
        error: (err) => {
          console.error('Błąd pobierania sugestii', err);
          alert('Nie udało się wygenerować propozycji. Sprawdź konsole.');
          this.isSuggesting.set(false);
        },
      });
  }

  // Funkcja "Pokaż następne" z wytycznych
  nextSuggestions() {
    const maxPage = Math.floor((this.allSuggestedMatches().length - 1) / 3);
    if (this.currentSuggestionPage() < maxPage) {
      this.currentSuggestionPage.update((p) => p + 1);
    } else {
      this.currentSuggestionPage.set(0); // Zapętl do początku, jeśli kliknie na ostatniej stronie
    }
  }

  applySuggestion(suggestion: any) {
    // 1. Czyścimy obecne składy w formularzu
    this.newMatch.homeSide.players = [];
    this.newMatch.awaySide.players = [];

    // 2. Dodajemy wybraną czwórkę (symulując ręczne dodawanie)
    suggestion.homePlayers.forEach((p: any) => {
      this.addPlayerToSide('home', { id: p.playerId, alias: p.alias });
    });

    suggestion.awayPlayers.forEach((p: any) => {
      this.addPlayerToSide('away', { id: p.playerId, alias: p.alias });
    });

    // 3. Wymuszamy odświeżenie UI
    this.matchStateTrigger.update((v) => v + 1);
  }
}
