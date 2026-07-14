import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {HttpClient} from '@angular/common/http';

export interface Matchweek {
  id?: string;
  seasonId: string;
  matchweek: number;
  presentPlayerIds: string[];
  finished: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MatchweekService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/matchweeks`;

  getMatchweek(seasonId: string, matchweek: number): Observable<Matchweek> {
    return this.http.get<Matchweek>(`${this.apiUrl}/${seasonId}/${matchweek}`);
  }

  updateAttendance(seasonId: string, matchweek: number, presentPlayerIds: string[]): Observable<Matchweek> {
    return this.http.put<Matchweek>(`${this.apiUrl}/${seasonId}/${matchweek}/attendance`, presentPlayerIds);
  }
}
