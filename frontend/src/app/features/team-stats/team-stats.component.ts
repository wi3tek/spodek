import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { TeamStatsResponse, TeamStatsService } from '../../core/services/team-stats.service';
import { FifaLoaderComponent } from '../../shared/components/fifa-loader/fifa-loader.component';
import * as L from 'leaflet';
import { Router } from '@angular/router';

@Component({
  selector: 'app-team-stats',
  standalone: true,
  imports: [CommonModule, FifaLoaderComponent],
  providers: [DecimalPipe],
  templateUrl: './team-stats.component.html',
  styleUrls: ['./team-stats.component.scss'],
})
export class TeamStatsComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() leagueId?: string | null;
  @Input() seasonId?: string | null;
  @Input() refreshTrigger: number = 0;

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  private teamStatsService = inject(TeamStatsService);
  private router = inject(Router); // NOWE

  get isReadOnlyMode(): boolean {
    return this.router.url.includes('/live/');
  }
  isLoading = signal(false);
  statsData = signal<TeamStatsResponse | null>(null);

  private map: L.Map | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['leagueId'] || changes['seasonId'] || changes['refreshTrigger']) {
      this.loadStats();
    }
  }

  ngAfterViewInit() {
    // Inicjalizacja następuje w callbacku gdy załadujemy dane i zniknie loader
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  loadStats() {
    if (!this.leagueId) return;
    this.isLoading.set(true);

    this.teamStatsService
      .getStats(this.leagueId, this.seasonId || '', this.isReadOnlyMode)
      .subscribe({
        next: (data) => {
          this.statsData.set(data);
          this.isLoading.set(false);
          // POPRAWKA: Usunięto argument, metoda wywoła się bez błędów TS2554
          setTimeout(() => this.initMap(), 150);
        },
        error: () => this.isLoading.set(false),
      });
  }

  // Funkcja generująca url do logo dokładnie tak, jak to robiłeś
  getTeamCrest(assetId: number): string {
    return `/logos/light/${assetId || 'default'}.png`;
  }

  private initMap(): void {
    const mapElement = this.mapContainer?.nativeElement;
    if (!mapElement) return;

    if (this.map) {
      this.map.remove();
    }

    this.map = L.map(mapElement, {
      zoomControl: false,
      attributionControl: false,
    }).setView([52.0693, 19.4803], 6);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    const stats = this.statsData();

    if (stats?.mapPoints && stats.leaderboards) {
      const markers: L.Marker[] = [];

      // NAPRAWA DANYCH: Łączymy wszystkie tabele z backendu w jedną dużą listę,
      // żeby zminimalizować szansę, że przegapimy statystyki jakiegoś klubu!
      const allAvailableStats = [
        ...stats.leaderboards.mostPlayed,
        ...stats.leaderboards.highestWinRatio,
        ...stats.leaderboards.lowestWinRatio,
        ...stats.leaderboards.highestAvgScored,
        ...stats.leaderboards.highestAvgConceded,
        ...stats.leaderboards.lowestAvgConceded,
        ...stats.leaderboards.mostDraws,
      ];

      stats.mapPoints.forEach((point) => {
        if (point.lat && point.lng) {
          const lat = typeof point.lat === 'string' ? parseFloat(point.lat) : point.lat;
          const lng = typeof point.lng === 'string' ? parseFloat(point.lng) : point.lng;

          if (!isNaN(lat) && !isNaN(lng)) {
            // Szukamy statystyk w naszej połączonej, potężnej liście
            const teamStats = allAvailableStats.find((t) => t.teamId === point.teamId);

            // Pobieramy wartości
            const matches = teamStats ? teamStats.matches : 0;

            // Matematyka dla Ratio (żeby uniknąć dzielenia przez zero, sprawdzamy czy matches > 0)
            const wRatio =
              teamStats && matches > 0 ? Math.round((teamStats.wins / matches) * 100) : 0;
            const dRatio =
              teamStats && matches > 0 ? Math.round((teamStats.draws / matches) * 100) : 0;
            const lRatio =
              teamStats && matches > 0 ? Math.round((teamStats.losses / matches) * 100) : 0;

            const scored = teamStats ? teamStats.avgScored.toFixed(1) : '0.0';
            const conceded = teamStats ? teamStats.avgConceded.toFixed(1) : '0.0';

            // NOWY STYL HERBU: Szare tło, 30x30px obrazek, brak ramek
            const customIcon = L.divIcon({
              className: 'custom-leaflet-marker',
              html: `
                <div style="
                  background-color: var(--surface-bg, #f1f5f9);
                  width: 38px;
                  height: 38px;
                  border-radius: 50%;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                ">
                  <img src="${this.getTeamCrest(point.assetId)}"
                       style="width: 30px; height: 30px; object-fit: contain;"
                </div>
              `,
              iconSize: [38, 38],
              iconAnchor: [19, 19],
              popupAnchor: [0, -19],
            });

            // NOWY DYMEK: Zawiera Ratio, wygrywa czytelność!
            const marker = L.marker([lat, lng], { icon: customIcon }).bindTooltip(
              `
                <div style="text-align: center; min-width: 150px;">
                  <div style="font-weight: 800; font-size: 1rem; color: var(--primary-brown, #2A398D); border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; margin-bottom: 6px;">
                    ${point.alias}
                  </div>
                  <div style="font-size: 0.85rem; color: var(--text-dark, #0f172a); line-height: 1.6; text-align: left;">
                    Mecze: <b style="float: right;">${matches}</b><br>
                    W/R/P: <b style="float: right;">
                      <span style="color: #3CAC3B;">${wRatio}%</span> /
                      <span style="color: #64748b;">${dRatio}%</span> /
                      <span style="color: #ef4444;">${lRatio}%</span>
                    </b><br>
                    Bramki (śr): <b style="float: right;"><span style="color: #0284c7;">${scored}</span> : <span style="color: #b45309;">${conceded}</span></b>
                  </div>
                </div>
              `,
              { direction: 'top', offset: [0, -20], className: 'custom-map-tooltip' },
            );

            markers.push(marker);
            marker.addTo(this.map!);
          }
        }
      });

      if (markers.length > 0) {
        const group = L.featureGroup(markers);
        this.map.fitBounds(group.getBounds(), { padding: [20, 20] });
      }
    }
  }
}
