// ai/opening.js
// A compact opening book of well-known main lines. Replays each line and stores,
// for every reached position, the next move (as from/to indices). Positions are
// keyed by a canonical board structure string + turn + castling + en-passant.
import { DEFAULT_FEN, parseFen, EMPTY } from '../engine/core.js';
import { allLegalMoves, applyMoveRaw } from '../engine/moves.js';

// Lines as arrays of coordinate moves "e2e4".
const LINES = [
  ['e2e4'],
  ['e2e4', 'e7e5'],
  ['e2e4', 'e7e5', 'g1f3'],
  ['e2e4', 'e7e5', 'g1f3', 'b8c6'],
  ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'],
  ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
  ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5'],
  ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6'],
  ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6'],
  ['e2e4', 'e7e5', 'g1f3', 'g8f6'],
  ['e2e4', 'c7c5'],
  ['e2e4', 'c7c5', 'g1f3'],
  ['e2e4', 'c7c5', 'g1f3', 'd7d6'],
  ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4'],
  ['e2e4', 'c7c5', 'g1f3', 'b8c6'],
  ['e2e4', 'c7c5', 'g1f3', 'b8c6', 'd2d4'],
  ['e2e4', 'e7e6'],
  ['e2e4', 'e7e6', 'd2d4'],
  ['e2e4', 'e7e6', 'd2d4', 'd7d5'],
  ['e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1c3'],
  ['e2e4', 'c7c6'],
  ['e2e4', 'c7c6', 'd2d4'],
  ['e2e4', 'c7c6', 'd2d4', 'd7d5'],
  ['d2d4', 'g8f6'],
  ['d2d4', 'g8f6', 'c2c4'],
  ['d2d4', 'g8f6', 'c2c4', 'g7g6'],
  ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3'],
  ['d2d4', 'd7d5'],
  ['d2d4', 'd7d5', 'c2c4'],
  ['d2d4', 'd7d5', 'c2c4', 'e7e6'],
  ['c2c4'],
  ['g1f3'],
  ['e2e4', 'g8f6'],
];

const book = new Map();

function positionKey(state) {
  const b = state.board;
  let s = '';
  for (let i = 0; i < 64; i++) s += b[i] === EMPTY ? '.' : String(b[i]);
  const c = state.castling;
  return `${s}|${state.turn}|${+c.K}${+c.Q}${+c.k}${+c.q}|${state.ep}`;
}

function sqIdx(sq) {
  const col = sq.charCodeAt(0) - 97;
  return (8 - parseInt(sq[1], 10)) * 8 + col;
}

export function buildBook() {
  if (book.size) return;
  for (const line of LINES) {
    const state = parseFen(DEFAULT_FEN);
    for (const sq of line) {
      const from = sqIdx(sq.slice(0, 2));
      const to = sqIdx(sq.slice(2, 4));
      const key = positionKey(state);
      const move = allLegalMoves(state).find((m) => m.from === from && m.to === to);
      if (!move) break;
      if (!book.has(key)) {
        book.set(key, { from, to, promo: move.flags && move.flags.promo ? move.flags.promo : 'Q' });
      }
      const applied = applyMoveRaw(state, move);
      // copy state fields (applyMoveRaw returns a new plain state)
      state.board = applied.board;
      state.turn = applied.turn;
      state.castling = applied.castling;
      state.ep = applied.ep;
      state.halfMove = applied.halfMove;
      state.fullMove = applied.fullMove;
    }
  }
}

export function bookMove(state) {
  if (!book.size) buildBook();
  const entry = book.get(positionKey(state));
  return entry ? { from: entry.from, to: entry.to, promo: entry.promo } : null;
}
