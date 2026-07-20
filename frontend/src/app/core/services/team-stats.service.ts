import { Injectable, inject, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TeamStatEntry {
  teamId: string;
  alias: string;
  assetId: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  winRatio: number;
  avgScored: number;
  avgConceded: number;
}

export interface TeamMapPoint {
  teamId: string;
  alias: string;
  assetId: number;
  lat: number;
  lng: number;
}

export interface TeamLeaderboards {
  highestWinRatio: TeamStatEntry[];
  lowestWinRatio: TeamStatEntry[];
  highestAvgScored: TeamStatEntry[];
  highestAvgConceded: TeamStatEntry[];
  lowestAvgConceded: TeamStatEntry[];
  mostDraws: TeamStatEntry[];
  mostPlayed: TeamStatEntry[];
}

export interface TeamStatsResponse {
  leaderboards: TeamLeaderboards;
  mapPoints: TeamMapPoint[];
}

@Injectable({ providedIn: 'root' })
export class TeamStatsService {
  private http = inject(HttpClient);

  // Zmienione parametry - komponent poda nam, czy jest na widoku live
  getStats(leagueId: string, seasonId: string, isReadOnly: boolean): Observable<TeamStatsResponse> {
    const endpoint = isReadOnly ? 'public/team-stats' : 'team-stats';
    return this.http.get<TeamStatsResponse>(
      `${environment.apiUrl}/${endpoint}/${leagueId}?seasonId=${seasonId}`,
    );
  }
}
