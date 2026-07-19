import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Season } from '../models/season.model';
import { SeasonTableEntry } from '../models/season-table-entry-model';
import { Match } from '../models/match.model';

export interface LiveResponse {
  season: Season;
  matches: Match[];
  table: SeasonTableEntry[];
}

@Injectable({
  providedIn: 'root',
})
export class LiveService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/public`; // Zwróć uwagę na ścieżkę /api/seasons

  getLiveResults(seasonCode: string): Observable<LiveResponse> {
    return this.http.get<LiveResponse>(`${this.apiUrl}/live/${seasonCode}`);
  }
}
