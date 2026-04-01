/**
 * Shared TypeScript interfaces for the Wallet+ app.
 * Import from here instead of redefining in each screen.
 */

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  icon: string;
  color: string;
  detail?: string;
  userId?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  categoryName: string;
  categoryIcon: string;
  categoryId?: string;
  walletId: string;
  walletName?: string;
  note?: string;
  date: any;
  userId?: string;
}

export interface CategoryBreakdown {
  name: string;
  total: number;
  count: number;
  icon: string;
  color: string;
  percentage: number;
}
