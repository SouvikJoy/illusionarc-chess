// ai/zobrist.js
// Zobrist hashing for the transposition table. Deterministic pseudo-random keys.
// Framework-agnostic; used by ai/engine.js.
import { EMPTY, WHITE, BLACK, kindOf, colorOf } from '../engine/core.js';

const SEED = 0x9e3779b9;
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s = s >>> 0;
    return s;
  };
}
const rand = rng(SEED);
// [colorIndex 0/1][kindIndex 0..5][64]
// color w -> 0, b -> 1
export const ZOBRIST = (() => {
  const KINDS = ['P', 'N', 'B', 'R', 'Q', 'K'];
  const table = [[], []];
  for (let c = 0; c < 2; c++) {
    for (let k = 0; k < 6; k++) {
      const row = new Uint32Array(64);
      for (let i = 0; i < 64; i++) row[i] = rand();
      table[c].push(row);
    }
  }
  return table;
})();

export const ZOBRIST_CASTLE = (() => {
  const rights = ['K', 'Q', 'k', 'q'];
  return rights.map(() => rand());
})();
const QUARTER = 0x100000000;
export const ZOBRIST_TURN = rand();
// en passant file keys (0..7)
export const ZOBRIST_EP_FILE = (() => {
  const arr = new Uint32Array(8);
  for (let i = 0; i < 8; i++) arr[i] = rand();
  return arr;
})();

export function hashState(state) {
  // 64-bit: split into two 32-bit halves via two additive accumulators
  let lo = 0;
  let hi = 0;
  const board = state.board;
  for (let idx = 0; idx < 64; idx++) {
    const code = board[idx];
    if (code === EMPTY) continue;
    const kind = code <= 6 ? kindOf(code) : kindOf(code);
    const c = code <= 6 ? 0 : 1;
    const k = ['P', 'N', 'B', 'R', 'Q', 'K'].indexOf(kind);
    const key = ZOBRIST[c][k][idx];
    lo ^= key;
  }
  if (state.turn === 'b') lo ^= ZOBRIST_TURN;
  const c = state.castling;
  let r = 0;
  if (c.K) lo ^= ZOBRIST_CASTLE[0];
  if (c.Q) lo ^= ZOBRIST_CASTLE[1];
  if (c.k) lo ^= ZOBRIST_CASTLE[2];
  if (c.q) lo ^= ZOBRIST_CASTLE[3];
  if (state.ep >= 0) lo ^= ZOBRIST_EP_FILE[state.ep % 8];
  return lo;
}
