// ui/hud.js
// HUD for the board screen: player cards (name, color, captured pieces, turn
// indicator), move list, and status line. Pure presentation, driven by state.
import { el } from './dom.js';
import { PIECES } from '../view/pieces.js';
import { playSfx } from '../audio/audio.js';

export class HUD {
  constructor(container) {
    this.container = container;
    this.build();
    this.lastSan = '';
  }

  build() {
    this.container.innerHTML = `
      <div class="hud" data-mode="hotseat">
        <div class="hud-top">
          <div class="hud-player" data-player="w"></div>
          <div class="hud-clock"></div>
          <div class="hud-player" data-player="b"></div>
        </div>
        <div class="hud-mid">
          <div class="hud-status" data-role="status"></div>
          <button class="icon-btn hint-buddy" data-role="sound" title="শব্দ" aria-label="শব্দ">🎵</button>
        </div>
        <div class="hud-bottom">
          <div class="moves" data-role="moves"></div>
        </div>
      </div>`;
    this.statusEl = this.container.querySelector('[data-role="status"]');
    this.movesEl = this.container.querySelector('[data-role="moves"]');
    this.playerEls = {
      w: this.container.querySelector('[data-player="w"]'),
      b: this.container.querySelector('[data-player="b"]'),
    };
    const soundBtn = this.container.querySelector('[data-role="sound"]');
    soundBtn.addEventListener('click', () => {
      playSfx('click');
      this._onSoundToggle && this._onSoundToggle();
    });
  }

  setPlayers(players) {
    // players: { w:{name}, b:{name} }
    for (const color of ['w', 'b']) this.playerEls[color].innerHTML = '';
    for (const color of ['w', 'b']) {
      const p = players[color] || {};
      const pc = this.playerEls[color];
      pc.appendChild(el('div', { class: 'hud-avatar' }, p.name ? p.name.charAt(0).toUpperCase() : (color === 'w' ? 'স' : 'ল')));
      pc.appendChild(el('div', { class: 'hud-name' }, p.name || (color === 'w' ? 'সবুজ' : 'লাল')));
    }
    this.players = players;
  }

  setTurn(turn) {
    for (const color of ['w', 'b']) {
      this.playerEls[color].classList.toggle('active', color === turn);
    }
  }

  setCaptured(list) {
    // list: { w:[kinds], b:[kinds] } captured BY each color
    for (const color of ['w', 'b']) {
      const pc = this.playerEls[color];
      let cap = pc.querySelector('.hud-captured');
      if (!cap) { cap = el('div', { class: 'hud-captured' }); pc.appendChild(cap); }
      cap.innerHTML = '';
      for (const k of list[color] || []) {
        cap.appendChild(el('span', { class: 'cap-glyph', 'aria-hidden': 'true' }, GLYPH[k] || k));
      }
    }
  }

  addMove(san) {
    this.lastSan = san;
    const li = el('div', { class: 'move-item' }, san);
    this.movesEl.appendChild(li);
    const all = this.movesEl.querySelectorAll('.move-item');
    if (all.length > 0) {
      // keep number: group in pairs
    }
    this.movesEl.scrollTop = this.movesEl.scrollHeight;
  }

  clearMoves() {
    this.lastSan = '';
    this.movesEl.innerHTML = '';
  }

  setStatus(text, cls = '') {
    this.statusEl.textContent = text || '';
    this.statusEl.className = 'hud-status ' + cls;
  }

  onSoundToggle(fn) {
    this._onSoundToggle = fn;
  }
}

const GLYPH = { P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔' };
