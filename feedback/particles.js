// feedback/particles.js
// Lightweight canvas particle system. Pooled, budget-capped, respects
// reduced-motion. Emitters: select, capture, promotion, victory, ambient.
import { on } from '../shared/eventbus.js';
import { playSfx, resumeAudio } from '../audio/audio.js';

export class Particles {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.max = 240;
    this.reducedMotion = false;
    this.ambient = [];
    this.running = false;
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  _spawn(entries) {
    for (const p of entries) {
      if (this.particles.length >= this.max) break;
      this.particles.push(p);
    }
    this._start();
  }

  burst(cx, cy, opts = {}) {
    if (this.reducedMotion) return;
    const { count = 16, color = 'rgba(216,178,74,', speed = 2.4, size = 4, life = 46 } = opts;
    const list = [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random());
      list.push({
        x: cx, y: cy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 1,
        size: size * (0.5 + Math.random()),
        life, maxLife: life,
        c: color,
      });
    }
    this._spawn(list);
  }

  confetti(cx, cy) {
    if (this.reducedMotion) return;
    this.burst(cx, cy, { count: 60, speed: 3.6, size: 5, life: 90, color: '#58C185' });
    this.burst(cx, cy, { count: 60, speed: 3.2, size: 5, life: 90, color: '#D8B24A' });
    this.burst(cx, cy, { count: 40, speed: 3.0, size: 4, life: 90, color: '#5A8BD8' });
  }

  _start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    const loop = (t) => {
      const dt = Math.min(1.6, (t - (this._last || t)) / 16.67);
      this._last = t;
      this._step(dt);
      if (this.particles.length || this.ambient.length) requestAnimationFrame(loop);
      else {
        this.running = false;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    };
    requestAnimationFrame(loop);
  }

  _step(dt) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // ambient motes
    for (const a of this.ambient) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.alpha += (a.target - a.alpha) * 0.02;
      if (a.x < -10) a.x = this.canvas.width + 10;
      if (a.x > this.canvas.width + 10) a.x = -10;
      if (a.y < -10) a.y = this.canvas.height + 10;
      if (a.y > this.canvas.height + 10) a.y = -10;
      ctx.globalAlpha = Math.max(0, a.alpha);
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.12 * dt;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.c + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.6 + alpha * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  setAmbient(onAmbient) {
    this.ambient = [];
    if (onAmbient && !this.reducedMotion) {
      for (let i = 0; i < 26; i++) {
        this.ambient.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.7) * 0.12,
          size: 1 + Math.random() * 2.2,
          color: ['rgba(216,178,74,0.5)', 'rgba(90,139,216,0.4)', 'rgba(245,241,232,0.35)'][Math.floor(Math.random() * 3)],
          alpha: 0,
          target: 0.3 + Math.random() * 0.4,
        });
      }
      this._start();
    }
  }
}

// Convenience bindings: wire engine events to particle + audio feedback.
export function bindFeedback(particles, board, getBoardRect) {
  on('moveApplied', (e) => {
    const r = getBoardRect();
    if (!e.silent) {
      if (e.capture || e.enPassant) {
        if (e.castle) playSfx('castle');
        else if (e.promo) playSfx('promote');
        else playSfx('capture');
      } else if (e.castle) playSfx('castle');
      else if (e.promo) playSfx('promote');
      else playSfx('move');
    }
  });
  on('check', () => playSfx('check'));
  on('capture', (e) => {
    const r = getBoardRect();
    particles.burst(r.cx(e.square), r.cy(e.square), { color: 'rgba(224,96,78,', count: 22 });
  });
  on('promote', (e) => {
    const r = getBoardRect();
    particles.burst(r.cx(e.square), r.cy(e.square), { color: 'rgba(216,178,74,', count: 30, speed: 3 });
  });
  on('victory', (e) => {
    const r = getBoardRect();
    particles.confetti(r.cx('e4'), r.cy('e4'));
  });
}
