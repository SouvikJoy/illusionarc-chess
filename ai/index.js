// ai/index.js
// High-level facade: `aiMove(game, difficulty)` returns a legal move object.
// The book is consulted first for known openings; otherwise the engine searches.
import { search, TT } from './engine.js';
import { level } from './difficulty.js';
import { bookMove } from './opening.js';

// shared transposition table reused across moves for speed
let sharedTT = null;

export function aiMove(game, difficultyName = 'medium') {
  const cfg = level(difficultyName);
  const state = game.p; // raw state {board, turn, castling, ep, halfMove, fullMove}
  const moveIndex = game.history ? game.history.length : 0;

  // opening book: only for the first ~10 plies and on non-random levels
  if (moveIndex <= 12 && cfg.book !== false) {
    const bm = bookMove(state);
    if (bm) return bm;
  }

  if (!sharedTT) sharedTT = new TT(1 << 21);

  const { move } = search(state, cfg.depth, {
    randomness: cfg.randomness,
    timeCapMs: cfg.timeCapMs,
    color: state.turn,
    tt: sharedTT,
  });
  return move || null;
}

export function aiMoveFrom(game, cfg) {
  const state = game.p;
  const { move } = search(state, cfg.depth, {
    randomness: cfg.randomness,
    timeCapMs: cfg.timeCapMs,
    color: state.turn,
  });
  return move || null;
}
