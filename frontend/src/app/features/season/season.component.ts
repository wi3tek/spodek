import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { QRCodeComponent } from 'angularx-qrcode';

// Komponenty i Serwisy
import { SeasonService } from '../../core/services/season.service';
import { MatchService } from '../../core/services/match.service';
import { AdminService } from '../../core/services/admin.service';
import { MatchweekService } from '../../core/services/matchweek.service';
import { MatchmakingService } from '../../core/services/matchmaking.service';
import { LiveService } from '../../core/services/live.service';
import { FifaLoaderComponent } from '../../shared/components/fifa-loader/fifa-loader.component';
import { StatsComponent } from '../stats/stats.component';
import { TeamStatsComponent } from '../team-stats/team-stats.component';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { PlayerAvatarComponent } from '../../shared/components/player-avatar/player-avatar.component';

@Component({
  selector: 'app-season',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FifaLoaderComponent,
    StatsComponent,
    TeamStatsComponent,
    HeaderComponent,
    PlayerAvatarComponent,
    QRCodeComponent,
  ],
  templateUrl: './season.component.html',
  styleUrls: ['./season.component.scss'],
})
export class SeasonComponent implements OnInit, OnDestroy {
  // --- INJEKCJE SERWISÓW ---
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private matchService = inject(MatchService);
  private seasonService = inject(SeasonService);
  private adminService = inject(AdminService);
  private matchweekService = inject(MatchweekService);
  private matchmakingService = inject(MatchmakingService);
  private liveService = inject(LiveService);

  // --- WŁAŚCIWOŚCI I SYGNAŁY ---
  private liveSubscription?: Subscription;
  private matchweekSubject = new Subject<number>();

  seasonId = signal<string | null>(null);
  season = signal<any>(null);
  matches = signal<any[]>([]);
  allPlayers = signal<any[]>([]);
  allTeams = signal<any[]>([]);
  tableData = signal<any[]>([]);
  today = new Date();
  isReadOnly = signal<boolean>(false);
  statsRefreshTrigger = signal(0);
  matchStateTrigger = signal(0);

  // Formularz meczu
  showMatchForm = signal(false);
  editingMatch = signal<any | null>(null);
  searchHomeTeam = signal('');
  searchAwayTeam = signal('');
  searchPlayerQuery = signal('');
  newCommentText = signal('');

  // Stan obecności i matchmakingu
  showAttendanceModal = signal(false);
  activeMatchweek = signal<number>(1);
  presentPlayerIds = signal<string[]>([]);
  visibleInModalIds = signal<string[]>([]);
  searchNewPlayerQuery = signal('');

  // --- STANY WIDOCZNOŚCI DROPDOWNÓW (Nowe) ---
  showHomeTeamDropdown = signal(false);
  showAwayTeamDropdown = signal(false);
  showHomePlayerDropdown = signal(false);
  showAwayPlayerDropdown = signal(false);
  showAttendanceDropdown = signal(false);

  // --- ZMIENNE WYSZUKIWANIA GRACZY ---
  searchHomePlayerQuery = signal('');
  searchAwayPlayerQuery = signal('');

  // --- KLAWIATURA I NAWIGACJA ---
  activeHomeTeamIndex = signal(-1);
  activeAwayTeamIndex = signal(-1);
  activeAttendanceIndex = signal(-1);
  activeHomePlayerIndex = signal(-1);
  activeAwayPlayerIndex = signal(-1);

  isLoadingAttendance = signal(false);

  // Sugestie
  allSuggestedMatches = signal<any[]>([]);
  currentSuggestionPage = signal(0);
  isSuggesting = signal(false);

  // UI State
  linkCopied = signal(false);
  activeTooltip = signal<string | null>(null);
  sortKey = signal<string>('winRatio');
  sortDirection = signal<'asc' | 'desc'>('desc');
  currentPage = signal(1);
  pageSize = 7;
  viewingMatch = signal<any | null>(null);
  filterByMinMatches = signal<boolean>(false);
  showSeasonDetailsModal = signal<boolean>(false);

  newMatch: any = {
    matchweek: 1,
    homeSide: { teamId: '', assetId: '', teamName: '', goals: 0, players: [] },
    awaySide: { teamId: '', assetId: '', teamName: '', goals: 0, players: [] },
    finished: false,
    comments: [],
  };

  protected readonly Math = Math;

  // --- COMPUTED VALUES ---
  suggestedMatches = computed(() => {
    const start = this.currentSuggestionPage() * 3;
    return this.allSuggestedMatches().slice(start, start + 3);
  });

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

  modalDisplayPlayers = computed(() => {
    const visibleIds = this.visibleInModalIds();
    const presentIds = this.presentPlayerIds();
    const lockedIds = this.playersWithMatchesInWeek();
    const unsortedPlayers = this.allPlayers().filter((p) => visibleIds.includes(p.id));

    return unsortedPlayers.sort((a, b) => {
      const isALocked = lockedIds.includes(a.id);
      const isBLocked = lockedIds.includes(b.id);
      const isAPresent = presentIds.includes(a.id);
      const isBPresent = presentIds.includes(b.id);

      if (isALocked !== isBLocked) return isALocked ? -1 : 1;
      if (isAPresent !== isBPresent) return isAPresent ? -1 : 1;
      return a.alias.localeCompare(b.alias);
    });
  });

  liveUrl = computed(() => {
    const code = this.season()?.liveCode;
    return code ? `${window.location.origin}/live/${code}` : '';
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

  homePlayerSuggestions = computed(() => {
    const query = this.searchHomePlayerQuery().toLowerCase();
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

  awayPlayerSuggestions = computed(() => {
    const query = this.searchAwayPlayerQuery().toLowerCase();
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

  minAllowedMatchweek = computed(() => {
    const m = this.matches();
    return m.length === 0 ? 1 : Math.max(...m.map((match) => match.matchweek));
  });

  maxAllowedMatchweek = computed(() => {
    const m = this.matches();
    return m.length === 0 ? 1 : Math.max(...m.map((match) => match.matchweek)) + 1;
  });

  paginatedMatches = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize;
    return this.matches().slice(startIndex, startIndex + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.matches().length / this.pageSize));

  sortedTable = computed(() => {
    let data = [...this.tableData()];
    const key = this.sortKey();
    const dir = this.sortDirection();
    const currentSeason = this.season();

    if (this.filterByMinMatches() && currentSeason?.minPlayerMatchAmount) {
      data = data.filter((row) => row.matchesPlayed >= currentSeason.minPlayerMatchAmount);
    }

    return data.sort((a, b) => {
      let valA = a[key];
      let valB = b[key];
      if (valA === valB) return b.points - a.points;
      return dir === 'asc' ? valA - valB : valB - valA;
    });
  });

  // GETTERS DLA BRAMEK I ASYST
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

  // --- KONSTRUKTOR I CYKL ŻYCIA ---
  constructor() {
    this.matchweekSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe((newWeek) => {
      this.loadAttendanceForWeek(newWeek);
    });
  }

  ngOnInit() {
    const codeParam = this.route.snapshot.paramMap.get('code');
    const id = this.route.snapshot.paramMap.get('id');

    if (codeParam) {
      this.isReadOnly.set(true);
      this.loadPublicData(codeParam);
    } else if (id) {
      this.isReadOnly.set(false);
      this.seasonId.set(id);
      this.loadSeasonData(id);
      this.loadInitialData();
    }
  }

  ngOnDestroy() {
    if (this.liveSubscription) {
      this.liveSubscription.unsubscribe();
    }
  }

  // --- UKRYWANIE DROPDOWNÓW (Kliknięcie na zewnątrz) ---
  hideDropdown(type: 'homeTeam' | 'awayTeam' | 'homePlayer' | 'awayPlayer' | 'attendance') {
    // Timeout pozwala na zarejestrowanie kliknięcia z listy (mousedown) zanim element zniknie
    setTimeout(() => {
      if (type === 'homeTeam') this.showHomeTeamDropdown.set(false);
      else if (type === 'awayTeam') this.showAwayTeamDropdown.set(false);
      else if (type === 'homePlayer') this.showHomePlayerDropdown.set(false);
      else if (type === 'awayPlayer') this.showAwayPlayerDropdown.set(false);
      else if (type === 'attendance') this.showAttendanceDropdown.set(false);
    }, 200);
  }

  // --- NASŁUCHIWANIE I TOOLTIPY ---
  @HostListener('document:click', ['$event'])
  onDocumentClick() {
    this.activeTooltip.set(null);
  }

  toggleTooltip(id: string, side: 'home' | 'away', event: Event) {
    event.stopPropagation();
    const key = `${id}-${side}`;
    this.activeTooltip.set(this.activeTooltip() === key ? null : key);
  }

  getFullTeamDetails(teamId: string, fallbackName: string) {
    if (!teamId) return { name: fallbackName, alias: null };
    const team = this.allTeams().find((t) => t.id === teamId);
    return { name: team?.name || fallbackName, alias: team?.alias || null };
  }

  // --- ŁADOWANIE DANYCH ---
  private loadPublicData(code: string) {
    this.liveService.getLiveResults(code).subscribe({
      next: (res) => this.applyLiveUpdate(res),
      error: (err) => console.error('Błąd inicjalnego pobierania Live:', err),
    });

    this.liveSubscription = this.liveService.streamLiveResults(code).subscribe({
      next: (res) => this.applyLiveUpdate(res),
      error: (err) => console.error('Błąd strumienia read only:', err),
    });
  }

  private applyLiveUpdate(res: any) {
    this.season.set(res.season);
    this.seasonId.set(res.season.id);
    this.initFilterToggle(res.season.status); // <--- DODANO
    const sorted = res.matches.sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    this.matches.set(sorted);
    this.tableData.set(res.table);
    this.statsRefreshTrigger.update((v) => v + 1);
  }

  loadInitialData() {
    this.adminService.getPlayers().subscribe((p) => this.allPlayers.set(p));
    this.adminService.getTeams().subscribe((t) => this.allTeams.set(t));
  }

  loadSeasonData(id: string) {
    this.seasonService.getSeasonById(id).subscribe((s) => {
      this.season.set(s);
      this.initFilterToggle(s.status); // <--- DODANO
    });
    this.matchService.getMatchesBySeason(id).subscribe((m) => {
      const sorted = m.sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      this.matches.set(sorted);
      if (sorted.length > 0) this.activeMatchweek.set(sorted[0].matchweek);
    });

    this.seasonService.getSeasonTable(id).subscribe({
      next: (table) => this.tableData.set(table),
      error: (err) => console.error('Błąd pobierania tabeli:', err),
    });
  }

  // --- AKCJE UI I UDOSTĘPNIANIE ---
  copyLiveLink() {
    navigator.clipboard.writeText(this.liveUrl()).then(() => {
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2000);
    });
  }

  onWeekChange(newWeek: number) {
    const max = this.maxAllowedMatchweek();
    const min = this.minAllowedMatchweek();
    let validWeek = newWeek;

    if (newWeek > max) {
      alert(
        `Błąd! Nie możesz przeskoczyć do kolejki ${newWeek}. Najpierw rozegraj kolejkę ${max - 1}.`,
      );
      validWeek = max;
    } else if (newWeek < min) {
      alert(
        `Błąd! Kolejka ${newWeek} jest już zamknięta. Możesz zarządzać obecnością tylko dla bieżącej (${min}) lub nowej (${max}) kolejki.`,
      );
      validWeek = min;
    } else if (!newWeek) {
      validWeek = min;
    }

    this.activeMatchweek.set(validWeek);
    this.isLoadingAttendance.set(true);
    this.matchweekSubject.next(validWeek);
  }

  // --- OBECNOŚCI ---
  loadAttendanceForWeek(week: number) {
    if (!this.seasonId()) return;
    this.isLoadingAttendance.set(true);

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

        this.visibleInModalIds.set(
          Array.from(new Set([...backendPresent, ...Array.from(playedIds)])),
        );
        this.isLoadingAttendance.set(false);
      },
      error: (err) => {
        console.error('Błąd pobierania obecności', err);
        this.isLoadingAttendance.set(false);
      },
    });
  }

  togglePlayerPresence(playerId: string) {
    const current = this.presentPlayerIds();
    if (current.includes(playerId)) {
      this.presentPlayerIds.set(current.filter((id) => id !== playerId));
    } else {
      this.presentPlayerIds.set([...current, playerId]);
    }
  }

  addPlayerToAttendance(player: any) {
    const currentVisible = this.visibleInModalIds();
    if (!currentVisible.includes(player.id))
      this.visibleInModalIds.set([...currentVisible, player.id]);
    const currentPresent = this.presentPlayerIds();
    if (!currentPresent.includes(player.id))
      this.presentPlayerIds.set([...currentPresent, player.id]);
    this.searchNewPlayerQuery.set('');
  }

  private saveAttendanceHidden() {
    if (!this.seasonId()) return;
    this.matchweekService
      .updateAttendance(this.seasonId()!, this.activeMatchweek(), this.presentPlayerIds())
      .subscribe({
        next: () => {
          if (this.presentPlayerIds().length >= 4) this.generateSuggestions();
          else this.allSuggestedMatches.set([]);
        },
        error: (err) => console.error('Błąd cichego zapisu obecności: ', err),
      });
  }

  togglePlayerPresenceAndSave(playerId: string) {
    this.togglePlayerPresence(playerId);
    this.saveAttendanceHidden();
  }

  addPlayerToAttendanceAndSave(player: any) {
    this.addPlayerToAttendance(player);
    this.saveAttendanceHidden();
  }

  // --- ZARZĄDZANIE FORMULARZEM MECZU ---
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

    side === 'home' ? this.searchHomeTeam.set('') : this.searchAwayTeam.set('');
    this.matchStateTrigger.update((v) => v + 1);
  }

  clearTeam(side: 'home' | 'away') {
    const targetSide = side === 'home' ? this.newMatch.homeSide : this.newMatch.awaySide;
    targetSide.teamId = '';
    targetSide.assetId = '';
    targetSide.teamName = '';
    this.matchStateTrigger.update((v) => v + 1);
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
    this.allSuggestedMatches.set([]);
    this.currentSuggestionPage.set(0);
    this.loadAttendanceForWeek(this.activeMatchweek());
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  }

  editMatch(match: any) {
    if (match.finished) return;
    this.editingMatch.set(match);
    this.newMatch = JSON.parse(JSON.stringify(match));
    this.searchHomeTeam.set(match.homeSide.teamName || '');
    this.searchAwayTeam.set(match.awaySide.teamName || '');
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
      matchweek: this.activeMatchweek(),
      homeSide: { assetId: '', goals: 0, players: [] },
      awaySide: { assetId: '', goals: 0, players: [] },
      finished: false,
      comments: [],
    };
  }

  saveFullMatch() {
    if (!this.isFormValid()) return;
    if (this.homeAssists > this.homeGoals) return alert(`BŁĄD GOSPODARZY: Zbyt dużo asyst!`);
    if (this.awayAssists > this.awayGoals) return alert(`BŁĄD GOŚCI: Zbyt dużo asyst!`);

    this.newMatch.homeSide.goals = this.homeGoals;
    this.newMatch.awaySide.goals = this.awayGoals;
    this.newMatch.matchweek = this.activeMatchweek();

    const payload = {
      ...this.newMatch,
      seasonId: this.seasonId(),
      comments: this.newMatch.comments || [],
    };

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

  // --- OBSŁUGA KLAWIATURY DLA DRUŻYN ---
  onTeamKeyDown(event: KeyboardEvent, side: 'home' | 'away') {
    const suggestions = side === 'home' ? this.homeTeamSuggestions() : this.awayTeamSuggestions();
    const activeIndex = side === 'home' ? this.activeHomeTeamIndex : this.activeAwayTeamIndex;

    if (suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex.update((i) => (i < suggestions.length - 1 ? i + 1 : i));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex.update((i) => (i > 0 ? i - 1 : 0));
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      if (activeIndex() >= 0 && activeIndex() < suggestions.length) {
        event.preventDefault();
        this.selectTeam(side, suggestions[activeIndex()]);
        activeIndex.set(-1);
        if (side === 'home') this.showHomeTeamDropdown.set(false);
        if (side === 'away') this.showAwayTeamDropdown.set(false);
      }
    }
  }

  // --- OBSŁUGA KLAWIATURY DLA OBECNOŚCI ---
  onAttendanceKeyDown(event: KeyboardEvent) {
    const suggestions = this.attendanceSuggestions();
    if (suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeAttendanceIndex.update((i) => (i < suggestions.length - 1 ? i + 1 : i));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeAttendanceIndex.update((i) => (i > 0 ? i - 1 : 0));
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      if (this.activeAttendanceIndex() >= 0 && this.activeAttendanceIndex() < suggestions.length) {
        event.preventDefault();
        this.addPlayerToAttendanceAndSave(suggestions[this.activeAttendanceIndex()]);
        this.activeAttendanceIndex.set(-1);
        this.searchNewPlayerQuery.set('');
        this.showAttendanceDropdown.set(false);
      }
    }
  }

  // --- OBSŁUGA KLAWIATURY DLA WYBORU GRACZA ---
  onPlayerKeyDown(event: KeyboardEvent, side: 'home' | 'away') {
    const suggestions =
      side === 'home' ? this.homePlayerSuggestions() : this.awayPlayerSuggestions();
    const activeIndex = side === 'home' ? this.activeHomePlayerIndex : this.activeAwayPlayerIndex;

    if (suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex.update((i) => (i < suggestions.length - 1 ? i + 1 : i));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex.update((i) => (i > 0 ? i - 1 : 0));
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      if (activeIndex() >= 0 && activeIndex() < suggestions.length) {
        event.preventDefault();
        this.addPlayerToSide(side, suggestions[activeIndex()]);
        activeIndex.set(-1);
        if (side === 'home') {
          this.searchHomePlayerQuery.set('');
          this.showHomePlayerDropdown.set(false);
        } else {
          this.searchAwayPlayerQuery.set('');
          this.showAwayPlayerDropdown.set(false);
        }
      }
    }
  }

  // --- KOMENTARZE ---
  addComment(event?: Event) {
    if (event) {
      event.preventDefault(); // Blokuje przejście do nowej linii (Enter) w textarea
    }
    const text = this.newCommentText().trim();
    if (text) {
      if (!this.newMatch.comments) this.newMatch.comments = [];
      this.newMatch.comments.push(text);
      this.newCommentText.set('');
    }
  }

  removeComment(idx: number) {
    this.newMatch.comments.splice(idx, 1);
  }

  // --- SUGESTIE MECZÓW ---
  generateSuggestions() {
    if (!this.seasonId()) return;
    this.isSuggesting.set(true);
    this.matchmakingService
      .suggestMatches({ seasonId: this.seasonId()!, matchweek: this.activeMatchweek() })
      .subscribe({
        next: (suggestions) => {
          this.allSuggestedMatches.set(suggestions);
          this.currentSuggestionPage.set(0);
          this.isSuggesting.set(false);
        },
        error: (err) => {
          console.error('Błąd pobierania sugestii', err);
          alert('Nie udało się wygenerować propozycji.');
          this.isSuggesting.set(false);
        },
      });
  }

  nextSuggestions() {
    const maxPage = Math.floor((this.allSuggestedMatches().length - 1) / 3);
    if (this.currentSuggestionPage() < maxPage) this.currentSuggestionPage.update((p) => p + 1);
    else this.currentSuggestionPage.set(0);
  }

  applySuggestion(suggestion: any) {
    this.newMatch.homeSide.players = [];
    this.newMatch.awaySide.players = [];
    suggestion.homePlayers.forEach((p: any) =>
      this.addPlayerToSide('home', { id: p.playerId, alias: p.alias }),
    );
    suggestion.awayPlayers.forEach((p: any) =>
      this.addPlayerToSide('away', { id: p.playerId, alias: p.alias }),
    );
    this.matchStateTrigger.update((v) => v + 1);

    setTimeout(() => {
      const formElement = document.querySelector('.match-form-layout');
      if (formElement) {
        const headerOffset = 100;
        const offsetPosition =
          formElement.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }, 60);
  }

  // --- NARZĘDZIA POMOCNICZE ---
  selectContent(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    if (input) input.select();
  }

  toggleSort(key: string) {
    if (this.sortKey() === key)
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    else {
      this.sortKey.set(key);
      this.sortDirection.set('desc');
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update((p) => p + 1);
  }
  prevPage() {
    if (this.currentPage() > 1) this.currentPage.update((p) => p - 1);
  }

  viewMatchDetails(match: any) {
    this.viewingMatch.set(match);
  }
  closeMatchDetails() {
    this.viewingMatch.set(null);
  }

  private initFilterToggle(status: string) {
    if( status === 'FINISHED') {
      this.filterByMinMatches.set(true)
      this.onFilterToggleChange(true)
      return;
    }

    const saved = localStorage.getItem('season_table_filter');
    if (saved !== null) {
      this.filterByMinMatches.set(saved === 'true');
    } else {
      // Domyślnie włączone dla zakończonych sezonów
      this.filterByMinMatches.set(status === 'FINISHED');
    }
  }

  onFilterToggleChange(val: boolean) {
    this.filterByMinMatches.set(val);
    localStorage.setItem('season_table_filter', String(val));
  }
}
