import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { HeaderService } from '../../core/services/header.service';
import {
  TeamShieldComponent,
  TopElement,
  CenterElement,
} from '../../shared/components/team-shield/team-shield.component';
import { LogoScannerService } from '../../core/services/logo-scanner.service';
import { BadgeShape, PatternType } from '../../core/models/team.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, TeamShieldComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  public adminService = inject(AdminService);
  private headerService = inject(HeaderService);
  private scannerService = inject(LogoScannerService);

  editingId = signal<string | null>(null);
  activeTab = signal<'players' | 'teams'>('players');

  showAddPlayerModal = signal(false);
  showAddTeamModal = signal(false);

  newPlayer = signal({ name: '', alias: '', imageUrl: '' });
  playerSearchTerm = signal('');
  playerCurrentPage = signal(1);
  pageSizePlayers = 10;

  filteredPlayers = computed(() => {
    const term = this.playerSearchTerm().toLowerCase();
    return this.adminService
      .players()
      .filter((p) => p.name.toLowerCase().includes(term) || p.alias.toLowerCase().includes(term));
  });

  paginatedPlayers = computed(() => {
    const start = (this.playerCurrentPage() - 1) * this.pageSizePlayers;
    return this.filteredPlayers().slice(start, start + this.pageSizePlayers);
  });

  totalPlayerPages = computed(() =>
    Math.ceil(this.filteredPlayers().length / this.pageSizePlayers),
  );

  teamSearchTerm = signal('');
  teamCurrentPage = signal(1);
  pageSizeTeams = 10;

  newTeam = signal<{
    name: string;
    alias: string;
    logoUrl: string;
    shapeType: BadgeShape;
    patternType: PatternType;
    topElement: TopElement;
    centerElement: CenterElement;
    primaryColor: string;
    secondaryColor: string;
    tertiaryColor: string;
    quaternaryColor: string;
    quinaryColor: string;
    topElementColor: string;
    centerElementColor: string;
  }>({
    name: '',
    alias: '',
    logoUrl: '',
    shapeType: 'SHIELD',
    patternType: 'SASH',
    topElement: 'NONE',
    centerElement: 'NONE',
    primaryColor: '#B0B0B0',
    secondaryColor: '#CCCCCC',
    tertiaryColor: '#464646',
    quaternaryColor: '#ffffff',
    quinaryColor: '#FFD700',
    topElementColor: '#FFD700',
    centerElementColor: '#FFD700',
  });

  corsError = signal(false);

  // Timer do opóźnienia skanowania (Debounce)
  private logoScanTimeout: any;

  filteredTeams = computed(() => {
    const term = this.teamSearchTerm().toLowerCase();
    return this.adminService
      .teams()
      .filter(
        (t) =>
          t.name.toLowerCase().includes(term) || (t.alias && t.alias.toLowerCase().includes(term)),
      );
  });

  paginatedTeams = computed(() => {
    const start = (this.teamCurrentPage() - 1) * this.pageSizeTeams;
    return this.filteredTeams().slice(start, start + this.pageSizeTeams);
  });

  totalTeamPages = computed(() => Math.ceil(this.filteredTeams().length / this.pageSizeTeams));

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: KeyboardEvent) {
    if (this.showAddPlayerModal()) this.showAddPlayerModal.set(false);
    if (this.showAddTeamModal()) this.showAddTeamModal.set(false);
    if (this.editingId()) this.editingId.set(null);
  }

  ngOnInit() {
    this.headerService.setState({ title: 'Ustawienia' });
    this.adminService.loadPlayers();
    this.adminService.loadTeams();
  }

  isAliasUnique(alias: string, excludeId?: string): boolean {
    return !this.adminService
      .players()
      .some((p) => p.alias.toLowerCase() === alias.toLowerCase() && p.id !== excludeId);
  }

  saveNewPlayer() {
    const p = this.newPlayer();
    if (!p.name || !p.alias) return;
    if (!this.isAliasUnique(p.alias)) {
      alert('BŁĄD: Nazwa gracza jest już zajęta!');
      return;
    }
    this.adminService.addPlayer(p).subscribe(() => {
      this.newPlayer.set({ name: '', alias: '', imageUrl: '' });
      this.showAddPlayerModal.set(false);
    });
  }

  saveNewTeam() {
    const t = this.newTeam();
    if (!t.name) return;

    const payload = {
      name: t.name,
      alias: t.alias || t.name,
      shapeType: t.shapeType,
      patternType: t.patternType,
      topElement: t.topElement,
      centerElement: t.centerElement,
      primaryColor: t.primaryColor,
      secondaryColor: t.secondaryColor,
      tertiaryColor: t.tertiaryColor,
      quaternaryColor: t.quaternaryColor,
      quinaryColor: t.quinaryColor,
      topElementColor: t.topElementColor,
      centerElementColor: t.centerElementColor,
    };

    this.adminService.addTeam(payload).subscribe(() => {
      this.newTeam.set({
        name: '',
        alias: '',
        logoUrl: '',
        shapeType: 'SHIELD',
        patternType: 'SASH',
        topElement: 'NONE',
        centerElement: 'NONE',
        primaryColor: '#B0B0B0',
        secondaryColor: '#CCCCCC',
        tertiaryColor: '#464646',
        quaternaryColor: '#ffffff',
        quinaryColor: '#FFD700',
        topElementColor: '#FFD700',
        centerElementColor: '#FFD700',
      });
      this.corsError.set(false);
      this.showAddTeamModal.set(false);
    });
  }

  // --- NOWA METODA NASŁUCHUJĄCA ZMIAN W POLU URL ---
  onLogoUrlChange(url: string) {
    this.newTeam.update((t) => ({ ...t, logoUrl: url }));

    // Anulujemy poprzedni timer jeśli użytkownik nadal wpisuje/wkleja
    clearTimeout(this.logoScanTimeout);

    // Ustawiamy nowy timer (150ms to niezauważalne opóźnienie dla oka, ale ratujące wydajność)
    this.logoScanTimeout = setTimeout(() => {
      if (url && url.length > 5) {
        this.analyzeLogoUrl();
      }
    }, 150);
  }

  async analyzeLogoUrl() {
    const url = this.newTeam().logoUrl;
    if (!url) return;
    this.corsError.set(false);

    try {
      const result = await this.scannerService.scanImage(url);
      this.newTeam.update((t) => ({
        ...t,
        ...result,
        topElementColor: result.quinaryColor,
        centerElementColor: result.quinaryColor,
      }));
    } catch (e) {
      console.warn(e);
      this.corsError.set(true);
    }
  }

  updateNewTeamColor(
    key:
      | 'primaryColor'
      | 'secondaryColor'
      | 'tertiaryColor'
      | 'quaternaryColor'
      | 'quinaryColor'
      | 'topElementColor'
      | 'centerElementColor',
    event: any,
  ) {
    const value = typeof event === 'string' ? event : event?.target?.value;
    if (value) this.newTeam.update((t) => ({ ...t, [key]: value }));
  }

  shuffleColors() {
    this.newTeam.update((t) => ({
      ...t,
      primaryColor: t.secondaryColor,
      secondaryColor: t.tertiaryColor,
      tertiaryColor: t.quaternaryColor,
      quaternaryColor: t.quinaryColor,
      quinaryColor: t.primaryColor,
    }));
  }

  goToPage(event: any, type: 'team' | 'player') {
    const target = parseInt(event.target.value, 10);
    if (type === 'team') {
      if (!isNaN(target) && target >= 1 && target <= this.totalTeamPages())
        this.teamCurrentPage.set(target);
      else event.target.value = this.teamCurrentPage();
    } else {
      if (!isNaN(target) && target >= 1 && target <= this.totalPlayerPages())
        this.playerCurrentPage.set(target);
      else event.target.value = this.playerCurrentPage();
    }
  }

  saveEdit(item: any, type: 'team' | 'player') {
    if (type === 'player' && !this.isAliasUnique(item.alias, item.id)) {
      alert('BŁĄD: Ten alias jest już używany!');
      return;
    }
    if (type === 'team') {
      this.adminService.updateTeam(item).subscribe(() => this.editingId.set(null));
    } else {
      this.adminService.updatePlayer(item).subscribe(() => this.editingId.set(null));
    }
  }

  deletePlayer(id: string) {
    if (confirm('⚠️ Czy na pewno chcesz usunąć gracza?')) {
      this.adminService.deletePlayer(id).subscribe({
        next: () => {
          alert('✅ Gracz został usunięty.');
          this.adminService.loadPlayers();
        },
        error: (err) =>
          alert('🚫 Błąd: ' + (typeof err.error === 'string' ? err.error : 'Błąd usuwania')),
      });
    }
  }

  handleImageError(team: any) {
    team.logoUrl = null;
  }

  copyToClipboard(text: string | undefined | null) {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .catch((err) => console.error('Błąd kopiowania do schowka', err));
  }
}
