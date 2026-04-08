export interface League {
  id?: string;
  name: string;
  country?: string;
  status: 'ACTIVE' | 'ARCHIVED';
}
