// ui/settings.js
// Persisted settings (localStorage) with a single source of truth + subscribe.
const DEFAULT = {
  name: 'খেলোয়াড়',
  difficulty: 'medium',
  side: 'w',
  showLegalMoves: true,
  showCoordinates: true,
  showLastMove: true,
  pieceSet: 'classic',
  boardTheme: 'dark',
  sfxVolume: 0.9,
  musicVolume: 0.22,
  masterVolume: 1,
  music: false,
  reducedMotion: false,
  colorBlind: false,
  highContrast: false,
  uiScale: 'normal',
  locale: 'bn',
};

const KEY = 'regal-chess-settings';

let state = { ...DEFAULT };
const subs = [];

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...DEFAULT, ...JSON.parse(raw) };
  } catch {}
  return state;
}

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  subs.forEach((fn) => fn(state));
}

export function getSettings() {
  return state;
}

export function updateSettings(patch) {
  state = { ...state, ...patch };
  saveSettings();
  return state;
}

export function resetSettings() {
  state = { ...DEFAULT };
  saveSettings();
  return state;
}

export function subscribe(fn) {
  subs.push(fn);
}
