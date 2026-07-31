
export interface Team {
  id?: string;
  name: string;
  alias: string;
  overallRating: number;
  attackRating: number;
  midfieldRating: number;
  defenseRating: number;
  assetId: string;
  // Nowe pola kolorów i stylu herbu:
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  quaternaryColor?: string;
  quinaryColor?: string;
  shapeType?: BadgeShape;
  patternType?: PatternType;
}

export type BadgeShape =
  | 'SHIELD'
  | 'SQUARE'
  | 'CIRCLE'
  | 'TRIANGLE'
  | 'WIDE_TRIANGLE'
  | 'DIAMOND'
  | 'FLAG'
  | 'CREST_WITH_RIBBON'
  | 'OVAL_SHIELD'
  | 'ELLIPSE';
export type PatternType = 'PLAIN' | 'SASH' | 'STRIPES_V' | 'STRIPES_H' | 'CHECKER';
