import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {Player} from '../models/player.model';
import {Team} from '../models/team.model';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private playersUrl = `${environment.apiUrl}/players`;
  private teamsUrl = `${environment.apiUrl}/teams`;

  // Sygnały przechowujące stan - AdminComponent z nich korzysta
  players = signal<any[]>([]);
  teams = signal<any[]>([]);

  // --- GRACZE ---

  loadPlayers() {
    this.http.get<any[]>(this.playersUrl).subscribe(data => {
      this.players.set(data);
    });
  }

  // Używamy tap(), aby po sukcesie na serwerze odświeżyć lokalną listę (cache UI)
  addPlayer(player: any): Observable<any> {
    return this.http.post(this.playersUrl, player).pipe(
      tap(() => this.loadPlayers())
    );
  }

  updatePlayer(player: any): Observable<any> {
    return this.http.put(`${this.playersUrl}/${player.id}`, player).pipe(
      tap(() => this.loadPlayers())
    );
  }

  // Metody dla formularza meczowego (v2)
  getPlayers(): Observable<any[]> {
    return this.http.get<any[]>(this.playersUrl);
  }

  // --- DRUŻYNY ---

  loadTeams() {
    this.http.get<any[]>(this.teamsUrl).subscribe(data => {
      this.teams.set(data);
    });
  }

  updateTeam(team: any): Observable<any> {
    return this.http.put(`${this.teamsUrl}/${team.id}`, team).pipe(
      tap(() => this.loadTeams())
    );
  }

  getTeams(): Observable<any[]> {
    return this.http.get<any[]>(this.teamsUrl);
  }

  deletePlayer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.playersUrl}/${id}`);
  }
}
