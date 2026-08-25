// view/board.js
// Board renderer modeled on the reference design: tiles are a CSS grid of
// <button> rows; pieces are PERSISTENT elements positioned via CSS custom props
// (--pos-row/--pos-col), so only a moved piece transitions. Legal move/capture
// markers are rendered as mini piece silhouettes inside target tiles.
import { PIECE_DEFS } from './piece-defs.js';
import { nameOfSquare, kindOf, colorOf, codeOf, EMPTY } from '../engine/core.js';

const KIND_ID = { P: 'regal-pawn', N: 'regal-knight', B: 'regal-bishop', R: 'regal-rook', Q: 'regal-queen', K: 'regal-king' };

export class BoardView {
  constructor(container) {
    this.container = container;
    this.orientation = 'w';
    this.rows = {};
    this.tiles = {}; // "row-col" -> tile el
    this.pieceEls = new Map(); // idx -> piece el
    this._built = false;
  }

  // inject shared SVG defs once (per document)
  static ensureDefs() {
    if (document.getElementById('regal-piece-defs')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'regal-defs');
    svg.setAttribute('aria-hidden', 'true');
    svg.id = 'regal-piece-defs';
    svg.innerHTML = PIECE_DEFS;
    document.body.appendChild(svg);
  }

  build() {
    BoardView.ensureDefs();
    this.container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'board-frame';
    wrap.id = 'board';
    this.boardEl = wrap;
    this.container.appendChild(wrap);

    const board = document.createElement('div');
    board.className = 'board';
    this.boardBody = board;
    wrap.appendChild(board);

    const piecesLayer = document.createElement('div');
    piecesLayer.className = 'pieces';
    this.piecesLayer = piecesLayer;
    wrap.appendChild(piecesLayer);

    // tiles: rows 0..7 top-to-bottom (engine row 0 = rank 8). White-at-bottom
    // is default; perspective flipped by CSS.
    for (let r = 0; r < 8; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'row';
      rowEl.dataset.row = r;
      this.boardBody.appendChild(rowEl);
      this.rows[r] = rowEl;
      for (let c = 0; c < 8; c++) {
        const tile = document.createElement('button');
        tile.className = 'tile';
        tile.type = 'button';
        tile.dataset.idx = String(r * 8 + c);
        tile.dataset.sq = nameOfSquare(r * 8 + c);
        tile.dataset.rank = String(8 - r);
        tile.dataset.file = String.fromCharCode(97 + c);
        rowEl.appendChild(tile);
        this.tiles[`${r}-${c}`] = tile;
      }
    }
    this._built = true;
  }

  ensureBuilt() {
    if (!this._built) this.build();
  }

  setOrientation(color) {
    this.orientation = color;
    this.ensureBuilt();
    this.boardEl.classList.toggle('perspective-black', color === 'b');
    this.boardEl.classList.toggle('perspective-white', color === 'w');
  }

  // Create/diff persistent piece elements to match `pieces` (array of idx/kind/color).
  setPieces(pieces) {
    this.ensureBuilt();
    const wanted = new Map();
    for (const p of pieces) wanted.set(p.idx, p);

    // remove stale
    for (const [idx, el] of this.pieceEls) {
      if (!wanted.has(idx)) {
        // captured -> fade to scale 0
        this._setScale(el, 0);
        setTimeout(() => el.remove(), 260);
        this.pieceEls.delete(idx);
      }
    }
    // update/add
    for (const [idx, p] of wanted) {
      let el = this.pieceEls.get(idx);
      if (!el) {
        el = document.createElement('div');
        el.className = `piece ${p.color === 'w' ? 'white' : 'black'}`;
        this.piecesLayer.appendChild(el);
        this.pieceEls.set(idx, el);
        // set initial position THEN scale in on next frame
        this._place(idx, el, false);
        requestAnimationFrame(() => this._setScale(el, 1));
      } else {
        this._place(idx, el, true);
      }
      // shape
      const id = KIND_ID[p.kind] || 'regal-pawn';
      if (el.dataset.shape !== id) {
        el.innerHTML = svgUse(id);
        el.dataset.shape = id;
      }
    }
  }

  _setScale(el, scale) {
    const inner = el.querySelector('.piece-inner') || el.firstElementChild;
    if (inner) inner.style.setProperty('--scale', scale);
  }

  _place(idx, el, animate) {
    const row = Math.floor(idx / 8);
    const col = idx % 8;
    // reference uses --pos-row/--pos-col with translate; keep CSS the source of truth
    if (animate) {
      el.classList.remove('no-anim');
    } else {
      el.classList.add('no-anim');
    }
    el.style.setProperty('--pos-col', col);
    el.style.setProperty('--pos-row', row);
  }

  // Move a single piece from -> to (only this element transitions).
  movePiece(from, to, capturedIdx) {
    const el = this.pieceEls.get(from);
    if (!el) return;
    el.classList.remove('no-anim');
    // remove old-highlight wrappers by re-rendering markers
    this.clearHighlights();
    if (capturedIdx != null && capturedIdx >= 0 && capturedIdx !== from) {
      this.removePiece(capturedIdx);
    }
    this.pieceEls.delete(from);
    this.pieceEls.set(to, el);
    this._place(to, el, true);
    el.dataset.idx = to;
  }

  removePiece(idx) {
    const el = this.pieceEls.get(idx);
    if (!el) return;
    this._setScale(el, 0);
    setTimeout(() => el.remove(), 260);
    this.pieceEls.delete(idx);
  }

  // Update the shape of an existing piece (e.g. pawn -> queen on promotion).
  setPieceShape(idx, kind) {
    const el = this.pieceEls.get(idx);
    if (!el) return;
    const id = KIND_ID[kind];
    el.dataset.shape = id;
    el.innerHTML = svgUse(id);
  }

  // position by engine idx for consistency
  positionBy(idx, el) {
    this._place(idx, el, true);
  }

  clearHighlights() {
    for (const t of Object.values(this.tiles)) {
      t.classList.remove('highlight-active', 'highlight-capture', 'highlight-move', 'first-move', 'check');
      // remove child marker layer but keep nothing (we rebuild markers fresh)
      t.querySelectorAll('.move, .moves, .captures, .hl').forEach((n) => n.remove());
    }
    // clear piece-level highlight classes
    for (const [idx, el] of this.pieceEls) {
      el.classList.remove('highlight-active', 'highlight-capture', 'can-move', 'can-capture');
    }
  }

  // Highlight legal targets. Draws mini piece markers on target tiles.
  // myPiece shape string for the "moves" silhavette. moves/captures arrays of move objects.
  highlight(fromIdx, targets) {
    this.clearHighlights();
    this.selected = fromIdx;

    // selected tile + piece
    const selEl = this.pieceEls.get(fromIdx);
    if (selEl) {
      selEl.classList.add('highlight-active');
    }
    const selTile = this.tileOf(fromIdx);
    if (selTile) selTile.classList.add('highlight-active');

    // marker piece shape (the selected piece's silhouette, mini)
    const selKind = selEl ? selEl.dataset.shape : null;
    const marker = selKind ? svgUse(selKind) : '';

    for (const mv of targets) {
      const tile = this.tileOf(mv.to);
      if (!tile) continue;
      if (mv.captured) {
        tile.classList.add('highlight-capture');
        tile.appendChild(captureMarkers(marker));
      } else {
        tile.classList.add('highlight-move');
        tile.appendChild(moveMarker(marker));
      }
    }
  }

  tileOf(idx) {
    const row = Math.floor(idx / 8);
    const col = idx % 8;
    return this.tiles[`${row}-${col}`];
  }

  markCheck(idx) {
    const tile = this.tileOf(idx);
    if (tile) tile.classList.add('check');
  }

  markLast(fromIdx, toIdx) {
    for (const idx of [fromIdx, toIdx]) {
      if (idx >= 0) { const t = this.tileOf(idx); if (t) t.classList.add('first-move'); }
    }
  }

  squareFromEvent(e) {
    const t = e.target.closest('.tile');
    if (!t) return -1;
    return parseInt(t.dataset.idx, 10);
  }

  resize() {}
}

// Mini move marker: a centered translucent piece silhouette.
function moveMarker(shape) {
  const d = document.createElement('div');
  d.className = 'move';
  d.innerHTML = shape;
  return d;
}

// Mini capture markers: piece silhouettes clustered near corners (like reference).
function captureMarkers(shape) {
  const d = document.createElement('div');
  d.className = 'captures';
  // repeat 4 ghost pieces to suggest a bite, matching reference style
  d.innerHTML = shape + shape + shape + shape;
  return d;
}

function svgUse(id) {
  return `<svg class="${id === 'regal-king' ? 'king' : ''}" viewBox="0 0 170 170" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#${id}" /></svg>`;
}
