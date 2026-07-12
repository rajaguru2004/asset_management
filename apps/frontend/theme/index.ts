/**
 * Theme tokens / constants.
 *
 * The runtime light/dark switch lives in theme/provider.tsx. These exported
 * constants are the single place to tweak accent colors and chart palettes so
 * the theme stays extensible without touching component code.
 */

export type ThemeMode = 'light' | 'dark';

export const ACCENT = {
  primary: '#4f46e5',
  primaryDark: '#4338ca',
  accent: '#0ea5e9',
} as const;

/** General-purpose categorical palette for charts. */
export const CHART_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#0ea5e9',
  '#8b5cf6',
] as const;

/** Fixed color per asset status, used by the dashboard chart. */
export const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#10b981',
  ASSIGNED: '#6366f1',
  UNDER_MAINTENANCE: '#f59e0b',
  RETIRED: '#64748b',
  LOST: '#ef4444',
  ALLOCATED: '#6366f1',
  RESERVED: '#0ea5e9',
  DISPOSED: '#94a3b8',
};

/** Shared recharts Tooltip contentStyle that follows the light/dark tokens. */
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  color: 'var(--foreground)',
  fontSize: '0.8rem',
} as const;
