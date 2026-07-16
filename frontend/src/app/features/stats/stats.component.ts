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
  StatsResponse,
  StatsService,
  PlayerRelations,
  Relation,
  FavoriteTeam,
} from '../../core/services/stats.service';
import { FifaLoaderComponent } from '../../shared/components/fifa-loader/fifa-loader.component';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

// Typy kluczy do sortowania dla czytelności kodu
type PartnerSortKey =
  | 'matches'
  | 'winRatio'
  | 'drawRatio'
  | 'lossRatio'
  | 'avgScored'
  | 'avgConceded';
type TeamSortKey = 'matches' | 'winRatio' | 'avgScored' | 'avgConceded';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, FormsModule, FifaLoaderComponent],
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
})
export class StatsComponent implements OnChanges {
  @Input() leagueId?: string | null;
  @Input() seasonId?: string | null;
  @Input() refreshTrigger: number = 0;

  @ViewChild('eloChartCanvas') eloChartCanvas!: ElementRef<HTMLCanvasElement>;

  private statsService = inject(StatsService);
  private chart: Chart | null = null;

  isLoading = signal(false);
  statsData = signal<StatsResponse | null>(null);
  selectedPlayerId = signal<string>('');

  // Niezależne stany sortowania dla każdej z 3 tabel w H2H
  partnerSort = signal<{ key: PartnerSortKey; asc: boolean }>({ key: 'matches', asc: false });
  againstSort = signal<{ key: PartnerSortKey; asc: boolean }>({ key: 'matches', asc: false });
  teamSort = signal<{ key: TeamSortKey; asc: boolean }>({ key: 'matches', asc: false });

  selectedPlayerRelations = computed<PlayerRelations | null>(() => {
    const id = this.selectedPlayerId();
    const data = this.statsData();
    if (!id || !data || !data.relations) return null;
    return data.relations.find((r) => r.playerId === id) || null;
  });

  // 1. Zoptymalizowana tabela: Z kim gram w parze
  sortedPlayedWith = computed<Relation[]>(() => {
    const rels = this.selectedPlayerRelations();
    if (!rels) return [];
    const sort = this.partnerSort();
    return [...rels.playedWith].sort((a, b) => this.compareRelations(a, b, sort.key, sort.asc));
  });

  // 2. Zoptymalizowana tabela: Przeciwko komu gram
  sortedPlayedAgainst = computed<Relation[]>(() => {
    const rels = this.selectedPlayerRelations();
    if (!rels) return [];
    const sort = this.againstSort();
    return [...rels.playedAgainst].sort((a, b) => this.compareRelations(a, b, sort.key, sort.asc));
  });

  // 3. Zoptymalizowana tabela: Moje ulubione kluby (ze wsparciem dla bramek straconych)
  sortedFavoriteTeams = computed<FavoriteTeam[]>(() => {
    const rels = this.selectedPlayerRelations();
    if (!rels) return [];
    const sort = this.teamSort();
    return [...rels.favoriteTeams].sort((a, b) => this.compareTeams(a, b, sort.key, sort.asc));
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['leagueId'] || changes['seasonId'] || changes['refreshTrigger']) {
      this.loadStats();
    }
  }

  loadStats() {
    if (!this.leagueId) return;
    this.isLoading.set(true);

    this.statsService.getStats(this.leagueId, this.seasonId || '').subscribe({
      next: (data) => {
        this.statsData.set(data);
        this.isLoading.set(false);

        if (data && data.relations && data.relations.length > 0) {
          const currentId = this.selectedPlayerId();
          const exists = data.relations.some((r) => r.playerId === currentId);
          if (!currentId || !exists) {
            this.selectedPlayerId.set(data.relations[0].playerId);
          }
        }

        setTimeout(() => this.updateChart(), 100);
      },
      error: () => this.isLoading.set(false),
    });
  }

  // Funkcje do przełączania kierunku i kolumny sortowania
  togglePartnerSort(key: PartnerSortKey) {
    this.partnerSort.update((s) => ({ key, asc: s.key === key ? !s.asc : false }));
  }

  toggleAgainstSort(key: PartnerSortKey) {
    this.againstSort.update((s) => ({ key, asc: s.key === key ? !s.asc : false }));
  }

  toggleTeamSort(key: TeamSortKey) {
    this.teamSort.update((s) => ({ key, asc: s.key === key ? !s.asc : false }));
  }

  // Komparatory pomocnicze realizujące matematykę sortowania
  private compareRelations(a: Relation, b: Relation, key: PartnerSortKey, asc: boolean): number {
    let valA = 0;
    let valB = 0;

    if (key === 'matches') {
      valA = a.matches;
      valB = b.matches;
    } else if (key === 'winRatio') {
      valA = a.wins / a.matches;
      valB = b.wins / b.matches;
    } else if (key === 'drawRatio') {
      valA = a.draws / a.matches;
      valB = b.draws / b.matches;
    } else if (key === 'lossRatio') {
      valA = a.losses / a.matches;
      valB = b.losses / b.matches;
    } else if (key === 'avgScored') {
      valA = a.goalsScoredForTeam / a.matches;
      valB = b.goalsScoredForTeam / b.matches;
    } else if (key === 'avgConceded') {
      valA = a.goalsLostForTeam / a.matches;
      valB = b.goalsLostForTeam / b.matches;
    }

    return asc ? valA - valB : valB - valA;
  }

  private compareTeams(a: FavoriteTeam, b: FavoriteTeam, key: TeamSortKey, asc: boolean): number {
    let valA = 0;
    let valB = 0;

    if (key === 'matches') {
      valA = a.matches;
      valB = b.matches;
    } else if (key === 'winRatio') {
      valA = a.wins / a.matches;
      valB = b.wins / b.matches;
    } else if (key === 'avgScored') {
      valA = a.goalsScored / a.matches;
      valB = b.goalsScored / b.matches;
    } else if (key === 'avgConceded') {
      valA = a.goalsConceded / a.matches;
      valB = b.goalsConceded / b.matches;
    }

    return asc ? valA - valB : valB - valA;
  }

  updateChart() {
    const stats = this.statsData();
    if (!stats || !stats.eloChart || stats.eloChart.length === 0 || !this.eloChartCanvas) return;
    if (this.chart) this.chart.destroy();

    const allDaysStr = new Set<string>();
    stats.eloChart.forEach((line) =>
      line.history.forEach((pt: any) => {
        const d = new Date(pt.date);
        allDaysStr.add(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        );
      }),
    );

    const sortedDays = Array.from(allDaysStr).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );
    const labels = [
      'Start',
      ...sortedDays.map((dayStr) =>
        new Date(dayStr).toLocaleDateString('pl-PL', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      ),
    ];
    const colors = [
      '#ef4444',
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#8b5cf6',
      '#ec4899',
      '#14b8a6',
      '#f97316',
      '#6366f1',
      '#84cc16',
    ];

    const datasets = stats.eloChart.map((line, idx) => {
      const dataPoints: number[] = [1000];
      let currentElo = 1000;
      for (const dayStr of sortedDays) {
        const matchesThatDay = line.history.filter((pt: any) => {
          const d = new Date(pt.date);
          return (
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` ===
            dayStr
          );
        });
        if (matchesThatDay.length > 0) {
          matchesThatDay.sort(
            (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
          currentElo = matchesThatDay[matchesThatDay.length - 1].elo;
        }
        dataPoints.push(currentElo);
      }
      const color = colors[idx % colors.length];
      return {
        label: line.alias,
        data: dataPoints,
        borderColor: color,
        backgroundColor: color + '20',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 3,
        pointHoverRadius: 8,
        originalColor: color,
      };
    });

    let hoveredDatasetIndex: number | null = null;
    const config: ChartConfiguration = {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        onHover: (event, elements, chart) => {
          const exactPoints = chart.getElementsAtEventForMode(
            event.native!,
            'nearest',
            { intersect: true },
            false,
          );
          let newHoveredIndex = null;
          if (exactPoints.length > 0) newHoveredIndex = exactPoints[0].datasetIndex;
          if (hoveredDatasetIndex !== newHoveredIndex) {
            hoveredDatasetIndex = newHoveredIndex;
            chart.data.datasets.forEach((dataset: any, i: number) => {
              if (hoveredDatasetIndex === null) {
                dataset.borderWidth = 2;
                dataset.borderColor = dataset.originalColor;
              } else if (i === hoveredDatasetIndex) {
                dataset.borderWidth = 4;
                dataset.borderColor = dataset.originalColor;
              } else {
                dataset.borderWidth = 1;
                dataset.borderColor = dataset.originalColor + '30';
              }
            });
            chart.update();
          }
        },
        plugins: {
          legend: { position: 'top', labels: { font: { weight: 'bold' } } },
          tooltip: {
            filter: (tooltipItem) =>
              hoveredDatasetIndex === null
                ? true
                : tooltipItem.datasetIndex === hoveredDatasetIndex,
            itemSort: (a, b) => (b.raw as number) - (a.raw as number),
          },
        },
        scales: {
          y: {
            grid: { color: '#f1f5f9' },
            ticks: { font: { weight: 'bold' } },
            title: { display: true, text: 'Punkty ELO (koniec dnia)', font: { weight: 'bold' } },
          },
          x: { ticks: { autoSkip: true, maxTicksLimit: 20 }, grid: { display: false } },
        },
      },
    };
    const ctx = this.eloChartCanvas.nativeElement.getContext('2d');
    if (ctx) this.chart = new Chart(ctx, config);
  }
}
