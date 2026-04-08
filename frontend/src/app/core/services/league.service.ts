import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { League } from '../models/league.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LeagueService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/leagues`;

  getLeagues() {
    return this.http.get<League[]>(this.apiUrl);
  }

  createLeague(leagueData: Partial<League>) {
    return this.http.post<League>(this.apiUrl, leagueData);
  }
}
