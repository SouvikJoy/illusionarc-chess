// view/pieces.js
// Public piece helpers built on the detailed SVG defs (view/piece-defs.js).
// `pieceSvg` returns a self-contained <svg><use> for the given kind+color.
// `PIECES` is used by the HUD for captured-piece glyphs.
import { PIECE_DEFS } from './piece-defs.js';

export const KIND_ID = { P: 'regal-pawn', N: 'regal-knight', B: 'regal-bishop', R: 'regal-rook', Q: 'regal-queen', K: 'regal-king' };

// Minimal glyph map for the HUD captured-pieces readout (kept for compatibility).
export const PIECES = {
  P: '<use href="#regal-pawn" />',
  N: '<use href="#regal-knight" />',
  B: '<use href="#regal-bishop" />',
  R: '<use href="#regal-rook" />',
  Q: '<use href="#regal-queen" />',
  K: '<use href="#regal-king" />',
};

// Inline a piece as a compact solo SVG using the shared defs.
export function pieceSvg(kind, color) {
  const isWhite = color === 'w';
  return `<svg viewBox="0 0 170 170" fill="none" xmlns="http://www.w3.org/2000/svg" class="piece-badge ${isWhite ? 'white-svg' : 'black-svg'}" style="--fill:${isWhite ? '#F2EDE0' : '#23262E'};--stroke:${isWhite ? '#6B5A3E' : '#3A3F4A'}"><use href="#${KIND_ID[kind] || 'regal-pawn'}" /></svg>`;
}

export { PIECE_DEFS };
