import { Component, input, computed } from '@angular/core';
import { BadgeShape, PatternType } from '../../../core/models/team.model';

export type TopElement = 'NONE' | 'STAR' | 'CROWN';
export type CenterElement = 'NONE' | 'BALL' | 'INITIAL';

const DEFAULT_COLOR_1 = '#B0B0B0';
const DEFAULT_COLOR_2 = '#CCCCCC';
const DEFAULT_COLOR_3 = '#1a1a1a';
const DEFAULT_COLOR_4 = '#ffffff';
const DEFAULT_COLOR_5 = '#FFD700';

@Component({
  selector: 'app-team-shield',
  standalone: true,
  template: `
    <svg
      viewBox="-15 -35 130 165"
      class="shield-icon"
      [style.width]="styleSize()"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient [id]="'grad-' + teamId()" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="49%" [attr.stop-color]="c1()" />
          <stop offset="51%" [attr.stop-color]="c2()" />
        </linearGradient>
        <pattern
          [id]="'pat-stripes-v-' + teamId()"
          width="20"
          height="115"
          patternUnits="userSpaceOnUse"
        >
          <rect width="10" height="115" [attr.fill]="c1()" />
          <rect x="10" width="10" height="115" [attr.fill]="c2()" />
        </pattern>
        <pattern
          [id]="'pat-stripes-h-' + teamId()"
          width="100"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <rect width="100" height="10" [attr.fill]="c1()" />
          <rect y="10" width="100" height="10" [attr.fill]="c2()" />
        </pattern>
        <pattern
          [id]="'pat-checker-' + teamId()"
          width="30"
          height="30"
          patternUnits="userSpaceOnUse"
        >
          <rect width="30" height="30" [attr.fill]="c1()" />
          <rect width="15" height="15" [attr.fill]="c2()" />
          <rect x="15" y="15" width="15" height="15" [attr.fill]="c2()" />
        </pattern>
        <pattern
          [id]="'pat-sash-' + teamId()"
          width="100"
          height="115"
          patternUnits="userSpaceOnUse"
        >
          <rect width="100" height="115" [attr.fill]="c1()" />
          <line x1="0" y1="115" x2="100" y2="0" [attr.stroke]="c2()" stroke-width="25" />
        </pattern>

        <g id="shape-SHIELD">
          <path d="M 5 15 L 95 15 L 92 60 C 85 90 65 105 50 112 C 35 105 15 90 8 60 Z" />
        </g>
        <g id="shape-SQUARE">
          <path d="M 5 15 Q 50 5 95 15 L 95 60 C 95 85 75 100 50 100 C 25 100 5 85 5 60 Z" />
        </g>
        <g id="shape-CIRCLE"><path d="M 50 9.5 A 48 48 0 1 0 50 105.5 A 48 48 0 1 0 50 9.5 Z" /></g>
        <g id="shape-TRIANGLE"><path d="M 15 10 L 85 10 L 50 105 Z" /></g>
        <g id="shape-WIDE_TRIANGLE"><path d="M -5 10 L 105 10 L 50 95 Z" /></g>
        <g id="shape-DIAMOND"><path d="M 50 2 L 95 57.5 L 50 113 L 5 57.5 Z" /></g>
        <g id="shape-OVAL_SHIELD">
          <path
            d="M 50 5 C 85 5 95 30 95 60 C 95 90 70 110 50 115 C 30 110 5 90 5 60 C 5 30 15 5 50 5 Z"
          />
        </g>

        <g id="shape-ELLIPSE"><ellipse cx="50" cy="57.5" rx="50" ry="36" /></g>
        <g id="shape-CREST_WITH_RIBBON">
          <path
            d="M 5 5 L 95 5 L 95 60 C 95 75 85 80 100 85 L 105 95 Q 50 120 -5 95 L 0 85 C 15 80 5 75 5 60 Z"
          />
        </g>
        <g id="shape-FLAG">
          <path d="M 17 15 Q 40 5 65 15 T 95 10 V 85 Q 70 95 45 85 T 17 90 Z" />
        </g>
      </defs>

      <use [attr.href]="'#shape-' + shape()" [attr.fill]="c3()" />

      @if (shape() === 'FLAG') {
        <path d="M 10 5 H 18 V 110 H 10 Z" [attr.fill]="c3()" />
      }

      <use
        [attr.href]="'#shape-' + shape()"
        [attr.fill]="c4()"
        style="transform-origin: 50px 57.5px;"
        [style.transform]="shape() === 'FLAG' ? 'scale(0.82) translate(1px, 0)' : 'scale(0.8)'"
      />

      <use
        [attr.href]="'#shape-' + shape()"
        [attr.fill]="fillUrl()"
        style="transform-origin: 50px 57.5px;"
        [style.transform]="shape() === 'FLAG' ? 'scale(0.68) translate(2px, 0)' : 'scale(0.7)'"
      />

      <use
        [attr.href]="'#shape-' + shape()"
        fill="none"
        stroke="var(--primary-brown)"
        stroke-width="1.5"
      />

      <!-- ========================================== -->
      <!-- ELEMENTY GÓRNE Z DYNAMICZNYM OFFSETEM      -->
      <!-- ========================================== -->
      <g [attr.transform]="topTransform()">
        @if (topElement() === 'STAR') {
          <polygon
            points="50,-18 53,-9 62,-9 55,-3 58,6 50,1 42,6 45,-3 38,-9 47,-9"
            [attr.fill]="cTop()"
            [attr.stroke]="c3()"
            stroke-width="1"
            style="filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.3));"
          />
        }

        @if (topElement() === 'CROWN') {
          <g
            style="filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.3));"
            transform="translate(0, 1.5)"
          >
            <path
              d="M 22,7 L 18,-10 L 32,-4 L 50,-18 L 68,-4 L 82,-10 L 78,7 Z"
              [attr.fill]="cTop()"
              [attr.stroke]="c3()"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <circle
              cx="18"
              cy="-10"
              r="2.5"
              [attr.fill]="c4()"
              [attr.stroke]="c3()"
              stroke-width="0.5"
            />
            <circle
              cx="50"
              cy="-18"
              r="3"
              [attr.fill]="c4()"
              [attr.stroke]="c3()"
              stroke-width="0.5"
            />
            <circle
              cx="82"
              cy="-10"
              r="2.5"
              [attr.fill]="c4()"
              [attr.stroke]="c3()"
              stroke-width="0.5"
            />
            <line x1="24" y1="4" x2="76" y2="4" [attr.stroke]="c3()" stroke-width="1.5" />
          </g>
        }
      </g>

      <!-- ========================================== -->
      <!-- ELEMENTY ŚRODKOWE Z DYNAMICZNYM OFFSETEM   -->
      <!-- ========================================== -->
      <g [attr.transform]="centerTransform()">
        @if (centerElement() === 'BALL') {
          <!-- Skalowanie piłki do 80% rozmiaru -->
          <g
            style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.4)); transform-origin: 50px 57.5px; transform: scale(0.8);"
          >
            <circle
              cx="50"
              cy="57.5"
              r="16"
              [attr.fill]="cCenter()"
              [attr.stroke]="c3()"
              stroke-width="1.5"
            />
            <polygon points="50,48 57,53 54,61 46,61 43,53" [attr.fill]="c3()" />
            <line x1="50" y1="48" x2="50" y2="41.5" [attr.stroke]="c3()" stroke-width="1.5" />
            <line x1="43" y1="53" x2="35" y2="52" [attr.stroke]="c3()" stroke-width="1.5" />
            <line x1="57" y1="53" x2="65" y2="52" [attr.stroke]="c3()" stroke-width="1.5" />
            <line x1="46" y1="61" x2="41" y2="69" [attr.stroke]="c3()" stroke-width="1.5" />
            <line x1="54" y1="61" x2="59" y2="69" [attr.stroke]="c3()" stroke-width="1.5" />
          </g>
        }

        @if (centerElement() === 'INITIAL' && initial()) {
          <!-- Mniejszy font i zaktualizowany punkt osi Y -->
          <text
            x="50"
            y="69"
            font-family="Arial, sans-serif"
            font-size="28"
            font-weight="900"
            text-anchor="middle"
            [attr.fill]="cCenter()"
            [attr.stroke]="c3()"
            stroke-width="1"
            style="filter: drop-shadow(1px 2px 3px rgba(0, 0, 0, 0.4));"
          >
            {{ initial() }}
          </text>
        }
      </g>
    </svg>
  `,
  styles: [
    `
      .shield-icon {
        height: auto;
        display: block;
        filter: drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.25));
      }
    `,
  ],
})
export class TeamShieldComponent {
  teamId = input.required<string>();
  shape = input<BadgeShape>('SHIELD');
  pattern = input<PatternType>('SASH');

  topElement = input<TopElement>('NONE');
  centerElement = input<CenterElement>('NONE');
  initial = input<string | null>(null);

  color1 = input<string | null>();
  color2 = input<string | null>();
  color3 = input<string | null>();
  color4 = input<string | null>();
  color5 = input<string | null>();

  topColor = input<string | null>(null);
  centerColor = input<string | null>(null);

  size = input<string | number>(45);

  c1 = computed(() => this.color1() ?? DEFAULT_COLOR_1);
  c2 = computed(() => this.color2() ?? DEFAULT_COLOR_2);
  c3 = computed(() => this.color3() ?? DEFAULT_COLOR_3);
  c4 = computed(() => this.color4() ?? DEFAULT_COLOR_4);
  c5 = computed(() => this.color5() ?? DEFAULT_COLOR_5);

  cTop = computed(() => this.topColor() ?? this.c5());
  cCenter = computed(
    () => this.centerColor() ?? (this.centerElement() === 'BALL' ? this.c4() : this.c5()),
  );

  topTransform = computed(() => {
    const offsets: Record<string, string> = {
      SHIELD: 'translate(0, 0)',
      SQUARE: 'translate(0, 0)',
      CIRCLE: 'translate(0, -5)',
      TRIANGLE: 'translate(0, -5)',
      WIDE_TRIANGLE: 'translate(0, -5)',
      DIAMOND: 'translate(0, -13)',
      OVAL_SHIELD: 'translate(0, -10)',
      CREST_WITH_RIBBON: 'translate(0, -10)',
      FLAG: 'translate(6, -2)',
      ELLIPSE: 'translate(0, 10)',
    };
    return offsets[this.shape()] || 'translate(0, 0)';
  });

  centerTransform = computed(() => {
    const offsets: Record<string, string> = {
      SHIELD: 'translate(0, -3)',
      SQUARE: 'translate(0, 0)',
      CIRCLE: 'translate(0, 0)',
      TRIANGLE: 'translate(0, -6)',
      WIDE_TRIANGLE: 'translate(0, -14)',
      DIAMOND: 'translate(0, 0)',
      OVAL_SHIELD: 'translate(0, -2)',
      CREST_WITH_RIBBON: 'translate(0, -10)',
      FLAG: 'translate(6, -7)',
      ELLIPSE: 'translate(0, 0)',
    };
    return offsets[this.shape()] || 'translate(0, 0)';
  });

  fillUrl = computed(() => {
    const id = this.teamId();
    switch (this.pattern()) {
      case 'STRIPES_V':
        return `url(#pat-stripes-v-${id})`;
      case 'STRIPES_H':
        return `url(#pat-stripes-h-${id})`;
      case 'CHECKER':
        return `url(#pat-checker-${id})`;
      case 'SASH':
        return `url(#pat-sash-${id})`;
      case 'PLAIN':
      default:
        return `url(#grad-${id})`;
    }
  });

  styleSize = computed(() => (typeof this.size() === 'number' ? `${this.size()}px` : this.size()));
}
