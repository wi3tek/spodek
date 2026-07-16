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
    if (!this.leagueId || !this.seasonId) return;
    this.isLoading.set(true);

    this.teamStatsService.getStats(this.leagueId, this.seasonId).subscribe({
      next: (data) => {
        this.statsData.set(data);
        this.isLoading.set(false);
        // Czekamy chwilę aż HTML wyrenderuje `#mapContainer` z opóźnieniem
        setTimeout(() => this.initMap(data.mapPoints), 150);
      },
      error: () => this.isLoading.set(false),
    });
  }

  // Funkcja generująca url do logo dokładnie tak, jak to robiłeś
  getTeamCrest(assetId: number): string {
    return `/logos/light/${assetId || 'default'}.png`;
  }

  private initMap(points: any[]) {
    if (this.map) {
      this.map.remove();
    }
    if (!this.mapContainer || points.length === 0) return;

    // Centrujemy domyślnie mniej więcej na Europę
    this.map = L.map(this.mapContainer.nativeElement).setView([50.0, 15.0], 4);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    points.forEach((point) => {
      const customIcon = L.divIcon({
        className: 'custom-team-marker',
        html: `<img src="${this.getTeamCrest(point.assetId)}" alt="${point.alias}" style="width: 40px; height: 40px; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3); border: 2px solid white; object-fit: contain; background: white;" />`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      L.marker([point.lat, point.lng], { icon: customIcon })
        .addTo(this.map!)
        .bindTooltip(`<b>${point.alias}</b>`, { direction: 'top', offset: [0, -20] });
    });
  }
}
