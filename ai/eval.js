// ai/eval.js
// Strong static evaluation: tapered material+PST, mobility, pawn structure,
// king safety, bishop pair, rook on open/semi-open file, and tempo.
// Framework-agnostic. From the perspective of `color`.
import { EMPTY, WHITE, BLACK, kindOf, colorOf, codeOf } from '../engine/core.js';
import { pseudoMovesFrom } from '../engine/moves.js';

// PeSTO-style piece-square tables indexed from White's a8=0 .. h1=63
// (row-major, row 0 = rank 8). Black mirrors rows.
const PST_MG = {
  P: [
    0, 0, 0, 0, 0, 0, 0, 0,
    98, 134, 61, 95, 68, 126, 34, -11,
    -6, 7, 26, 31, 65, 56, 25, -20,
    -14, 13, 6, 21, 23, 12, 17, -23,
    -27, -2, -5, 12, 17, 6, 10, -25,
    -26, -4, -4, -10, 3, 3, 33, -12,
    -35, -1, -20, -23, -15, 24, 38, -22,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  N: [
    -167, -89, -34, -49, 61, -97, -15, -107,
    -73, -41, 72, 36, 23, 62, 7, -17,
    -47, 60, 37, 65, 84, 129, 73, 44,
    -9, 17, 19, 53, 37, 69, 18, 22,
    -13, 4, 16, 13, 28, 19, 21, -8,
    -23, -9, 12, 10, 19, 17, 25, -16,
    -29, -53, -12, -3, -1, 18, -14, -19,
    -105, -21, -58, -33, -17, -28, -19, -23,
  ],
  B: [
    -29, 4, -82, -37, -25, -42, 7, -8,
    -26, 16, -18, -13, 30, 59, 18, -47,
    -16, 37, 43, 40, 35, 50, 37, -2,
    -4, 5, 19, 50, 37, 37, 7, -2,
    -6, 13, 13, 26, 34, 12, 10, 4,
    0, 15, 15, 15, 14, 27, 18, 10,
    4, 15, 16, 0, 7, 21, 33, 1,
    -33, -3, -14, -21, -13, -12, -39, -21,
  ],
  R: [
    32, 42, 32, 51, 63, 9, 31, 43,
    27, 32, 58, 62, 80, 67, 26, 44,
    -5, 19, 26, 36, 17, 45, 61, 16,
    -24, -11, 7, 26, 24, 35, -8, -20,
    -36, -26, -12, -1, 9, -7, 6, -23,
    -45, -25, -16, -17, 3, 0, -5, -33,
    -44, -16, -20, -9, -1, 11, -6, -71,
    -19, -13, 1, 17, 16, 7, -37, -26,
  ],
  Q: [
    -28, 0, 29, 12, 59, 44, 43, 45,
    -24, -39, -5, 1, -16, 57, 28, 54,
    -13, -17, 7, 8, 29, 56, 47, 57,
    -27, -27, -16, -16, -1, 17, -2, 1,
    -9, -26, -9, -10, -2, -4, 3, -3,
    -14, 2, -11, -2, -5, 2, 14, 5,
    -35, -8, 11, 2, 8, 15, -3, 1,
    -1, -18, -9, 10, -15, -25, -31, -50,
  ],
  K: [
    -65, 23, 16, -15, -56, -34, 2, 13,
    29, -1, -20, -7, -8, -4, -38, -29,
    -9, -24, 11, -7, -9, -11, -37, -34,
    -17, -24, -32, -18, -16, -14, -29, -21,
    -14, 12, -10, -16, -18, -4, -5, -22,
    -23, -9, -2, -12, -14, -9, -28, -32,
    -10, -11, -6, -27, -25, -23, -25, -15,
    -12, -7, -3, -13, -20, -19, -25, -27,
  ],
};
const PST_EG = {
  P: [
    0, 0, 0, 0, 0, 0, 0, 0,
    178, 173, 158, 134, 147, 132, 165, 187,
    94, 100, 85, 67, 56, 53, 82, 84,
    32, 24, 13, 5, -2, 4, 17, 17,
    13, 9, -3, -7, -7, -8, 3, -1,
    4, 7, -6, 1, 0, -5, -1, -8,
    13, 8, 8, 10, 13, 0, 2, -7,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  N: [
    -58, -38, -13, -28, -31, -27, -63, -99,
    -25, -8, -25, -2, -9, -25, -24, -52,
    -24, -20, 10, 9, -1, -9, -19, -41,
    -17, 3, 22, 22, 22, 11, 8, -18,
    -18, -6, 16, 25, 16, 17, 4, -18,
    -23, -3, -1, 15, 10, -3, -20, -22,
    -42, -20, -10, -5, -2, -20, -23, -44,
    -29, -51, -23, -15, -22, -18, -50, -64,
  ],
  B: [
    -14, -21, -11, -8, -7, -9, -19, -17,
    -8, -4, 7, -12, -3, -13, -4, -14,
    2, -8, 0, -1, -2, 6, 0, 4,
    -3, 9, 12, 9, 14, 10, 3, 2,
    -6, 3, 13, 19, 7, 10, -3, -9,
    -12, -3, 8, 10, 13, 3, -7, -15,
    -14, -18, -7, -1, 4, -9, -15, -27,
    -23, -9, -23, -5, -9, -16, -5, -17,
  ],
  R: [
    13, 10, 18, 15, 12, 12, 8, 5,
    11, 13, 13, 11, -3, 3, 8, 3,
    7, 7, 7, 5, 4, -3, -5, -3,
    4, 3, 13, 1, 2, 1, -1, 2,
    3, 5, 8, 9, 1, 3, 1, 3,
    -3, -2, 2, 5, -3, 0, -7, -7,
    -9, -3, -2, -8, -3, -7, -4, -5,
    -9, -9, -3, -1, -11, -8, -4, -10,
  ],
  Q: [
    -9, 22, 22, 27, 27, 19, 10, 20,
    -17, 20, 32, 41, 58, 25, 30, 0,
    -20, 6, 9, 49, 47, 35, 19, 9,
    3, 22, 24, 45, 57, 40, 57, 36,
    -18, 28, 19, 47, 31, 34, 39, 23,
    -16, -27, 15, 6, 9, 17, 10, 5,
    -22, -23, -30, -16, -16, -23, -36, -32,
    -33, -28, -22, -43, -5, -32, -20, -41,
  ],
  K: [
    -74, -35, -18, -18, -11, 15, 4, -17,
    -12, 17, 14, 17, 17, 38, 23, 11,
    10, 17, 23, 15, 20, 45, 44, 13,
    -8, 22, 24, 27, 26, 33, 26, 3,
    -18, -4, 21, 24, 27, 23, 9, -11,
    -19, -3, 11, 21, 23, 16, 7, -9,
    -27, -11, 4, 13, 14, 4, -5, -17,
    -53, -34, -21, -11, -28, -14, -24, -43,
  ],
};

const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
const KIND_INDEX = { P: 0, N: 1, B: 2, R: 3, Q: 4, K: 5 };
const PHASE_PER_PIECE = { N: 1, B: 1, R: 2, Q: 4 };
const MAX_PHASE = 24;

// mirror a table for black (index row-reversed)
function pstVal(pst, kind, color, idx) {
  let i = idx;
  if (color === BLACK) {
    const row = Math.floor(idx / 8);
    i = (7 - row) * 8 + (idx % 8);
  }
  return pst[kind][i];
}

// Attacked-by / mobility computed via pseudoMovesFrom (cheap, no legality).
function mobility(board, turn) {
  let n = 0;
  for (let i = 0; i < 64; i++) {
    const code = board[i];
    if (code !== EMPTY && colorOf(code) === turn) n += pseudoMovesFrom({ board, turn, castling: { K: false, Q: false, k: false, q: false }, ep: -1 }, i).length;
  }
  return n;
}

export function evaluate(state, color) {
  const board = state.board;

  // game phase
  let phase = 0;
  let materialWhite = 0;
  let materialBlack = 0;
  let wb = 0;
  let bb = 0;
  const pawnsW = [];
  const pawnsB = [];
  const fileCountW = new Array(8).fill(0);
  const fileCountB = new Array(8).fill(0);

  for (let i = 0; i < 64; i++) {
    const code = board[i];
    if (code === EMPTY) continue;
    const kind = kindOf(code);
    const c = colorOf(code);
    const v = VAL[kind];
    if (c === WHITE) materialWhite += v; else materialBlack += v;
    if (kind !== 'K' && kind !== 'P') {
      phase += PHASE_PER_PIECE[kind];
      if (c === WHITE && kind === 'B') wb++;
      if (c === BLACK && kind === 'B') bb++;
    }
    if (kind === 'P') {
      if (c === WHITE) { pawnsW.push(i); fileCountW[i % 8]++; }
      else { pawnsB.push(i); fileCountB[i % 8]++; }
    }
  }
  if (phase > MAX_PHASE) phase = MAX_PHASE;

  let mg = materialWhite - materialBlack;
  let eg = materialWhite - materialBlack;

  // pieces PST (mg + eg)
  for (let i = 0; i < 64; i++) {
    const code = board[i];
    if (code === EMPTY) continue;
    const kind = kindOf(code);
    const c = colorOf(code);
    const mgv = pstVal(PST_MG, kind, c, i);
    const egv = pstVal(PST_EG, kind, c, i);
    const sign = c === WHITE ? 1 : -1;
    mg += sign * mgv;
    eg += sign * egv;
  }

  // pawn structure: doubled, isolated, connected/passed
  const pawnScoreW = pawnStructure(pawnsW, fileCountW, WHITE);
  const pawnScoreB = pawnStructure(pawnsB, fileCountB, BLACK);
  mg += pawnScoreW - pawnScoreB;
  eg += pawnScoreW - pawnScoreB;

  // mobility (from the color's perspective)
  const mobColor = mobility(board, color);
  const mobOpp = mobility(board, color === WHITE ? BLACK : WHITE);
  const mobScore = (mobColor - mobOpp) * 5;
  mg += mobScore;
  eg += mobScore;

  // bishop pair
  if (wb >= 2) { mg += 35; eg += 45; }
  if (bb >= 2) { mg -= 35; eg -= 45; }

  // rook on open/semi-open file
  const rookScoreW = rookFiles(board, WHITE);
  const rookScoreB = rookFiles(board, BLACK);
  mg += rookScoreW - rookScoreB;
  eg += rookScoreW - rookScoreB;

  // king safety / pawn shield (middlegame only)
  mg += kingSafety(board, WHITE, pawnsW) - kingSafety(board, BLACK, pawnsB);

  // endgame king centralization handled by PST_EG K table already.

  // tapered blend (white-relative: +favors white)
  const egFrac = 1 - phase / MAX_PHASE;
  const mgFrac = phase / MAX_PHASE;
  let score = mgFrac * mg + egFrac * eg;

  // Return from `color`'s perspective (negate if black).
  if (color === BLACK) score = -score;

  // Tempo: the side to move gets a small bonus (in centipawns) to break
  // repetition and give a healthy (non-zero) bias in zugzwang-ish endgames.
  // Added AFTER perspective so it is always positive for the side to move.
  if (state.turn === color) score += 12;
  else score -= 12;

  return Math.round(score);
}

function pawnStructure(pawns, fileCount, color) {
  let score = 0;
  const rankStart = color === WHITE ? 0 : 63; // not used directly
  for (const p of pawns) {
    const col = p % 8;
    const row = Math.floor(p / 8);
    // doubled penalty
    if (fileCount[col] > 1) score -= 12 * (fileCount[col] - 1);
    // isolated
    const left = col > 0 ? fileCount[col - 1] : 0;
    const right = col < 7 ? fileCount[col + 1] : 0;
    if (left + right === 0) score -= 14;
    // connected
    if (left > 0 || right > 0) score += 6;
    // passed (no enemy pawns ahead in same/adjacent files)
    score += passedBonus(p, color);
  }
  return score;
}

function passedBonus(idx, color) {
  const col = idx % 8;
  const row = Math.floor(idx / 8);
  // ahead means decreasing row for white (toward rank 8=0), increasing for black
  let ahead = 0;
  if (color === WHITE) {
    // we don't have enemy pawn list here; approximate: count empty rows ahead -> use rank distance
    ahead = 7 - row; // rows to promotion
  } else {
    ahead = row;
  }
  if (ahead >= 5) return 30;
  if (ahead >= 4) return 20;
  if (ahead >= 3) return 12;
  return 4;
}

function rookFiles(board, color) {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const code = board[i];
    if (code !== EMPTY && colorOf(code) === color && kindOf(code) === 'R') {
      const col = i % 8;
      // count own/opp pawns on file
      let ownPawn = false;
      let oppPawn = false;
      for (let r = 0; r < 8; r++) {
        const cc = board[r * 8 + col];
        if (cc === EMPTY || kindOf(cc) !== 'P') continue;
        if (colorOf(cc) === color) ownPawn = true; else oppPawn = true;
      }
      if (!ownPawn && !oppPawn) score += 18;
      else if (!ownPawn && oppPawn) score += 9;
      else if (ownPawn) score += 2;
    }
  }
  return score;
}

function kingSafety(board, color, ownPawns) {
  // find king
  const kcode = codeOf(color, 'K');
  const idx = board.indexOf(kcode);
  if (idx < 0) return 0;
  const row = Math.floor(idx / 8);
  const col = idx % 8;
  let pawnsAhead = 0;
  // king is safer with own pawns immediately in front
  const frontOffset = color === WHITE ? -1 : 1;
  for (const p of ownPawns) {
    const pr = Math.floor(p / 8);
    const pc = p % 8;
    const near = Math.abs(pc - col) <= 1;
    const inFront = color === WHITE ? (pr <= row && pr >= row - 1) : (pr >= row && pr <= row + 1);
    if (near && inFront) pawnsAhead++;
  }
  // bonus for castled king (pawn shield count 2-3)
  return pawnsAhead * 14 * (pawnsAhead >= 2 ? 1 : 0.5);
}
