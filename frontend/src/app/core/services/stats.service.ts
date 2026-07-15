import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FunFact {
  title: string;
  description: string;
  icon: string;
}

export interface PlayerForm {
  playerId: string;
  alias: string;
  lastMatches: string[];
  currentElo: number;
}

export interface Relation {
  opponentOrPartnerAlias: string;
  matches: number;
  wins: number;
  goalsScoredForTeam: number;
  goalsLostForTeam: number;
}

export interface PlayerRelations {
  playerId: string;
  alias: string;
  playedWith: Relation[];
  playedAgainst: Relation[];
}

export interface ScopeStats {
  forms: PlayerForm[];
  eloChart: any[]; // Wykres możemy rozbudować później
  relations: PlayerRelations[];
  funFacts: FunFact[];
}

export interface StatsResponse {
  season: ScopeStats;
  league: ScopeStats;
}

export interface StatsResponse {
  forms: PlayerForm[];
  eloChart: any[];
  relations: PlayerRelations[];
  funFacts: FunFact[];
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/stats`;

  getStats(leagueId: string): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.apiUrl}/${leagueId}`);
  }
}
