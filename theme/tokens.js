// theme/tokens.js
// Core design tokens — "দাবা" (Daba), a traditional Bengali chess.
// Palette & typography are inspired by Bengal craft: terracotta clay, Bengal
// red (লাল), brass/gold (সোনালি), indigo (নীল) and ivory/cream cloth.
// See GAME_DESIGN_SYSTEM / core/colors.md & typography.md.

export const colors = {
  '--bg-background': '#241813',
  '--bg-surface': '#33241B',
  '--bg-surface-elev': '#3F2C21',
  '--fg-primary': '#F6ECDA',
  '--fg-secondary': '#CBB89A',
  '--fg-muted': '#9A8468',
  '--primary': '#E0993A',
  '--primary-hover': '#F0AD4E',
  '--secondary': '#A8402E',
  '--secondary-hover': '#C1503B',
  '--success': '#7FB069',
  '--error': '#D45F4C',
  '--warning': '#E8A33D',
  '--info': '#6A89A8',
  '--board-light': '#EBD8A8',
  '--board-dark': '#B5492F',
  '--board-frame': '#2E1509',
  '--highlight-move': 'rgba(224,153,58,0.32)',
  '--highlight-selected': 'rgba(224,153,58,0.52)',
  '--highlight-check': 'rgba(212,95,76,0.62)',
  '--highlight-last-move': 'rgba(106,137,168,0.30)',
  '--scrim': 'rgba(20,12,8,0.66)',
  '--shadow-1': '0 2px 8px rgba(0,0,0,0.30)',
  '--shadow-2': '0 8px 24px rgba(0,0,0,0.36)',
  '--shadow-3': '0 16px 48px rgba(0,0,0,0.46)',
};

export const fonts = {
  '--font-display': "'Noto Serif Bengali', 'Noto Sans Bengali', Georgia, 'Songti SC', 'Times New Roman', serif",
  '--font-body': "'Noto Sans Bengali', 'Hind Siliguri', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
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
