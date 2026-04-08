export interface Season {
  id?: string;
  name: string;
  leagueId: string;
  status: 'ACTIVE' | 'FINISHED';
  createdAt?: string;
  updatedAt?: string;
}
