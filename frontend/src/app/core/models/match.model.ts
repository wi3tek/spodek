export interface MatchSide {
  teamId: string;
  gameTeamName?: string; // Populated from backend
  gameTeamAssetId?: string; // Populated for logo
  goals: number;
  players: {
    playerId: string;
    playerAlias?: string; // Populated
    yellowCards: number;
    redCards: number;
  }[];
}

export interface Match {
  id?: string;
  seasonId: string;
  matchweek: number;
  homeSide: MatchSide;
  awaySide: MatchSide;
  createdAt: string; // Wykorzystamy to jako godzinę meczu
  updatedAt: string; // Wykorzystamy to jako godzinę meczu
  finished: boolean;

}
