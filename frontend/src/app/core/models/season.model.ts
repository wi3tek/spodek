export interface Season {
  id?: string;
  name: string;
  leagueId: string;
  image: string | null;
  minPlayerMatchAmount: number;
  uniqueTeams: boolean;
  status: 'ACTIVE' | 'FINISHED' | string;
  startDate: string;
  endDate: string;
  leagueSeasonCount: number;
  liveCode?: string | null;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  logoUrl?: string;
}
