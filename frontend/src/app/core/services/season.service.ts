import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Season } from '../models/season.model';
import {SeasonTableEntry} from '../models/season-table-entry-model';

@Injectable({
  providedIn: 'root'
})
export class SeasonService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/seasons`; // Zwróć uwagę na ścieżkę /api/seasons

  // Pobierz wszystkie sezony przypisane do konkretnej ligi
  getSeasonsByLeague(leagueId: string): Observable<Season[]> {
    return this.http.get<Season[]>(`${this.apiUrl}/league/${leagueId}`);
  }

  // Pobierz szczegóły konkretnego sezonu (potrzebne do Dashboardu Sezonu)
  getSeasonById(id: string): Observable<Season> {
    return this.http.get<Season>(`${this.apiUrl}/${id}`);
  }

  createSeason(season: Partial<Season>) {
    return this.http.post<Season>(this.apiUrl, season);
  }

  // Zamknij sezon lub zmień nazwę
  updateSeason(id: string, season: Partial<Season>): Observable<Season> {
    return this.http.put<Season>(`${this.apiUrl}/${id}`, season);
  }

  // Pamiętaj o imporcie HttpClient i Observable
  getSeasonTable(seasonId: string): Observable<SeasonTableEntry[]> {
    return this.http.get<SeasonTableEntry[]>(`${this.apiUrl}/${seasonId}/table`);
  }
}
