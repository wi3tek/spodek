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
import { Router } from '@angular/router';

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
  private router = inject(Router);

  // Dynamiczny getter sprawdzający, czy adres WWW to podgląd kibica
  get isReadOnlyMode(): boolean {
    return this.router.url.includes('/live/');
  }
  private chart: Chart | null = null;

  isLoading = signal(false);
  statsData = signal<StatsResponse | null>(null);
  selectedPlayerId = signal<string>('');

  selectedChartType = signal<'day' | 'match'>('day');
  // 1. Określamy domyślny okres wykresu na 2 lata ('2')
  selectedChartPeriod = signal<string>('50');

  // Niezależne stany sortowania dla każdej z 3 tabel w H2H
  partnerSort = signal<{ key: PartnerSortKey; asc: boolean }>({ key: 'matches', asc: false });
  againstSort = signal<{ key: PartnerSortKey; asc: boolean }>({ key: 'matches', asc: false });
  teamSort = signal<{ key: TeamSortKey; asc: boolean }>({ key: 'matches', asc: false });

  scope = signal<'SEASON' | 'ALL_TIME'>('SEASON');

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
    if (!this.leagueId || !this.seasonId) return;
    this.isLoading.set(true);

    this.statsService
      .getStats(this.leagueId, this.seasonId, this.isReadOnlyMode, this.scope())
      .subscribe({
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

          // Odświeżamy wykres po załadowaniu nowych danych
          setTimeout(() => this.updateChart(), 0);
        },
        error: () => this.isLoading.set(false),
      });
  }

  changeScope(newScope: 'SEASON' | 'ALL_TIME') {
    if (this.scope() === newScope) return; // Unikamy niepotrzebnych strzałów do API
    this.scope.set(newScope);
    this.loadStats();
  }

  // Nowa metoda do obsługi zmiany typu (Kolejka / Mecz)
  onTypeChange(type: 'day' | 'match') {
    this.selectedChartType.set(type);

    // Ustawiamy domyślną wartość w zależności od typu
    if (type === 'day') {
      this.selectedChartPeriod.set('50');
    } else {
      this.selectedChartPeriod.set('10');
    }

    this.updateChart();
  }

  // Funkcja wywoływana przy zmianie wartości na dropdownie
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

    const chartType = this.selectedChartType();

    // 1. Zbieramy absolutnie wszystkie unikalne znaczniki czasu
    const allKeysStr = new Set<string>();
    stats.eloChart.forEach((line) =>
      line.history.forEach((pt: any) => {
        const d = new Date(pt.date);
        if (chartType === 'day') {
          // Jeśli dzień, formatujemy jak dotychczas
          allKeysStr.add(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
          );
        } else {
          // Jeśli mecz, bierzemy unikalny czas z bazy (idealne do pojedynczych spotkań)
          allKeysStr.add(pt.date);
        }
      }),
    );
    const sortedKeys = Array.from(allKeysStr).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    // 2. FILTROWANIE
    const period = this.selectedChartPeriod();
    let filteredKeys = sortedKeys;

    if (period !== 'all') {
      const matchdaysCount = parseInt(period, 10);
      filteredKeys = sortedKeys.slice(-matchdaysCount);
    }

    const firstFilteredKeyTime = filteredKeys.length > 0 ? new Date(filteredKeys[0]).getTime() : 0;

    // Etykiety X dopasowane do interwału
    const labels = [
      'Start',
      ...filteredKeys.map((keyStr) => {
        const d = new Date(keyStr);
        if (chartType === 'day') {
          return d.toLocaleDateString('pl-PL', { year: 'numeric', month: 'short', day: 'numeric' });
        } else {
          // Dla pojedynczego meczu dodajemy też dokładną godzinę, by ładnie to wyglądało w tooltipie
          return `${d.toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
        }
      }),
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
      let startingElo = 1000;

      if (firstFilteredKeyTime > 0) {
        const pastHistory = line.history
          .filter((pt: any) => new Date(pt.date).getTime() < firstFilteredKeyTime)
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (pastHistory.length > 0) {
          startingElo = pastHistory[pastHistory.length - 1].elo;
        }
      }

      const dataPoints: number[] = [startingElo];
      let currentElo = startingElo;

      for (const keyStr of filteredKeys) {
        const matchesAtKey = line.history.filter((pt: any) => {
          if (chartType === 'day') {
            const d = new Date(pt.date);
            return (
              `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` ===
              keyStr
            );
          } else {
            return pt.date === keyStr;
          }
        });

        if (matchesAtKey.length > 0) {
          matchesAtKey.sort(
            (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
          currentElo = matchesAtKey[matchesAtKey.length - 1].elo;
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
      // (Twoja konfiguracja ChartConfiguration bez zmian...)
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
            // Podpis osi zależny od trybu
            title: {
              display: true,
              text: chartType === 'day' ? 'Punkty ELO (koniec dnia)' : 'Punkty ELO (po meczu)',
              font: { weight: 'bold' },
            },
          },
          x: { ticks: { autoSkip: true, maxTicksLimit: 20 }, grid: { display: false } },
        },
      },
    };

    const ctx = this._eloChartCanvas.nativeElement.getContext('2d');
    if (ctx) this.chart = new Chart(ctx, config);
  }
}
