// theme/theme.js
// Single source of truth for colors, fonts, spacing, radii, motion timings.
// Mirrors GDD §4. Loads into CSS variables and a JS token object.
import { colors, fonts, spacing, radii, motion } from './tokens.js';

const customProperties = {
  ...colors,
  ...radiusVars(radii),
  ...spacingVars(spacing),
  ...motionVars(motion),
  ...fontVars(fonts),
};

function radiusVars(r) {
  const out = {};
  for (const [k, v] of Object.entries(r)) out[`--radius-${k}`] = v;
  return out;
}
function spacingVars(s) {
  const out = {};
  for (const [k, v] of Object.entries(s)) out[`--space-${k}`] = v;
  return out;
}
function motionVars(m) {
  const out = {};
  for (const [k, v] of Object.entries(m)) out[`--motion-${k}`] = v;
  return out;
}
function fontVars(f) {
  const out = {};
  for (const [k, v] of Object.entries(f)) out[`--font-${k}`] = v;
  return out;
}

export function applyTheme(root) {
  root = root || document.documentElement;
  for (const [k, v] of Object.entries(customProperties)) {
    root.style.setProperty(k, v);
  }
}

export const tokens = { colors, fonts, spacing, radii, motion };

export function applyAccessibility(opts = {}) {
  const root = document.documentElement;
  if (opts.reducedMotion) root.dataset.reducedMotion = 'true';
  else delete root.dataset.reducedMotion;
  if (opts.colorBlind) root.dataset.colorBlind = 'true';
  else delete root.dataset.colorBlind;
  if (opts.highContrast) root.dataset.highContrast = 'true';
  else delete root.dataset.highContrast;
  if (opts.uiScale) root.dataset.uiScale = opts.uiScale; // small | normal | large
}
