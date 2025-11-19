// colors.ts
// Paleta basada en seenode.com (solo se cambiaron colores)

// === BASE COLORS (nuevo) ===
export const baseColors = {
  blue: '#2D72D9',
  orange: '#0EA5E9',
  dark: '#0C1423',
  grey: '#93A1B8',
  white: '#ffffff',
  black: '#000000',
} as const;

// === LIGHT THEME ===
export const lightTheme = {
  name: 'light',

  background: '#F7FAFC',
  surface: '#EDF2F7',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#CBD5E1',

  primary: '#1D4ED8',
  primaryHover: '#1E40AF',

  accent: '#0EA5E9',
  accentHover: '#0284C7',

  danger: '#DC2626',

  success: '#16A34A',
  warning: '#D97706',

  card: '#FFFFFF',
  cardShadow: 'rgba(0, 0, 0, 0.08)',

  onPrimary: baseColors.white,
  onAccent: baseColors.white,
  onDanger: baseColors.white,
} as const;


// === DARK THEME ===
export const darkTheme = {
  name: 'dark',

  background: '#0B1220',
  surface: '#121A2B',
  text: '#E6EDF3',
  textMuted: '#93A1B8',
  border: '#1F2A44',

  primary: '#2D72D9',
  primaryHover: '#1B61C2',
  accent: '#22A8F0',
  accentHover: '#1C90D6',
  danger: '#EF4444',

  success: '#22C55E',
  warning: '#F59E0B',

  card: '#0E1626',
  cardShadow: 'rgba(0, 0, 0, 0.40)',

  onPrimary: baseColors.white,
  onAccent: baseColors.white,
  onDanger: baseColors.white,
} as const;


// === Exportación general ===
export type Theme = typeof lightTheme | typeof darkTheme;
export const themes = { light: lightTheme, dark: darkTheme };
export default themes;

// === Theme helpers ===
export const getTheme = (darkMode: boolean): Theme => (darkMode ? darkTheme : lightTheme);

export const getThemeStyles = (darkMode: boolean): Record<string, string> => {
  const t = getTheme(darkMode);
  return {
    '--background': t.background,
    '--surface': t.surface,
    '--text': t.text,
    '--text-muted': t.textMuted,
    '--border': t.border,
    '--primary': t.primary,
    '--primary-hover': t.primaryHover,
    '--accent': t.accent,
    '--accent-hover': t.accentHover,
    '--danger': t.danger,
    '--success': t.success,
    '--warning': t.warning,
    '--card': t.card,
    '--card-shadow': t.cardShadow,
    '--on-primary': t.onPrimary,
    '--on-accent': t.onAccent,
    '--on-danger': t.onDanger,
  };
};

// UI Class presets (no se cambiaron)
export const getUIClasses = () => {
  const themeClasses = 'min-h-screen bg-[var(--background)] text-[var(--text)]';
  const cardClasses = 'bg-[var(--card)] border border-[var(--border)] shadow-sm';
  const inputClasses = [
    'bg-[var(--surface)]',
    'border',
    'border-[var(--border)]',
    'text-[var(--text)]',
    'placeholder-[var(--text-muted)]',
    'focus:border-[var(--primary)]',
    'focus:ring-1',
    'focus:ring-[var(--primary)]',
  ].join(' ');

  const buttonClasses = {
    primary: [
      'bg-[var(--primary)]',
      'hover:bg-[var(--primary-hover)]',
      'text-[var(--on-primary)]',
      'border',
      'border-[var(--primary)]',
      'transition-colors',
      'duration-200',
    ].join(' '),
    secondary: [
      'bg-[var(--surface)]',
      'hover:bg-[var(--card)]',
      'text-[var(--text)]',
      'border',
      'border-[var(--border)]',
      'transition-colors',
      'duration-200',
    ].join(' '),
    danger: [
      'bg-[var(--danger)]',
      'hover:bg-red-500/90',
      'text-[var(--on-danger)]',
      'border',
      'border-[var(--danger)]',
      'transition-colors',
      'duration-200',
    ].join(' '),
    success: [
      'bg-[var(--success)]',
      'hover:bg-emerald-500/90',
      'text-white',
      'border',
      'border-[var(--success)]',
      'transition-colors',
      'duration-200',
    ].join(' '),
    warning: [
      'bg-[var(--warning)]',
      'hover:bg-amber-400/90',
      'text-black',
      'border',
      'border-[var(--warning)]',
      'transition-colors',
      'duration-200',
    ].join(' '),
    purple: [
      'bg-[var(--accent)]',
      'hover:bg-[var(--accent-hover)]',
      'text-[var(--on-accent)]',
      'border',
      'border-[var(--accent)]',
      'transition-colors',
      'duration-200',
    ].join(' '),
  } as const;

  return { themeClasses, cardClasses, inputClasses, buttonClasses };
};
