import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {Player} from '../models/player.model';
import {Team} from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Sygnały - serce reaktywności Angulara 19/21
  players = signal<Player[]>([]);
  teams = signal<Team[]>([]);

  // --- OBSŁUGA GRACZY ---
  loadPlayers() {
    this.http.get<Player[]>(`${this.apiUrl}/players`).subscribe(data => this.players.set(data));
  }

  addPlayer(player: Partial<Player>) {
    return this.http.post<Player>(`${this.apiUrl}/players`, player);
  }

  updatePlayer(player: Player) {
    return this.http.put<Player>(`${this.apiUrl}/players/${player.id}`, player);
  }

  // --- OBSŁUGA DRUŻYN ---
  loadTeams() {
    this.http.get<Team[]>(`${this.apiUrl}/teams`).subscribe(data => this.teams.set(data));
  }

  updateTeam(team: Team) {
    return this.http.put<Team>(`${this.apiUrl}/teams/${team.id}`, team);
  }
}
