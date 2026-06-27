interface AppLogoProps { size?: number }

export function AppLogo({ size = 38 }: AppLogoProps) {
  const id = `logo-${size}`;
  return (
    <svg
      width={size}
      height={Math.round(size * 1.12)}
      viewBox="0 0 32 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MedNotes"
    >
      <defs>
        <linearGradient id={`${id}-leaf`} x1="16" y1="2" x2="16" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B6E3BF" />
          <stop offset="100%" stopColor="#3B8A4E" />
        </linearGradient>
        <linearGradient id={`${id}-heart`} x1="16" y1="27" x2="16" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFC2D3" />
          <stop offset="100%" stopColor="#DC608A" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.14" />
        </filter>
      </defs>

      {/* ── Thin stem ───────────────────────────── */}
      <line
        x1="16" y1="25" x2="16" y2="11"
        stroke="#4A9A56" strokeWidth="1.4" strokeLinecap="round"
      />

      {/* ── Left leaf ───────────────────────────── */}
      <path
        d="M16 19 C13 15 7 14.5 7 18.5 C7 22.5 11.5 23.5 16 21 Z"
        fill={`url(#${id}-leaf)`}
        filter={`url(#${id}-shadow)`}
      />

      {/* ── Right leaf ──────────────────────────── */}
      <path
        d="M16 19 C19 15 25 14.5 25 18.5 C25 22.5 20.5 23.5 16 21 Z"
        fill={`url(#${id}-leaf)`}
        filter={`url(#${id}-shadow)`}
      />

      {/* ── Top bud (two small leaves) ──────────── */}
      <path
        d="M16 11 C14.5 7.5 11.5 8 11.5 11 C11.5 14 14 14.5 16 13 Z"
        fill={`url(#${id}-leaf)`}
        filter={`url(#${id}-shadow)`}
      />
      <path
        d="M16 11 C17.5 7.5 20.5 8 20.5 11 C20.5 14 18 14.5 16 13 Z"
        fill={`url(#${id}-leaf)`}
        filter={`url(#${id}-shadow)`}
      />

      {/* ── Small pink heart ────────────────────── */}
      <path
        d="M16 28 C16 28 10.5 25.5 10.5 28.5 C10.5 31 13 33.5 16 36 C19 33.5 21.5 31 21.5 28.5 C21.5 25.5 16 28 16 28 Z"
        fill={`url(#${id}-heart)`}
        filter={`url(#${id}-shadow)`}
      />
    </svg>
  );
}
