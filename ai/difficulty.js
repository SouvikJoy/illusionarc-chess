// ai/difficulty.js
// Difficulty configuration (per GDD §8): search depth, randomness, time budget
// and whether the opening book is used. Higher levels are stronger/faster.

export const DIFFICULTY = {
  easy: { label: 'সহজ',      depth: 1, randomness: 0.65, timeCapMs: 120,  thinkMs: 300,  book: false },
  medium: { label: 'মাঝারি', depth: 2, randomness: 0.12, timeCapMs: 700,  thinkMs: 650,  book: true },
  hard: { label: 'কঠিন',    depth: 3, randomness: 0.0,  timeCapMs: 1600, thinkMs: 900,  book: true },
  master: { label: 'মাস্টার', depth: 5, randomness: 0.0, timeCapMs: 4000, thinkMs: 800, book: true },
};

export function level(name) {
  return DIFFICULTY[name] || DIFFICULTY.medium;
}
