
export type TransactionType = 'planned' | 'actual' | 'saving';
export type Currency = 'EUR' | 'PLN';
export type Category = 'obligations' | 'necessities' | 'pleasures' | 'none';

export interface Transaction {
  id: string;
  title: string;
  amount: number; // Always in EUR
  originalAmount?: number; // If entered in PLN
  originalCurrency: Currency;
  type: TransactionType;
  category: Category; // New field
  isConfirmed: boolean; // If a planned expense is confirmed as done
  date: string; // ISO date string
}

export interface WeekData {
  id: string; // usually start date ISO
  startDate: string;
  endDate: string | null;
  income: number; // Weekly allowance
  transactions: Transaction[];
  isClosed: boolean;
}

export interface AppState {
  currentWeek: WeekData;
  history: WeekData[];
  totalSavings: number; // Cumulative savings across all time
  lastOpened: string; // ISO date
  presets: string[]; // Custom transaction titles
}
