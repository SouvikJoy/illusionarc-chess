// view/pieces.js
// Piece sprite helpers for the folk-painted "দাবা" set.
// The assets were sliced from assets/pieces.png into per-piece transparent PNGs
// (assets/pieces/<color>-<kind>.png). Colors: সবুজ (green) = side w, লাল (red) = side b.
import { PIECE_DEFS } from './piece-defs.js';

export const KIND_ID = { P: 'regal-pawn', N: 'regal-knight', B: 'regal-bishop', R: 'regal-rook', Q: 'regal-queen', K: 'regal-king' };

const SPRITE = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };

// Minimal glyph map for the HUD captured-pieces readout (kept for compatibility).
export const PIECES = {
  P: '<use href="#regal-pawn" />',
  N: '<use href="#regal-knight" />',
  B: '<use href="#regal-bishop" />',
  R: '<use href="#regal-rook" />',
  Q: '<use href="#regal-queen" />',
  K: '<use href="#regal-king" />',
};

export function spriteSrc(kind, color) {
  const side = color === 'w' ? 'green' : 'red';
  return `assets/pieces/${side}-${SPRITE[kind] || 'pawn'}.png`;
}

export function spriteImg(kind, color, extra = '') {
  return `<img class="piece-img ${extra}" src="${spriteSrc(kind, color)}" alt="" />`;
}

// Inline a piece for the promotion popup / isolated badges (as a sprite <img>).
export function pieceSvg(kind, color) {
  return spriteImg(kind, color, 'promo-img');
}

export { PIECE_DEFS };
