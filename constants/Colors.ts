/**
 * Centralized color tokens for the Wallet+ app.
 * All color references across the app should import from here.
 */

// Primary brand color
export const PRIMARY = '#699E8A';
export const PRIMARY_LIGHT = '#699E8A20';

// Semantic colors
export const INCOME_COLOR = '#699E8A';
export const EXPENSE_COLOR = '#FF3B30';
export const DANGER = '#FF3B30';

// Neutral palette
export const BACKGROUND = '#F8F9FA';
export const CARD_BG = '#FFFFFF';
export const TEXT_PRIMARY = '#1a1a1a';
export const TEXT_SECONDARY = '#666';
export const TEXT_MUTED = '#888';
export const TEXT_PLACEHOLDER = '#999';
export const BORDER = '#F0F0F0';
export const BORDER_LIGHT = '#F8F8F8';
export const INPUT_BG = '#F5F5F5';

// Shorthand export for common usage
const Colors = {
  primary: PRIMARY,
  primaryLight: PRIMARY_LIGHT,
  income: INCOME_COLOR,
  expense: EXPENSE_COLOR,
  danger: DANGER,
  background: BACKGROUND,
  card: CARD_BG,
  text: TEXT_PRIMARY,
  textSecondary: TEXT_SECONDARY,
  textMuted: TEXT_MUTED,
  textPlaceholder: TEXT_PLACEHOLDER,
  border: BORDER,
  borderLight: BORDER_LIGHT,
  inputBg: INPUT_BG,
};

export default Colors;
