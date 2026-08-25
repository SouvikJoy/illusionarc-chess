// engine/core.js
// Board representation, square/index helpers, FEN parse/serialize.
// Framework-agnostic: no DOM, no Node APIs. Reused by client + server + tests.

export const EMPTY = 0;

// Piece codes: white P=1..K=6, black P=7..K=12. kindOf = (code-1)%6.
export const WHITE = 'w';
export const BLACK = 'b';

export const KIND = ['P', 'N', 'B', 'R', 'Q', 'K'];

export const isWhite = (code) => code <= 6 && code !== 0;
export const colorOf = (code) => (code === 0 ? null : code <= 6 ? WHITE : BLACK);
export const kindOf = (code) => (code === 0 ? null : KIND[(code - 1) % 6]);
export const codeOf = (color, kind) => (color === WHITE ? KIND.indexOf(kind) + 1 : KIND.indexOf(kind) + 7);
export const nameOfSquare = (idx) => {
  const row = Math.floor(idx / 8); // 0 = rank8
  const col = idx % 8; // 0 = file a
  return String.fromCharCode(97 + col) + (8 - row);
};
export const idxOfSquare = (sq) => {
  const col = sq.charCodeAt(0) - 97;
  const row = 8 - parseInt(sq[1], 10);
  return row * 8 + col;
};
export const inBounds = (row, col) => row >= 0 && row < 8 && col >= 0 && col < 8;

// --- FEN ---
export function fenToBoard(fen) {
  const board = new Int8Array(64);
  const placement = fen.split(' ')[0];
  let i = 0;
  for (const ch of placement) {
    if (ch === '/') continue;
    if (ch >= '1' && ch <= '8') {
      i += parseInt(ch, 10);
    } else {
      const kind = ch.toUpperCase();
      const color = ch === ch.toLowerCase() ? BLACK : WHITE;
      board[i++] = codeOf(color, kind);
    }
  }
  return board;
}

export function boardToFen(board) {
  let out = '';
  for (let row = 0; row < 8; row++) {
    let empty = 0;
    for (let col = 0; col < 8; col++) {
      const code = board[row * 8 + col];
      if (code === 0) {
        empty++;
        continue;
      }
      if (empty) {
        out += empty;
        empty = 0;
      }
      const kind = kindOf(code);
      const ch = colorOf(code) === WHITE ? kind.toUpperCase() : kind.toLowerCase();
      out += ch;
    }
    if (empty) out += empty;
    if (row < 7) out += '/';
  }
  return out;
}

export function parseFen(fen) {
  const parts = fen.trim().split(/\s+/);
  const board = fenToBoard(fen);
  const turn = parts[1] === 'b' ? BLACK : WHITE;
  const c = (parts[2] || '-') || '-';
  const castling = {
    K: c.includes('K'),
    Q: c.includes('Q'),
    k: c.includes('k'),
    q: c.includes('q'),
  };
  const ep = parts[3] && parts[3] !== '-' ? idxOfSquare(parts[3]) : -1;
  const halfMove = parseInt(parts[4] || '0', 10);
  const fullMove = parseInt(parts[5] || '1', 10);
  return { board, turn, castling, ep, halfMove, fullMove };
}

export function fenOf(parsed) {
  const b = boardToFen(parsed.board);
  const c = [];
  if (parsed.castling.K) c.push('K');
  if (parsed.castling.Q) c.push('Q');
  if (parsed.castling.k) c.push('k');
  if (parsed.castling.q) c.push('q');
  const ep = parsed.ep >= 0 ? nameOfSquare(parsed.ep) : '-';
  return `${b} ${parsed.turn} ${c.length ? c.join('') : '-'} ${ep} ${parsed.halfMove} ${parsed.fullMove}`;
}

export const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const START = () => parseFen(DEFAULT_FEN);
