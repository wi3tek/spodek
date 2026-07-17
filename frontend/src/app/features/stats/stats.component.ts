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

  private _eloChartCanvas!: ElementRef<HTMLCanvasElement>;

  // Kiedy Angular wreszcie wyrenderuje <canvas> w HTMLu, natychmiast wywoła tę metodę
  @ViewChild('eloChartCanvas') set eloChartCanvas(content: ElementRef<HTMLCanvasElement>) {
    if (content) {
      this._eloChartCanvas = content;
      // Odpalamy wykres w ułamku sekundy po tym, jak płótno faktycznie zaistnieje w przeglądarce!
      this.updateChart();
    }
  }

  private statsService = inject(StatsService);
  private chart: Chart | null = null;

  isLoading = signal(false);
  statsData = signal<StatsResponse | null>(null);
  selectedPlayerId = signal<string>('');

  // 1. Określamy domyślny okres wykresu na 2 lata ('2')
  selectedChartPeriod = signal<string>('all');

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

  // Zoptymalizowana tabela: Z kim gram w parze
  sortedPlayedWith = computed<Relation[]>(() => {
    const rels = this.selectedPlayerRelations();
    if (!rels) return [];
    const sort = this.partnerSort();
    return [...rels.playedWith].sort((a, b) => this.compareRelations(a, b, sort.key, sort.asc));
  });

  // Zoptymalizowana tabela: Przeciwko komu gram
  sortedPlayedAgainst = computed<Relation[]>(() => {
    const rels = this.selectedPlayerRelations();
    if (!rels) return [];
    const sort = this.againstSort();
    return [...rels.playedAgainst].sort((a, b) => this.compareRelations(a, b, sort.key, sort.asc));
  });

  // Zoptymalizowana tabela: Moje ulubione kluby
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

      },
      error: () => this.isLoading.set(false),
    });
  }

  // Funkcja wywoływana przy zmianie okresu na dropdownie
  onPeriodChange(period: string) {
    this.selectedChartPeriod.set(period);
    this.updateChart(); // Odświeżamy wykres w locie
  }

  togglePartnerSort(key: PartnerSortKey) {
    this.partnerSort.update((s) => ({ key, asc: s.key === key ? !s.asc : false }));
  }

  toggleAgainstSort(key: PartnerSortKey) {
    this.againstSort.update((s) => ({ key, asc: s.key === key ? !s.asc : false }));
  }

  toggleTeamSort(key: TeamSortKey) {
    this.teamSort.update((s) => ({ key, asc: s.key === key ? !s.asc : false }));
  }

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
    if (!stats || !stats.eloChart || stats.eloChart.length === 0 || !this._eloChartCanvas) return;
    if (this.chart) this.chart.destroy();

    // 1. Zbieramy absolutnie wszystkie unikalne dni z bazy danych
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

    // 2. NOWE FILTROWANIE: Pobieramy ostatnie X kolejek (dni)
    const period = this.selectedChartPeriod();
    let filteredDays = sortedDays;

    if (period !== 'all') {
      const matchdaysCount = parseInt(period, 10);
      // Pobieramy tylko X ostatnich elementów (kolejek) z końca osi czasu
      filteredDays = sortedDays.slice(-matchdaysCount);
    }

    // Pobieramy znacznik czasu pierwszego dnia na przefiltrowanym wykresie
    const firstFilteredDayTime = filteredDays.length > 0 ? new Date(filteredDays[0]).getTime() : 0;

    const labels = [
      'Start',
      ...filteredDays.map((dayStr) =>
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
      // Domyślny start to 1000 ELO
      let startingElo = 1000;

      // 3. Matematyka początkowego ELO pozostaje bez zmian (zadziała idealnie!)
      if (firstFilteredDayTime > 0) {
        const pastHistory = line.history
          .filter((pt: any) => new Date(pt.date).getTime() < firstFilteredDayTime)
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (pastHistory.length > 0) {
          startingElo = pastHistory[pastHistory.length - 1].elo;
        }
      }

      const dataPoints: number[] = [startingElo];
      let currentElo = startingElo;

      for (const dayStr of filteredDays) {
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
    const ctx = this._eloChartCanvas.nativeElement.getContext('2d');
    if (ctx) this.chart = new Chart(ctx, config);
  }
}
