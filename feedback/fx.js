// feedback/fx.js
// Floating text (pooled) + screen effects (vignette flash, shake) that respect
// reduced-motion.
import { on } from '../shared/eventbus.js';

export class FloatingText {
  constructor(layer) {
    this.layer = layer;
    this.pool = [];
  }
  show(text, x, y, opts = {}) {
    let el = this.pool.pop();
    if (!el) {
      el = document.createElement('div');
      el.className = 'floating-text';
      this.layer.appendChild(el);
    }
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = opts.color || '';
    el.classList.remove('show');
    void el.offsetWidth; // reflow to restart animation
    el.classList.add('show');
    this.pool.push(el);
  }
}

export class ScreenFX {
  constructor(root) {
    this.root = root;
    this.reducedMotion = false;
    this.flashEl = document.createElement('div');
    this.flashEl.className = 'screen-flash';
    this.root.appendChild(this.flashEl);
  }
  shake() {
    if (this.reducedMotion) return;
    this.root.classList.remove('shake');
    void this.root.offsetWidth;
    this.root.classList.add('shake');
  }
  flash(color = 'rgba(216,178,74,0.25)') {
    if (this.reducedMotion) {
      return;
    }
    this.flashEl.style.background = color;
    this.flashEl.classList.remove('show');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('show');
  }
  vignette() {
    if (this.reducedMotion) return;
    this.flash('rgba(0,0,0,0.22)');
  }
}

export function bindFX(floating, screenFx, getBoardRect) {
  on('capture', (e) => {
    const r = getBoardRect();
    floating.show('+১', r.cx(e.square), r.cy(e.square), { color: '#E0993A' });
  });
  on('promote', (e) => {
    const r = getBoardRect();
    floating.show('পদোন্নতি!', r.cx(e.square), r.cy(e.square) - 12, { color: '#D8B24A' });
  });
  on('check', (e) => {
    const r = getBoardRect();
    floating.show('কিস্তি!', r.cx(e.square), r.cy(e.square) - 16, { color: '#D45F4C' });
    screenFx.vignette();
  });
  on('gameOver', (e) => {
    if (e.winner) screenFx.flash(e.win ? 'rgba(216,178,74,0.3)' : 'rgba(60,60,60,0.3)');
  });
  on('invalidMove', (e) => {
    if (e && e.square !== undefined) {
      const r = getBoardRect();
      floating.show('✕', r.cx(e.square), r.cy(e.square), { color: '#E0604E' });
    }
  });
}
