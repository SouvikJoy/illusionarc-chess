// ai/engine.js
// A real chess engine: negamax with alpha-beta, quiescence search,
// transposition table, null-move pruning, killer/history move ordering,
// iterative deepening with time budget, and full mate/draw handling.
// Pure & framework-agnostic (client + server). Operates on the raw state
// {board, turn, castling, ep, halfMove, fullMove}.
import { EMPTY, WHITE, BLACK, kindOf, colorOf, codeOf } from '../engine/core.js';
import { allLegalMoves, inCheck, hasAnyLegalMove, applyMoveRaw } from '../engine/moves.js';
import { evaluate } from './eval.js';
import { hashState } from './zobrist.js';

const INF = 10000000;
const MATE = 1000000;
const DRAW = 0;

export class TT {
  constructor(size = 1 << 20) {
    this.size = size;
    this.table = new Array(size).fill(null);
  }
  clear() {
    for (let i = 0; i < this.size; i++) this.table[i] = null;
  }
  probe(hash) {
    return this.table[hash & (this.size - 1)];
  }
  store(hash, entry) {
    const idx = hash & (this.size - 1);
    const cur = this.table[idx];
    // replace if new is deeper or entry slot empty (simple replacement)
    if (!cur || entry.depth >= cur.depth) this.table[idx] = entry;
  }
}

export function createTT(size) {
  return new TT(size);
}

export function evaluateState(state, color) {
  return evaluate(state, color);
}

// ---------- ordering helpers ----------
function orderMoves(moves, board, killers, history, ply, ttMove) {
  const scored = moves.map((m) => {
    let s = 0;
    const from = m.from;
    const to = m.to;
    if (m.captured) s += 100000 + 10 * VAL[kindOf(m.captured)] - VAL[kindOf(board[from])];
    if (m.flags && m.flags.promo) s += 90000;
    if (ttMove && m.from === ttMove.from && m.to === ttMove.to) s += 200000;
    if (killers[ply] && killers[ply][0] && killers[ply][0].from === from && killers[ply][0].to === to) s += 80000;
    if (killers[ply] && killers[ply][1] && killers[ply][1].from === from && killers[ply][1].to === to) s += 70000;
    s += history[m.from * 64 + m.to] || 0;
    return { m, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.m);
}

const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };

// ---------- draw detection ----------
function isDraw(state, seen) {
  // fifty-move
  if (state.halfMove >= 100) return true;
  // threefold: current position has appeared 3x on this line (incl. current)
  if (seen && seen.length) {
    let cnt = 0;
    for (let i = 0; i < seen.length; i++) if (seen[i] === state._hash) cnt++;
    if (cnt >= 2) return true;
  }
  // insufficient material
  if (insufficient(state)) return true;
  return false;
}

function insufficient(state) {
  const b = state.board;
  const minors = [];
  for (let i = 0; i < 64; i++) {
    if (b[i] === EMPTY) continue;
    const k = kindOf(b[i]);
    if (k === 'K') continue;
    if (k === 'P' || k === 'R' || k === 'Q') return false;
    minors.push({ idx: i, code: b[i] });
  }
  if (minors.length === 0) return true;
  if (minors.length === 1) return true;
  if (minors.length === 2) {
    const [a, c] = minors;
    if (a.code === c.code && kindOf(a.code) === 'B') {
      return (a.idx % 8 + Math.floor(a.idx / 8)) % 2 === (c.idx % 8 + Math.floor(c.idx / 8)) % 2;
    }
  }
  return false;
}

function checkmateScore(ply) {
  return -(MATE - ply); // the side to move is mated
}

// ---------- negamax ----------
function negamax(state, depth, alpha, beta, ply, ctx) {
  const { deadline, tt, killers, history, seen, checkTime } = ctx;
  if (checkTime && Date.now() > deadline) throw 'timeout';

  const hash = hashState(state);
  state._hash = hash;

  // tt probe
  const entry = tt.probe(hash);
  if (entry && entry.depth >= depth) {
    if (entry.flag === 0) return entry.score; // exact
    if (entry.flag === 1 && entry.score >= beta) return entry.score; // lower bound
    if (entry.flag === 2 && entry.score <= alpha) return entry.score; // upper bound
  }

  // draw check + repetition
  if (isDraw(state, seen)) return DRAW;

  // terminal or shallow: go to quiescence at depth 0 (or check/stalemate)
  if (depth <= 0) return quiescence(state, alpha, beta, ply, ctx);


  // null-move pruning: skip if not in check, depth >= 3, and there's material
  if (depth >= 3 && !inCheck(state, state.turn) && hasMaterial(state)) {
    const nullState = applyNullMove(state);
    const nullHash = hashState(nullState);
    nullState._hash = nullHash;
    const r = depth - 1 - (depth >= 6 ? 3 : 2);
    if (r > 0) {
      let s = -negamax(nullState, r, -beta, -beta + 1, ply + 1, ctx);
      if (s >= beta) return beta;
    }
  }

  const moves = allLegalMoves(state);
  if (moves.length === 0) {
    return inCheck(state, state.turn) ? checkmateScore(ply) : DRAW;
  }

  const bestMove = entry && entry.move ? entry.move : null;
  const ordered = orderMoves(moves, state.board, killers, history, ply, bestMove);

  let bestScore = -INF;
  let best = null;
  let flag = 2; // upper bound

  for (const move of ordered) {
    if (checkTime && Date.now() > deadline) throw 'timeout';
    const after = applyMoveRaw(state, move);
    const afterHash = hashState(after);
    after._hash = afterHash;

    // repetition tracking for threefold within path (push hash count)
    seen.push(afterHash);

    let score;
    try {
      score = -negamax(after, depth - 1, -beta, -alpha, ply + 1, ctx);
    } finally {
      seen.pop();
    }

    if (score > bestScore) {
      bestScore = score;
      best = move;
      if (score > alpha) {
        alpha = score;
        flag = 0; // exact
      }
    }
    if (alpha >= beta) {
      flag = 1; // lower bound (cutoff)
      // update killer + history
      if (!move.captured) {
        if (!killers[ply]) killers[ply] = [null, null];
        if (!killers[ply][0] || killers[ply][0].to !== move.to) {
          killers[ply][1] = killers[ply][0];
          killers[ply][0] = move;
        }
      }
      history[move.from * 64 + move.to] = (history[move.from * 64 + move.to] || 0) + depth * depth;
      break;
    }
  }

  tt.store(hash, { depth, score: bestScore, flag, move: best });
  return bestScore;
}

function hasMaterial(state) {
  const b = state.board;
  for (let i = 0; i < 64; i++) {
    const k = b[i] === EMPTY ? null : kindOf(b[i]);
    if (k && (k === 'Q' || k === 'R')) return true;
    if (k && (k === 'B' || k === 'N') && hasNonPawnMaterial(b) > 1) return true;
  }
  return false;
}

function hasNonPawnMaterial(b) {
  let n = 0;
  for (let i = 0; i < 64; i++) {
    const it = b[i];
    if (it === EMPTY) continue;
    const k = kindOf(it);
    if (k !== 'P' && k !== 'K') n++;
  }
  return n;
}

function applyNullMove(state) {
  return {
    board: state.board,
    turn: state.turn === WHITE ? BLACK : WHITE,
    castling: state.castling,
    ep: -1,
    halfMove: state.halfMove + 1,
    fullMove: state.fullMove,
  };
}

// ---------- quiescence ----------
function quiescence(state, alpha, beta, ply, ctx) {
  const { deadline, checkTime, tt, seen } = ctx;
  if (checkTime && Date.now() > deadline) throw 'timeout';
  if (ply > 32) return evaluate(state, state.turn);

  const stand = evaluate(state, state.turn);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;

  const moves = allLegalMoves(state);
  if (moves.length === 0) return inCheck(state, state.turn) ? checkmateScore(ply) : DRAW;
  if (isDraw(state, seen)) return DRAW;

  // only consider captures + promotions + checks in quiescence
  const captures = moves.filter((m) => m.captured || (m.flags && m.flags.promo));
  if (captures.length === 0) return alpha;

  const ordered = orderMoves(captures, state.board, ctx.killers, ctx.history, ply, null);
  let best = alpha;
  for (const move of ordered) {
    if (checkTime && Date.now() > deadline) throw 'timeout';
    const after = applyMoveRaw(state, move);
    const score = -quiescence(after, -beta, -alpha, ply + 1, ctx);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) return alpha;
  }
  return best;
}

// ---------- public search ----------
export function search(rootState, maxDepth, options = {}) {
  const { timeCapMs = 0, randomness = 0, color, tt } = options;
  const deadline = timeCapMs ? Date.now() + timeCapMs : Infinity;
  const checkTime = timeCapMs > 0;
  const killers = new Array(128).fill(null);
  const history = new Uint32Array(64 * 64);
  const seen = [];
  const table = tt || new TT(1 << 20);
  const rootColor = color || rootState.turn;

  let bestMove = null;
  let completedDepth = 0;
  let nodes = 0;

  const ctx = { deadline, checkTime, tt: table, killers, history, seen };
  const origHash = hashState(rootState);
  rootState._hash = origHash;

  // iterative deepening
  for (let depth = 1; depth <= maxDepth; depth++) {
    try {
      let alpha = -INF;
      let beta = INF;
      let best = null;
      const moves = orderMoves(allLegalMoves(rootState), rootState.board, killers, history, 0, bestMove);
      for (const move of moves) {
        if (checkTime && Date.now() > deadline) break;
        const after = applyMoveRaw(rootState, move);
        const afterHash = hashState(after);
        after._hash = afterHash;
        seen.push(afterHash);
        let score;
        try {
          score = -negamax(after, depth - 1, -beta, -alpha, 1, ctx);
        } finally {
          seen.pop();
        }
        nodes++;
        if (score > alpha) {
          alpha = score;
          best = move;
        }
      }
      if (best) {
        bestMove = best;
        completedDepth = depth;
        // move ordering benefit: also store root hash
        table.store(origHash, { depth, score: alpha, flag: 0, move: best });
      }
    } catch (err) {
      if (err === 'timeout') break;
      throw err;
    }
  }

  // randomness: at low strength, occasionally pick sub-optimal
  if (randomness > 0 && bestMove) {
    const moves = allLegalMoves(rootState);
    if (moves.length > 1) {
      const topN = Math.max(1, Math.min(moves.length, Math.ceil(moves.length * (1 - randomness))));
      const ordered = orderMoves(moves, rootState.board, killers, history, 0, bestMove).slice(0, topN);
      if (Math.random() < randomness) {
        bestMove = ordered[Math.floor(Math.random() * ordered.length)] || bestMove;
      }
    }
  }

  return { move: bestMove, nodes, depth: completedDepth };
}

// Local simple copy of the value map used above (keeps eval independent)
const AI = { search, evaluate: evaluateState, TT, createTT };
export default AI;
