import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ScopeStats,
  StatsResponse,
  StatsService,
  PlayerRelations,
} from '../../core/services/stats.service';
import { FifaLoaderComponent } from '../../shared/components/fifa-loader/fifa-loader.component';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Rejestrujemy komponenty Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, FormsModule, FifaLoaderComponent],
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
})
export class StatsComponent implements OnChanges {
  @Input() leagueId?: string | null;
  @Input() refreshTrigger: number = 0;

  @ViewChild('eloChartCanvas') eloChartCanvas!: ElementRef<HTMLCanvasElement>;

  private statsService = inject(StatsService);
  private chart: Chart | null = null;

  isLoading = signal(false);
  statsData = signal<StatsResponse | null>(null);
  selectedPlayerId = signal<string>('');

  selectedPlayerRelations = computed<PlayerRelations | null>(() => {
    const stats = this.statsData();
    const id = this.selectedPlayerId();
    if (!stats || !id) return null;
    return stats.relations.find((r) => r.playerId === id) || null;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['leagueId'] || changes['seasonId'] || changes['refreshTrigger']) {
      this.loadStats();
    }
  }

  loadStats() {
    if (!this.leagueId) return;
    this.isLoading.set(true);
    this.statsService.getStats(this.leagueId).subscribe({
      next: (data) => {
        this.statsData.set(data);
        if (!this.selectedPlayerId() && data.relations.length > 0) {
          this.selectedPlayerId.set(data.relations[0].playerId);
        }
        this.isLoading.set(false);
        setTimeout(() => this.updateChart(), 100);
      },
      error: (err) => {
        console.error('Błąd pobierania statystyk', err);
        this.isLoading.set(false);
      },
    });
  }

  updateChart() {
    const stats = this.statsData();
    if (!stats || !stats.eloChart || stats.eloChart.length === 0 || !this.eloChartCanvas) {
      return;
    }

    if (this.chart) {
      this.chart.destroy(); // Niszczymy stary wykres, by uniknąć glitchy graficznych
    }

    // Generowanie osi X (numery kolejnych meczów lub daty)
    // Pobieramy najdłuższą historię meczów u dowolnego gracza, by ustalić etykiety osi X
    const maxPoints = Math.max(...stats.eloChart.map((line) => line.history.length));
    const labels = Array.from({ length: maxPoints }, (_, i) => `Mecz ${i + 1}`);

    // Kolory dla graczy (możemy zdefiniować stałą paletę)
    const colors = [
      '#f59e0b',
      '#3b82f6',
      '#10b981',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
      '#14b8a6',
      '#6366f1',
    ];

    const datasets = stats.eloChart.map((line, idx) => {
      return {
        label: line.alias,
        data: line.history.map((pt: any) => pt.elo),
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length] + '20', // Dodanie 12% przezroczystości
        borderWidth: 3,
        tension: 0.3, // Lekkie zaokrąglenie linii
        pointRadius: 4,
        pointHoverRadius: 6,
      };
    });

    const config: ChartConfiguration = {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { weight: 'bold' } },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          y: {
            grid: { color: '#f1f5f9' },
            ticks: { font: { weight: 'bold' } },
            title: { display: true, text: 'Punkty ELO', font: { weight: 'bold' } },
          },
          x: {
            grid: { display: false },
          },
        },
      },
    };

    const ctx = this.eloChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.chart = new Chart(ctx, config);
    }
  }
}
