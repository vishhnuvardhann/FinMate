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
  milestones: Milestone[];
  budgetPlans: BudgetPlan[];
  forecast: ForecastConfig;
  currency: string;
  lastSynced?: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  limit: number;
  description?: string; // Optional specific item description (e.g. "Groceries")
  recurring?: boolean; // New: Auto-rollover to next month
}

export interface BudgetPlan {
  month: string; // YYYY-MM
  totalLimit: number;
  // Deprecated: kept for backward compatibility migration
  categoryLimits?: Record<string, number>;
  categoryDescriptions?: Record<string, string>;
  // New Structure
  budgetItems?: BudgetItem[];
}

export interface ForecastResult {
  month: number;
  value: number;
  invested: number;
  interest: number;
}