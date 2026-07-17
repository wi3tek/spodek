import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  public adminService = inject(AdminService);

  // --- STAN GLOBALNY ---
  editingId = signal<string | null>(null);
  activeTab = signal<'players' | 'teams'>('players'); // NOWE: Zakładki

  // --- SEKCJA: GRACZE ---
  newPlayer = signal({ name: '', alias: '', imageUrl: '' }); // NOWE: dodano imageUrl
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

  // --- SEKCJA: DRUŻYNY ---
  teamSearchTerm = signal('');
  teamCurrentPage = signal(1);
  pageSizeTeams = 10;

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

  ngOnInit() {
    this.adminService.loadPlayers();
    this.adminService.loadTeams();
  }

  // --- LOGIKA GRACZY ---
  isAliasUnique(alias: string, excludeId?: string): boolean {
    return !this.adminService
      .players()
      .some((p) => p.alias.toLowerCase() === alias.toLowerCase() && p.id !== excludeId);
  }

  saveNewPlayer() {
    const p = this.newPlayer();

    const payload = {
      name: p.name,
      alias: p.alias,
      imageUrl: p.imageUrl,
    };

    if (!payload.name || !payload.alias) return;

    if (!this.isAliasUnique(payload.alias)) {
      alert('BŁĄD: Nazwa gracza "' + payload.alias + '" jest już zajęta!');
      return;
    }

    this.adminService.addPlayer(payload).subscribe(() => {
      this.adminService.loadPlayers();
      // Czyszczenie formularza wraz z linkiem do avatara
      this.newPlayer.set({ name: '', alias: '', imageUrl: '' });
    });
  }

  // --- OBSŁUGA STRONICOWANIA (GENERYCZNA) ---
  goToPage(event: any, type: 'team' | 'player') {
    const target = parseInt(event.target.value, 10);
    if (type === 'team') {
      if (!isNaN(target) && target >= 1 && target <= this.totalTeamPages()) {
        this.teamCurrentPage.set(target);
      } else {
        event.target.value = this.teamCurrentPage();
      }
    } else {
      if (!isNaN(target) && target >= 1 && target <= this.totalPlayerPages()) {
        this.playerCurrentPage.set(target);
      } else {
        event.target.value = this.playerCurrentPage();
      }
    }
  }

  // --- ZAPIS EDYCJI ---
  saveEdit(item: any, type: 'team' | 'player') {
    if (type === 'player' && !this.isAliasUnique(item.alias, item.id)) {
      alert('BŁĄD: Ten alias jest już używany przez innego gracza!');
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
        error: (err) => {
          // Jeśli backend wysłał IllegalStateException, komunikat będzie tutaj
          const msg =
            typeof err.error === 'string'
              ? err.error
              : 'Nie można usunąć gracza (prawdopodobnie grał już w meczach).';
          alert('🚫 Błąd: ' + msg);
        },
      });
    }
  }
}
