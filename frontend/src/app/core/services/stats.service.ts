import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
export interface FunFact {
  title: string;
  description: string;
  icon: string;
  items: FunFactItem[]; // NOWE POLE
}

export interface PlayerForm {
  playerId: string;
  alias: string;
  lastMatches: string[];
  currentElo: number;
  maxElo: number; // NOWE
  maxEloDate: string; // NOWE
  minElo: number; // NOWE
  minEloDate: string; // NOWE
}

export interface Relation {
  opponentOrPartnerAlias: string;
  matches: number;
  wins: number;
  draws: number; // NOWE
  losses: number; // NOWE
  goalsScoredForTeam: number;
  goalsLostForTeam: number;
}

export interface PlayerRelations {
  playerId: string;
  alias: string;
  playedWith: Relation[];
  playedAgainst: Relation[];
}

// ----------------------------------------------------
// NOWE INTERFEJSY DO WYKRESU ELO (Rozwiązanie błędu)
// ----------------------------------------------------
export interface EloPoint {
  date: string;
  elo: number;
}

export interface EloChartLine {
  alias: string;
  history: EloPoint[];
}

export interface LeaderboardEntry {
  alias: string;
  value: number;
}

export interface Leaderboards {
  topScorers: LeaderboardEntry[];
  topAssists: LeaderboardEntry[];
  yellowCards: LeaderboardEntry[];
  redCards: LeaderboardEntry[];
}

export interface FavoriteTeam {
  teamName: string;
  assetId: number;
  matches: number;
  wins: number;
  goalsScored: number;
  goalsConceded: number; // NOWE POLE
}

export interface PlayerRelations {
  playerId: string;
  alias: string;
  playedWith: Relation[];
  playedAgainst: Relation[];
  favoriteTeams: FavoriteTeam[]; // NOWE
}

export interface FunFactItem {
  label: string;
  value: string;
}

// ----------------------------------------------------
// JEDNA WŁAŚCIWA WERSJA STATS RESPONSE:
// ----------------------------------------------------
export interface StatsResponse {
  forms: PlayerForm[];
  eloChart: EloChartLine[];
  relations: PlayerRelations[];
  funFacts: FunFact[];
  leaderboards: Leaderboards;
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/stats`;

  getStats(leagueId: string, seasonId: string): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.apiUrl}/${leagueId}?seasonId=${seasonId}`);
  }
}
