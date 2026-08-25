// engine/engine.js
// GameObject: state, move application, undo, SAN notation, result detection.
import { EMPTY, WHITE, BLACK, kindOf, colorOf, codeOf, nameOfSquare, START, fenOf, parseFen, DEFAULT_FEN } from './core.js';
import { legalMovesFor, allLegalMoves, hasAnyLegalMove, applyMoveRaw, inCheck, findKing } from './moves.js';

const FILES = 'abcdefgh';

function sanOf(state, move) {
  if (move.flags && move.flags.castle) return move.flags.castle === 'K' ? 'O-O' : 'O-O-O';
  const kind = kindOf(state.board[move.from]);
  const captured = move.captured;
  let base;
  if (kind === 'P') {
    const to = nameOfSquare(move.to);
    base = captured ? `${FILES[move.from % 8]}x${to}` : to;
  } else {
    // disambiguation
    const others = allLegalMoves(state).filter(
      (m) => m.from !== move.from && m.to === move.to && kindOf(state.board[m.from]) === kind
    );
    let disambig = '';
    if (others.length) {
      const sameFile = others.some((m) => m.from % 8 === move.from % 8);
      const sameRank = others.some((m) => Math.floor(m.from / 8) === Math.floor(move.from / 8));
      if (!sameFile) disambig = FILES[move.from % 8];
      else if (!sameRank) disambig = String(8 - Math.floor(move.from / 8));
      else disambig = nameOfSquare(move.from);
    }
    base = `${kind}${disambig}${captured ? 'x' : ''}${nameOfSquare(move.to)}`;
  }
  if (move.flags && move.flags.promo) base += `=${move.flags.promo}`;
  return base;
}

export class Game {
  constructor(fen = DEFAULT_FEN) {
    this.p = parseFen(fen);
    this.history = []; // {move, san, fenBefore, fenAfter}
    this._currentSan = '';
  }

  setFen(fen) {
    this.p = parseFen(fen);
    this.history = [];
    this._currentSan = '';
  }

  get turn() {
    return this.p.turn;
  }
  get board() {
    return this.p.board;
  }
  get castling() {
    return this.p.castling;
  }
  get ep() {
    return this.p.ep;
  }

  fen() {
    return fenOf(this.p);
  }

  inCheck(color = this.p.turn) {
    return inCheck(this.p, color);
  }

  legalMoves(from) {
    if (typeof from === 'string') from = this.#idx(from);
    return legalMovesFor(this.p, from);
  }

  allLegalMoves() {
    return allLegalMoves(this.p);
  }

  pieces() {
    const list = [];
    for (let i = 0; i < 64; i++) {
      if (this.p.board[i] !== EMPTY) {
        list.push({ square: nameOfSquare(i), idx: i, color: colorOf(this.p.board[i]), kind: kindOf(this.p.board[i]) });
      }
    }
    return list;
  }

  pieceAt(sq) {
    const idx = typeof sq === 'string' ? this.#idx(sq) : sq;
    const c = this.p.board[idx];
    return c === EMPTY ? null : { color: colorOf(c), kind: kindOf(c) };
  }

  #idx(sq) {
    const col = sq.charCodeAt(0) - 97;
    const row = 8 - parseInt(sq[1], 10);
    return row * 8 + col;
  }

  // Try to make a move. Returns {san, fen} or null if illegal.
  move(from, to, promo) {
    const fIdx = typeof from === 'string' ? this.#idx(from) : from;
    const tIdx = typeof to === 'string' ? this.#idx(to) : to;
    const legal = legalMovesFor(this.p, fIdx);
    let mk = legal.find((m) => m.to === tIdx && (!m.flags.promo || m.flags.promo === promo || (promo === 'Q' && m.flags.promo)));
    // prefer an exact promo match; else default to the only one if no promo given
    if (!mk && legal.some((m) => m.to === tIdx)) {
      const cands = legal.filter((m) => m.to === tIdx);
      if (cands.length === 1 && cands[0].flags.promo) mk = { ...cands[0], flags: { ...cands[0].flags, promo: promo || 'Q' } };
    }
    if (!mk) return null;

    const fenBefore = this.fen();
    const san = sanOf(this.p, mk);
    const after = applyMoveRaw(this.p, mk);
    this.p = after;
    const fenAfter = this.fen();
    this.history.push({ move: mk, san, fenBefore, fenAfter });
    this._currentSan = san;
    return { san, fen: fenAfter, move: mk };
  }

  undo() {
    const last = this.history.pop();
    if (!last) return null;
    this.p = parseFen(last.fenBefore);
    this._currentSan = last.san;
    return last;
  }

  result() {
    // Checkmate / stalemate / material / 50-move / threefold
    const turn = this.p.turn;
    const check = this.inCheck(turn);
    const canMove = hasAnyLegalMove(this.p);
    if (check && !canMove) return { over: true, type: 'checkmate', winner: turn === WHITE ? BLACK : WHITE };
    if (!check && !canMove) return { over: true, type: 'stalemate', winner: null };
    if (this.insufficientMaterial()) return { over: true, type: 'insufficient', winner: null };
    if (this.p.halfMove >= 100) return { over: true, type: 'fifty', winner: null };
    if (this.threefoldRepetition()) return { over: true, type: 'threefold', winner: null };
    return { over: false };
  }

  insufficientMaterial() {
    const b = this.p.board;
    const minors = [];
    for (let i = 0; i < 64; i++) {
      if (b[i] === EMPTY) continue;
      const k = kindOf(b[i]);
      if (k === 'K') continue;
      if (k === 'P' || k === 'R' || k === 'Q') return false;
      minors.push({ idx: i, code: b[i] });
    }
    if (minors.length === 0) return true; // K vs K
    if (minors.length === 1) return true; // K+minor vs K
    if (minors.length === 2) {
      const [a, c] = minors;
      if (a.code === c.code && kindOf(a.code) === 'B') {
        return (a.idx % 8 + Math.floor(a.idx / 8)) % 2 === (c.idx % 8 + Math.floor(c.idx / 8)) % 2;
      }
    }
    return false;
  }

  threefoldRepetition() {
    const counts = new Map();
    const positions = [];
    // start from initial fen (without clock) then each fenAfter
    let fen = this.history.length ? parseFen(this.history[0].fenBefore) : this.p;
    const key = (p) => `${p.board.join(',')}|${p.turn}|${p.castling.K}${p.castling.Q}${p.castling.k}${p.castling.q}|${p.ep}`;
    counts.set(key(fen), 1);
    for (const h of this.history) {
      const p = parseFen(h.fenAfter);
      const k = key(p);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return [...counts.values()].some((n) => n >= 3);
  }

  pgn() {
    let out = '';
    this.history.forEach((h, i) => {
      out += h.san + ' ';
    });
    return out.trim();
  }

  // last move in SAN (for status display)
  get lastSan() {
    return this._currentSan;
  }
}
