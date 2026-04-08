import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Season } from '../models/season.model';

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

  // Utwórz nowy sezon
  createSeason(season: Partial<Season>): Observable<Season> {
    return this.http.post<Season>(this.apiUrl, season);
  }

  // Zamknij sezon lub zmień nazwę
  updateSeason(id: string, season: Partial<Season>): Observable<Season> {
    return this.http.put<Season>(`${this.apiUrl}/${id}`, season);
  }
}
