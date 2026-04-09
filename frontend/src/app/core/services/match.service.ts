import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';


@Injectable({ providedIn: 'root' })
export class MatchService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/matches`;

  getMatchesBySeason(seasonId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/season/${seasonId}`);
  }

  // DODAJ TE METODY:
  createMatch(match: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, match);
  }

  updateMatch(id: string, match: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, match);
  }

  deleteMatch(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
