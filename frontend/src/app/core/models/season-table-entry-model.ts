export interface SeasonTableEntry {
  playerId: string;
  alias: string;
  matchesPlayed: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsLost: number;
  goalDifference: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  winRatio: number;
}
