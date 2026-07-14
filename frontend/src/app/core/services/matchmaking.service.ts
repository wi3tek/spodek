import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MatchmakingRequest {
  seasonId: string;
  matchweek: number;
}

export interface PlayerInfo {
  playerId: string;
  alias: string;
  currentElo: number;
  matchesPlayedToday: number;
}

export interface Suggestion {
  homePlayers: PlayerInfo[];
  awayPlayers: PlayerInfo[];
  matchScore: number;
  matchReason: string;
}

@Injectable({
  providedIn: 'root',
})
export class MatchmakingService {
  private http = inject(HttpClient);
  // ZMIANA: Ścieżka dopasowana do zaktualizowanego kontrolera
  private apiUrl = `${environment.apiUrl}/matchmaking`;

  suggestMatches(request: MatchmakingRequest): Observable<Suggestion[]> {
    // ZMIANA: Usunięte ręczne nagłówki - zostawiamy to Interceptorowi!
    return this.http.post<Suggestion[]>(`${this.apiUrl}/suggest`, request);
  }
}
