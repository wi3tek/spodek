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
  @Input() seasonId?: string | null; // POPRAWKA: Teraz to jest @Input() i reaguje na zmiany!
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
    if (!this.leagueId || !this.seasonId) {
      console.log('leagueId: ', this.leagueId, ', seasonId:' + this.seasonId);
      return;
    }
    this.isLoading.set(true);
    this.statsService.getStats(this.leagueId, this.seasonId).subscribe({
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
      this.chart.destroy();
    }

    // 1. Zbieramy wszystkie UNIKALNE daty meczów z historii wszystkich graczy
    const allDates = new Set<number>();
    stats.eloChart.forEach((line) => {
      line.history.forEach((pt: any) => {
        // Zapisujemy datę jako timestamp (w milisekundach), żeby łatwo ją posortować
        allDates.add(new Date(pt.date).getTime());
      });
    });

    // 2. Sortujemy daty chronologicznie
    const sortedTimestamps = Array.from(allDates).sort((a, b) => a - b);

    // Formujemy etykiety osi X (np. "12 paź 18:30" lub krócej)
    const labels = sortedTimestamps.map((ts) => {
      const d = new Date(ts);
      return d.toLocaleDateString('pl-PL', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    });

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

    // 3. Budujemy zestawy danych w oparciu o wspólną oś czasu
    const datasets = stats.eloChart.map((line, idx) => {
      const dataPoints: number[] = [];
      let currentElo = 1000; // Zakładamy domyślne startowe ELO przed pierwszym meczem

      for (const timestamp of sortedTimestamps) {
        // Szukamy, czy gracz miał zmianę ELO w tym konkretnym momencie
        const matchPoint = line.history.find(
          (pt: any) => new Date(pt.date).getTime() === timestamp,
        );

        if (matchPoint) {
          // Gracz grał mecz -> aktualizujemy jego ELO
          currentElo = matchPoint.elo;
        }

        // Niezależnie czy grał, czy nie, na osi X musi pojawić się punkt.
        // Jeśli nie grał, dodajemy jego 'stare' ELO.
        dataPoints.push(currentElo);
      }

      return {
        label: line.alias,
        data: dataPoints,
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length] + '20',
        borderWidth: 2,
        // stepped: 'before' sprawia, że linia nie biegnie ukośnie (jak temperatura),
        // ale skacze gwałtownie do nowej wartości w momencie rozegrania meczu.
        stepped: 'before' as const,
        pointRadius: 1, // Mniejsze kropki, bo na wspólnej osi może być ich bardzo dużo
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
            mode: 'index', // Po najechaniu zobaczysz ranking wszystkich graczy w danym momencie!
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
            // Opcjonalnie: jeśli dat jest bardzo dużo, Chart.js może je mądrze ukrywać
            ticks: { autoSkip: true, maxTicksLimit: 15 },
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
