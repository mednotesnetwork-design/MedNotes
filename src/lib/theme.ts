// MedNote uses the anatomy atlas palette from src/atlas-theme.css.
export const theme = {
  primary: 'var(--mn-mint-hsl)', primaryForeground: 'var(--mn-background-hsl)',
  secondary: 'var(--mn-surface-raised-hsl)', secondaryForeground: 'var(--mn-text-hsl)',
  background: 'var(--mn-background-hsl)', card: 'var(--mn-surface-hsl)',
  cardForeground: 'var(--mn-text-hsl)', border: 'var(--mn-border-hsl)',
  foreground: 'var(--mn-text-hsl)', mutedForeground: 'var(--mn-muted-hsl)',
  muted: 'var(--mn-surface-raised-hsl)', radiusBase: '7px', radiusLg: '9px',
  fontSerif: 'var(--mn-font)', fontSans: 'var(--mn-font)', fontArabic: 'Cairo, sans-serif',
} as const;
