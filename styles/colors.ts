// colors.ts
// Paleta inspirada en Auth0 con versiones Light y Dark Theme.

export const baseColors = {
  blue: '#44c7f4',   // Auth0 blue
  orange: '#eb5424', // Auth0 orange
  dark: '#16214d',   // Auth0 dark navy
  grey: '#d0d2d3',   // Neutral grey
  white: '#ffffff',
  black: '#000000',
} as const;

// === LIGHT THEME ===
export const lightTheme = {
  name: 'light',

  background: baseColors.white,
  // Slightly darker surface for better separation in light mode
  surface: '#f3f4f6',
  // Higher contrast body text in light mode
  text: '#111827', // gray-900
  // Darker muted text for readability on white
  textMuted: '#4b5563', // gray-600
  // Darker border to improve delineation of cards/inputs
  border: '#d1d5db', // gray-300

  primary: baseColors.dark,
  primaryHover: '#1f2b6b',
  accent: baseColors.blue,
  accentHover: '#2fb7e6',
  danger: baseColors.orange,

  success: '#3ccf91',
  warning: '#f5a623',

  // Para botones o fondos destacados
  card: '#ffffff',
  cardShadow: 'rgba(0, 0, 0, 0.08)',

  // Texto sobre fondos oscuros
  onPrimary: baseColors.white,
  onAccent: baseColors.white,
  onDanger: baseColors.white,
} as const;

// === DARK THEME ===
export const darkTheme = {
  name: 'dark',

  background: '#0f172a',
  surface: '#1e293b',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  border: '#334155',

  primary: baseColors.blue,
  primaryHover: '#33b5e6',
  accent: baseColors.orange,
  accentHover: '#ff6734',
  danger: '#f87171',

  success: '#22c55e',
  warning: '#facc15',

  // Para tarjetas y elementos flotantes
  card: '#1e293b',
  cardShadow: 'rgba(0, 0, 0, 0.4)',

  // Texto sobre botones/accent
  onPrimary: baseColors.white, // ensure good contrast on primary in dark mode
  onAccent: baseColors.white,
  onDanger: baseColors.white,
} as const;

// === Exportación general ===
// Theme must support both light and dark variants
export type Theme = typeof lightTheme | typeof darkTheme;
export const themes = { light: lightTheme, dark: darkTheme };
export default themes;

// === Theme helpers ===
export const getTheme = (darkMode: boolean): Theme => (darkMode ? darkTheme : lightTheme);

// Expose CSS variables for use with Tailwind arbitrary values (e.g., bg-[var(--background)])
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

// UI class presets based on theme CSS variables
export const getUIClasses = () => {
  // Use CSS variables consistently to allow easy theme switching
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
    // Map purple variant to accent for a consistent palette
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
