// engine/moves.js
// Move generation + legality. Pure, snapshot-based (returns new state objects
// or reports legality) so it is safe on both client and server.
import { EMPTY, WHITE, BLACK, KIND, isWhite, colorOf, kindOf, codeOf, inBounds } from './core.js';

const DIRS = {
  N: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
  B: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  R: [[-1, 0], [1, 0], [0, -1], [0, 1]],
  Q: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]],
  K: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]],
};

function pawnDir(color) {
  return color === WHITE ? -1 : 1;
}

function pieceAttacks(board, from, to) {
  const code = board[from];
  const kind = kindOf(code);
  const color = colorOf(code);
  const fr = Math.floor(from / 8);
  const fc = from % 8;
  const tr = Math.floor(to / 8);
  const tc = to % 8;
  const dr = tr - fr;
  const dc = tc - fc;

  if (kind === 'P') {
    const dir = pawnDir(color);
    return dc !== 0 && dr === dir && Math.abs(dc) === 1;
  }
  if (kind === 'N') {
    return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
  }
  if (kind === 'K') return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;

  const dirs = DIRS[kind];
  const slope = dirs.find(([rr, cc]) => rr !== 0 || cc !== 0);
  // find matching direction vector normalized
  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);
  let vector = null;
  if (kind === 'B' || kind === 'Q') {
    if (absDr === absDc) vector = [Math.sign(dr), Math.sign(dc)];
  }
  if (kind === 'R' || kind === 'Q') {
    if ((dr === 0) !== (dc === 0)) {
      vector = [Math.sign(dr), Math.sign(dc)];
    }
  }
  if (!vector) return false;
  // walk from the square after 'from' to 'to'
  let r = fr + vector[0];
  let c = fc + vector[1];
  while (r !== tr || c !== tc) {
    if (!inBounds(r, c) || board[r * 8 + c] !== EMPTY) return false;
    r += vector[0];
    c += vector[1];
  }
  return true;
}

// Convenience: is square 'to' attacked by 'byColor'?
export function isAttacked(board, to, byColor) {
  const tr = Math.floor(to / 8);
  const tc = to % 8;
  // pawns
  const pdir = byColor === WHITE ? 1 : -1; // a pawn of byColor attacks from row tr-pdir
  for (const dc of [-1, 1]) {
    const r = tr - pdir;
    const c = tc + dc;
    if (inBounds(r, c)) {
      const code = board[r * 8 + c];
      if (code !== EMPTY && colorOf(code) === byColor && kindOf(code) === 'P') return true;
    }
  }
  // knights
  for (const [dr, dc] of DIRS.N) {
    const r = tr + dr;
    const c = tc + dc;
    if (inBounds(r, c)) {
      const code = board[r * 8 + c];
      if (code !== EMPTY && colorOf(code) === byColor && kindOf(code) === 'N') return true;
    }
  }
  // king
  for (const [dr, dc] of DIRS.K) {
    const r = tr + dr;
    const c = tc + dc;
    if (inBounds(r, c)) {
      const code = board[r * 8 + c];
      if (code !== EMPTY && colorOf(code) === byColor && kindOf(code) === 'K') return true;
    }
  }
  // sliding
  for (const [dr, dc] of DIRS.R) {
    let r = tr + dr;
    let c = tc + dc;
    while (inBounds(r, c)) {
      const code = board[r * 8 + c];
      if (code !== EMPTY) {
        if (colorOf(code) === byColor) {
          const k = kindOf(code);
          if (k === 'R' || k === 'Q') return true;
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }
  for (const [dr, dc] of DIRS.B) {
    let r = tr + dr;
    let c = tc + dc;
    while (inBounds(r, c)) {
      const code = board[r * 8 + c];
      if (code !== EMPTY) {
        if (colorOf(code) === byColor) {
          const k = kindOf(code);
          if (k === 'B' || k === 'Q') return true;
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return false;
}

export function findKing(board, color) {
  const code = codeOf(color, 'K');
  const idx = board.indexOf(code);
  // fall back in case multiple; return first
  return board.indexOf(code);
}

// Castling is legal only if: king not currently in check, and the king does not
// pass through or land on an attacked square.
export function castlingLegal(state, towardKingSide) {
  const color = state.turn;
  const opp = color === WHITE ? BLACK : WHITE;
  const home = color === WHITE ? 7 : 0;
  const e = home * 8 + 4;
  const king = color === WHITE ? 'K' : 'k';
  const rights = state.castling;
  if (towardKingSide) {
    const has = color === WHITE ? rights.K : rights.k;
    if (!has) return false;
    const f = home * 8 + 5;
    const g = home * 8 + 6;
    if (state.board[f] !== EMPTY || state.board[g] !== EMPTY) return false;
    if (isAttacked(state.board, e, opp)) return false;
    if (isAttacked(state.board, f, opp)) return false;
    if (isAttacked(state.board, g, opp)) return false;
    return true;
  } else {
    const has = color === WHITE ? rights.Q : rights.q;
    if (!has) return false;
    const d = home * 8 + 3;
    const c = home * 8 + 2;
    const b = home * 8 + 1;
    if (state.board[d] !== EMPTY || state.board[c] !== EMPTY || state.board[b] !== EMPTY) return false;
    if (isAttacked(state.board, e, opp)) return false;
    if (isAttacked(state.board, d, opp)) return false;
    if (isAttacked(state.board, c, opp)) return false;
    return true;
  }
}

// Generate pseudo-legal moves for a piece at `from`. Returns array of
// {from, to, flags:{castle,enPassant,double,promo}, captured, promotedCode}.
// Includes only destination squares that are empty/enemy; NOT yet filtered for
// self-check (that is applied by legalMovesFor).
export function pseudoMovesFrom(state, from) {
  const { board } = state;
  const code = board[from];
  if (code === EMPTY) return [];
  const color = colorOf(code);
  const kind = kindOf(code);
  const fr = Math.floor(from / 8);
  const fc = from % 8;
  const moves = [];
  const push = (to, flags = {}) => {
    const target = board[to];
    const captured = target !== EMPTY && colorOf(target) !== color ? target : 0;
    moves.push({ from, to, captured, flags });
  };

  if (kind === 'P') {
    const dir = pawnDir(color);
    const startRow = color === WHITE ? 6 : 1;
    const promoRow = color === WHITE ? 0 : 7;
    // forward
    const f1 = (fr + dir) * 8 + fc;
    if (inBounds(fr + dir, fc) && board[f1] === EMPTY) {
      if (fr + dir === promoRow) {
        for (const pr of ['Q', 'R', 'B', 'N']) push(f1, { promo: pr });
      } else {
        push(f1);
        const f2 = (fr + dir * 2) * 8 + fc;
        if (fr === startRow && board[f2] === EMPTY) push(f2, { double: true });
      }
    }
    // captures
    for (const dc of [-1, 1]) {
      const nr = fr + dir;
      const nc = fc + dc;
      if (!inBounds(nr, nc)) continue;
      const to = nr * 8 + nc;
      const target = board[to];
      if (target !== EMPTY && colorOf(target) !== color) {
        if (nr === promoRow) for (const pr of ['Q', 'R', 'B', 'N']) push(to, { promo: pr });
        else push(to);
      } else if (target === EMPTY && state.ep === to) {
        push(to, { enPassant: true });
      }
    }
  } else if (kind === 'K') {
    for (const [dr, dc] of DIRS.K) {
      const nr = fr + dr;
      const nc = fc + dc;
      if (!inBounds(nr, nc)) continue;
      const to = nr * 8 + nc;
      const target = board[to];
      if (target === EMPTY || colorOf(target) !== color) push(to);
    }
    // castling
    const home = color === WHITE ? 7 : 0;
    if (fr === home && fc === 4) {
      const rights = state.castling;
      const kingRight = color === WHITE ? rights.K : rights.k;
      const queenRight = color === WHITE ? rights.Q : rights.q;
      // kingside: rook at h (col 7)
      if (kingRight) {
        if (board[home * 8 + 5] === EMPTY && board[home * 8 + 6] === EMPTY) {
          const rok = codeOf(color, 'R');
          if (board[home * 8 + 7] === rok) push(home * 8 + 6, { castle: 'K' });
        }
      }
      if (queenRight) {
        if (board[home * 8 + 3] === EMPTY && board[home * 8 + 2] === EMPTY && board[home * 8 + 1] === EMPTY) {
          const rok = codeOf(color, 'R');
          if (board[home * 8 + 0] === rok) push(home * 8 + 2, { castle: 'Q' });
        }
      }
    }
  } else if (kind === 'N') {
    for (const [dr, dc] of DIRS.N) {
      const nr = fr + dr;
      const nc = fc + dc;
      if (!inBounds(nr, nc)) continue;
      const to = nr * 8 + nc;
      const target = board[to];
      if (target === EMPTY || colorOf(target) !== color) push(to);
    }
  } else {
    for (const [dr, dc] of DIRS[kind]) {
      let nr = fr + dr;
      let nc = fc + dc;
      while (inBounds(nr, nc)) {
        const to = nr * 8 + nc;
        const target = board[to];
        if (target === EMPTY) {
          push(to);
        } else {
          if (colorOf(target) !== color) push(to);
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }
  return moves;
}

// Build a state reflecting a move, WITHOUT validating self-check.
// Returns a new state object (does not mutate input). Used to test legality.
export function applyMoveRaw(state, move) {
  const board = new Int8Array(state.board);
  const color = colorOf(board[move.from]);
  const opp = color === WHITE ? BLACK : WHITE;
  const fr = Math.floor(move.from / 8);
  const fc = move.from % 8;
  const tr = Math.floor(move.to / 8);
  const tc = move.to % 8;

  board[move.to] = board[move.from];
  board[move.from] = EMPTY;

  // promotion
  if (move.flags && move.flags.promo) {
    board[move.to] = codeOf(color, move.flags.promo);
  }
  // en passant
  if (move.flags && move.flags.enPassant) {
    const capturedRow = color === WHITE ? tr + 1 : tr - 1;
    board[capturedRow * 8 + tc] = EMPTY;
  }
  // castling rook move
  if (move.flags && move.flags.castle) {
    if (move.flags.castle === 'K') {
      const home = color === WHITE ? 7 : 0;
      board[home * 8 + 5] = codeOf(color, 'R');
      board[home * 8 + 7] = EMPTY;
    } else {
      const home = color === WHITE ? 7 : 0;
      board[home * 8 + 3] = codeOf(color, 'R');
      board[home * 8 + 0] = EMPTY;
    }
  }

  const castling = { ...state.castling };
  const movedPiece = board[move.to];
  const movedKind = kindOf(movedPiece);
  if (movedKind === 'K') {
    if (color === WHITE) {
      castling.K = false;
      castling.Q = false;
    } else {
      castling.k = false;
      castling.q = false;
    }
  }
  // rook moved or captured removes rights
  const cornerOf = (idx) => {
    if (idx === 56) return 'Q';
    if (idx === 63) return 'K';
    if (idx === 0) return 'q';
    if (idx === 7) return 'k';
    return null;
  };
  const touched = (idx) => {
    const r = cornerOf(idx);
    if (r) castling[r] = false;
  };
  touched(move.from);
  touched(move.to);
  if (move.captured) {
    const cKind = kindOf(move.captured);
    if (cKind === 'R') touched(move.to);
  }

  // halfmove clock
  let halfMove = state.halfMove + 1;
  if (movedKind === 'P' || move.captured) halfMove = 0;

  // en passant target
  let ep = -1;
  if (movedKind === 'P' && move.flags && move.flags.double) {
    ep = color === WHITE ? move.from - 8 : move.from + 8;
  }

  let fullMove = state.fullMove;
  if (color === BLACK) fullMove += 1;

  return {
    board,
    turn: opp,
    castling,
    ep,
    halfMove,
    fullMove,
  };
}

// True if the side to move's king is attacked.
export function inCheck(state, color = state.turn) {
  const king = findKing(state.board, color);
  if (king < 0) return false;
  return isAttacked(state.board, king, color === WHITE ? BLACK : WHITE);
}

export function legalMovesFor(state, from) {
  const piece = state.board[from];
  if (piece === EMPTY) return [];
  if (colorOf(piece) !== state.turn) return [];
  const avail = pseudoMovesFrom(state, from);
  const legal = [];
  for (const mv of avail) {
    if (mv.flags && mv.flags.castle) {
      if (!castlingLegal(state, mv.flags.castle === 'K')) continue;
      // fall through to self-check too
    }
    const after = applyMoveRaw(state, mv);
    if (!inCheck(after, state.turn)) legal.push(mv);
  }
  return legal;
}

export function allLegalMoves(state) {
  const out = [];
  for (let i = 0; i < 64; i++) {
    const code = state.board[i];
    if (code !== EMPTY && colorOf(code) === state.turn) {
      out.push(...legalMovesFor(state, i));
    }
  }
  return out;
}

export function hasAnyLegalMove(state) {
  for (let i = 0; i < 64; i++) {
    const code = state.board[i];
    if (code !== EMPTY && colorOf(code) === state.turn && legalMovesFor(state, i).length) {
      return true;
    }
  }
  return false;
}
