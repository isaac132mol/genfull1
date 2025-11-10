export type Theme = 'day' | 'night' | 'sparkle';

export interface BinInfo {
  bank: string | null;
  brand: string | null;
  type: string | null;
  country: string | null;
}

export interface HistoryEntry {
  id: string;
  bin: string;
  month: string;
  year: string;
  cvv: string;
  quantity: number;
  timestamp: number;
  isFavorite?: boolean;
}

export interface Stats {
  totalGenerated: number;
  totalSessions: number;
}

export type SortOption = 'date-desc' | 'date-asc' | 'bin-asc' | 'bin-desc' | 'quantity-desc';
