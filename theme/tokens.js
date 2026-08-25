// theme/tokens.js
// Core design tokens (GDD §4.1-4.5, foundations.md, colors.md, typography.md,
// motion.md).
export const colors = {
  '--bg-background': '#0E1220',
  '--bg-surface': '#1A2032',
  '--bg-surface-elev': '#232B42',
  '--fg-primary': '#F5F1E8',
  '--fg-secondary': '#A9B2C6',
  '--fg-muted': '#6C7690',
  '--primary': '#D8B24A',
  '--primary-hover': '#E6C766',
  '--secondary': '#3E5C8B',
  '--success': '#58C185',
  '--error': '#E0604E',
  '--warning': '#E6B24A',
  '--info': '#5A8BD8',
  '--board-light': '#F0E4CE',
  '--board-dark': '#8A5A3B',
  '--board-frame': '#241D14',
  '--highlight-move': 'rgba(216,178,74,0.32)',
  '--highlight-selected': 'rgba(216,178,74,0.52)',
  '--highlight-check': 'rgba(224,96,78,0.60)',
  '--highlight-last-move': 'rgba(90,139,216,0.28)',
  '--scrim': 'rgba(8,10,18,0.62)',
  '--shadow-1': '0 2px 8px rgba(0,0,0,0.28)',
  '--shadow-2': '0 8px 24px rgba(0,0,0,0.34)',
  '--shadow-3': '0 16px 48px rgba(0,0,0,0.42)',
};

export const fonts = {
  '--font-display': "'Playfair Display', Georgia, serif",
  '--font-body': "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
  xxxl: '48px',
};

export const radii = {
  sm: '6px',
  md: '12px',
  lg: '20px',
  xl: '28px',
  pill: '999px',
};

export const motion = {
  instant: '0.08s',
  fast: '0.14s',
  normal: '0.24s',
  slow: '0.42s',
  celebration: '0.8s',
};
