/**
 * Centralized category definitions for the Wallet+ app.
 * Used across transaction creation, editing, listing, and summary breakdowns.
 */

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const EXPENSE_CATEGORIES: Category[] = [
  { id: '1',  name: 'Food',          icon: 'fast-food',  color: '#FF6B6B' },
  { id: '2',  name: 'Transport',     icon: 'car',        color: '#4ECDC4' },
  { id: '3',  name: 'Shopping',      icon: 'cart',       color: '#FFE66D' },
  { id: '4',  name: 'Bills',         icon: 'receipt',    color: '#A8E6CF' },
  { id: '5',  name: 'Health',        icon: 'medkit',     color: '#FF8B94' },
  { id: '6',  name: 'Education',     icon: 'school',     color: '#DDA0DD' },
  { id: '7',  name: 'Groceries',     icon: 'basket',     color: '#98D8C8' },
  { id: '8',  name: 'Housing',       icon: 'home',       color: '#F7DC6F' },
  { id: '9',  name: 'Utilities',     icon: 'flash',      color: '#BB8FCE' },
  { id: '10', name: 'Entertainment', icon: 'film',       color: '#85C1E9' },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: '11', name: 'Salary',    icon: 'cash',        color: '#82E0AA' },
  { id: '12', name: 'Business',  icon: 'briefcase',   color: '#F8C471' },
  { id: '13', name: 'Investment',icon: 'trending-up',  color: '#76D7C4' },
  { id: '14', name: 'Bonus',     icon: 'gift',        color: '#F1948A' },
  { id: '15', name: 'Freelance', icon: 'laptop',      color: '#AED6F1' },
  { id: '16', name: 'Other',     icon: 'add-circle',  color: '#D5DBDB' },
];

/** All categories combined */
export const ALL_CATEGORIES: Category[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

/** Quick lookup: category name → color */
export const CATEGORY_COLORS: { [key: string]: string } = Object.fromEntries(
  ALL_CATEGORIES.map(c => [c.name, c.color])
);

/** Quick lookup: category name → icon */
export const CATEGORY_ICONS: { [key: string]: string } = Object.fromEntries(
  ALL_CATEGORIES.map(c => [c.name, c.icon])
);

/** Get color for a category name, with fallback */
export function getCategoryColor(name: string): string {
  return CATEGORY_COLORS[name] || '#D5DBDB';
}

/** Get icon for a category name, with fallback */
export function getCategoryIcon(name: string): string {
  return CATEGORY_ICONS[name] || 'help';
}
