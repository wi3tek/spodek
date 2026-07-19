export interface Season {
  id?: string;
  name: string;
  leagueId: string;
  status: 'ACTIVE' | 'FINISHED';
  createdAt?: string;
  updatedAt?: string;
  startDate?: string;
  endDate?: string;
  uniqueTeams: boolean;
  liveCode: string;
}
