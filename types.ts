export type CategoryType = 'cash' | 'retirement' | 'investment' | 'property' | 'vehicle' | 'other' | 'mortgage' | 'credit_card' | 'loan' | 'income' | 'expense';

export interface User {
  uid: string; // Changed from id to uid to match Firebase
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface FinancialItem {
  id: string;
  userId: string;
  name: string;
  amount: number;
  category: CategoryType;
  subcategory?: string; 
  date: string; // ISO YYYY-MM-DD
  recurring: boolean; // For auto-rollover
  icon?: string;
}

export interface EMI {
  id: string;
  userId: string;
  name: string;
  amount: number;
  dueDate: number; 
  isPaid: boolean;
}

export interface Milestone {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

export interface ForecastConfig {
  initial: number;
  monthly: number;
  rate: number;
  years: number;
}

export interface AppData {
  userId: string;
  assets: FinancialItem[];
  liabilities: FinancialItem[];
  income: FinancialItem[];
  expenses: FinancialItem[];
  emis: EMI[];
  milestones: Milestone[];
  forecast: ForecastConfig;
  currency: string;
  lastSynced?: string;
}

export interface ForecastResult {
  month: number;
  value: number;
  invested: number;
  interest: number;
}