// ui/screens.js
// Screen manager: renders each screen into the app root, drives the state
// machine (menu ⇄ lobby ⇄ playing ⇄ paused → game_over), and wires UI controls.
import { el, button, card, toast, toastLayer } from './dom.js';
import { getSettings, updateSettings, resetSettings, subscribe } from './settings.js';
import { applyTheme, applyAccessibility } from '../theme/theme.js';
import { playSfx } from '../audio/audio.js';
import { BoardView } from '../view/board.js';
import { Game } from '../engine/index.js';
import { aiMove } from '../ai/index.js';
import { level } from '../ai/difficulty.js';
import { emit, on, off } from '../shared/eventbus.js';

const CHESS_GLYPH = '♞';

export class Screens {
  constructor(root, opts = {}) {
    this.root = root;
    this.boardView = opts.boardView;
    this.container = el('div', { class: 'screen-container' });
    this.root.appendChild(this.container);
    this.toastLayer = toastLayer();
    this.root.appendChild(this.toastLayer);
    this.onOnlineRef = opts.onOnline || (() => {});
    this.onModeRef = opts.onMode || (() => {});

    // slide-in settings panel layer (overlays the current screen)
    this.settingsLayer = el('div', { class: 'settings-layer' });
    this.settingsLayer.innerHTML = '';
    this.root.appendChild(this.settingsLayer);
    this.settingsOpen = false;
  }

  openSettingsPanel() {
    if (!this.settingsLayer.children.length) this.buildSettings();
    this.settingsLayer.classList.add('open');
    this.settingsOpen = true;
    playSfx('open');
  }

  closeSettingsPanel() {
    this.settingsLayer.classList.remove('open');
    this.settingsOpen = false;
    playSfx('close');
  }

  clear() {
    this.container.innerHTML = '';
    return this.container;
  }

  // ---------- main menu ----------
  showMenu() {
    const c = this.clear();
    c.appendChild(el('div', { class: 'menu-bg bg-motif' }));
    const frame = el('div', { class: 'menu-frame' });
    const inner = el('div', { class: 'menu-inner' });
    const header = el('div', { class: 'menu-header' }, [
      el('img', { class: 'menu-logo', src: 'assets/menu/logo.png', alt: '' }),
      el('img', { class: 'menu-title', src: 'assets/menu/title.png', alt: 'দাবা' }),
      el('img', { class: 'orn-divider', src: 'assets/menu/divider.png', alt: '' }),
      el('img', { class: 'menu-tagline', src: 'assets/menu/tagline.png', alt: 'ঐতিহ্যবাহী খেলা — চিরন্তন দাবা' }),
    ]);
    const content = el('div', { class: 'menu-content' }, [
      this._menuBtn('btn-online', 'অনলাইনে খেলুন', () => this.showLobby()),
      this._menuBtn('btn-ai', 'কম্পিউটারের বিরুদ্ধে', () => this.onModeRef('ai')),
      this._menuBtn('btn-hotseat', 'একই ডিভাইসে', () => this.onModeRef('hotseat')),
      this._menuBtn('btn-settings', 'সেটিংস', () => this.showSettings(() => this.showMenu())),
    ]);
    const footer = el('div', { class: 'menu-footer' }, [
      el('img', { class: 'menu-ver', src: 'assets/menu/banner-v1.png', alt: 'v1.0' }),
    ]);
    inner.append(header, content, footer);
    frame.appendChild(inner);
    c.append(el('div', { class: 'menu-stage' }, frame));
  }

  // Painted plate buttons (label/icon baked into the asset) for the main menu.
  _menuBtn(cls, aria, onClick) {
    const b = el('button', { class: `menu-btn ${cls}`, type: 'button', 'aria-label': aria });
    b.addEventListener('click', () => { playSfx('click'); onClick && onClick(); });
    return b;
  }

  // ---------- lobby (online) ----------
  showLobby() {
    const c = this.clear();
    c.appendChild(el('div', { class: 'menu-bg bg-motif' }));
    const back = button('← ফিরে যান', () => this.showMenu(), { variant: 'utility' });
    const join = (host) => {
      const codeInput = c.querySelector('#roomCode');
      const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
      this.onOnlineRef('join', code);
    };
    const hostBtn = button('রুম তৈরি করুন', () => this.onOnlineRef('host'), { variant: 'primary' });
    const joinBtn = button('রুমে যোগ দিন', null, { variant: 'secondary' });

    const panel = card('অনলাইনে খেলুন', [
      el('p', { class: 'hint' }, 'একটি রুম তৈরি করে কোডটি শেয়ার করুন, অথবা বন্ধুর রুমে যোগ দিন।'),
      hostBtn,
      el('div', { class: 'divider' }, 'অথবা'),
      el('div', { class: 'join-row' }, [
        el('input', { id: 'roomCode', class: 'input room-input', placeholder: 'রুম কোড', maxlength: '6', autocomplete: 'off', spellcheck: 'false' }),
        joinBtn,
      ]),
      el('div', { id: 'lobby-status', class: 'lobby-status' }),
    ]);

    joinBtn.addEventListener('click', () => join());
    c.append(back, panel);
  }

  // transient lobby-status message
  lobbyStatus(msg) {
    const s = this.container.querySelector('#lobby-status');
    if (s) s.textContent = msg;
  }

  // ---------- board screen ----------
  showBoard(opts = {}) {
    const c = this.clear();
    const board = el('div', { class: 'board-screen' });
    const toolbar = el('div', { class: 'board-toolbar' }, [
      button('☰', () => (opts.onPause ? opts.onPause() : this.showPause()), { variant: 'utility', icon: '' }),
      el('span', { class: 'toolbar-title' }, opts.title || 'দাবা'),
      button('⚙', () => opts.onSettings ? opts.onSettings() : this.showSettings(() => this.showBoard(opts)), { variant: 'utility' }),
    ]);
    // main row: board + HUD side-by-side on desktop
    const main = el('div', { class: 'board-main' });
    const boardCol = el('div', { class: 'board-col' });
    const boardWrap = el('div', { class: 'board-outer' });
    boardCol.appendChild(boardWrap);
    main.append(boardCol);
    board.append(toolbar, main);
    c.append(board);
    return { c, boardWrap, main, boardCol };
  }

  // ---------- pause menu ----------
  showPause(opts = {}) {
    const c = this.clear();
    c.appendChild(el('div', { class: 'screen-overlay' }));
    const back = button('চালিয়ে যান', () => opts.onResume && opts.onResume(), { variant: 'primary', icon: '▶' });
    const actions = [
      back,
      button('সেটিংস', () => this.showSettings(() => this.showPause(opts)), { variant: 'secondary' }),
      button('পরাজয় স্বীকার করুন', () => opts.onResign && opts.onResign(), { variant: 'utility' }),
      button('নতুন খেলা', () => opts.onNewGame && opts.onNewGame(), { variant: 'utility' }),
      button('মূল মেনু', () => opts.onMenu && opts.onMenu(), { variant: 'utility' }),
    ];
    const panel = card('বিরতি', actions);
    c.appendChild(el('div', { class: 'pause-panel' }, panel));
  }

  // ---------- settings (slide-in panel) ----------
  buildSettings() {
    const s = getSettings();
    const layer = this.settingsLayer;
    layer.innerHTML = '';

    const scrim = el('div', { class: 'settings-scrim', 'data-close': '1' });
    const panel = el('div', { class: 'settings-panel' });

    const toggle = (key, current) => {
      const b = el('div', { class: 'seg', 'role': 'group' });
      const mk = (val, txt) => {
        const bb = el('button', { class: `seg-opt ${current === val ? 'active' : ''}`, type: 'button' }, txt);
        bb.addEventListener('click', () => {
          b.querySelectorAll('.seg-opt').forEach((x) => x.classList.remove('active'));
          bb.classList.add('active');
          setVal(key, val);
        });
        return bb;
      };
      b.append(mk(true, 'চালু'), mk(false, 'বন্ধ'));
      return b;
    };
    const slider = (key) => {
      const inp = el('input', { type: 'range', min: '0', max: '1', step: '0.05', value: s[key] });
      inp.addEventListener('input', () => setVal(key, parseFloat(inp.value)));
      return inp;
    };
    const setVal = (key, val) => {
      const updated = updateSettings({ [key]: val });
      applySettingsSideEffects(updated);
    };

    const body = el('div', { class: 'settings-body' });

    // Gameplay
    const diffSel = el('select', { class: 'input' }, ['easy', 'medium', 'hard'].map((d) => {
      const opt = el('option', { value: d }, level(d).label);
      if (s.difficulty === d) opt.selected = true;
      return opt;
    }));
    diffSel.addEventListener('change', () => setVal('difficulty', diffSel.value));

    const sideSel = el('select', { class: 'input' }, [
      ...['w', 'b', 'random'].map((v) => { const o = el('option', { value: v }, v === 'w' ? 'সবুজ' : v === 'b' ? 'লাল' : 'এলোমেলো'); if (s.side === v) o.selected = true; return o; }),
    ]);
    sideSel.addEventListener('change', () => setVal('side', sideSel.value));

    body.append(this._group('খেলা', [
      this._field('কম্পিউটারের স্তর', diffSel),
      this._field('আপনার রং (কম্পিউটারের বিরুদ্ধে)', sideSel),
      this._field('বৈধ চাল দেখান', toggle('showLegalMoves', s.showLegalMoves)),
      this._field('কোঅর্ডিনেট দেখান', toggle('showCoordinates', s.showCoordinates)),
      this._field('শেষ চাল দেখান', toggle('showLastMove', s.showLastMove)),
    ]));

    // Audio
    body.append(this._group('শব্দ', [
      this._field('ইফেক্ট শব্দ', slider('sfxVolume')),
      this._field('সঙ্গীত', slider('musicVolume')),
      this._field('মূল ভলিউম', slider('masterVolume')),
      this._field('ব্যাকগ্রাউন্ড সঙ্গীত', toggle('music', s.music)),
    ]));

    // Accessibility
    body.append(this._group('সহজলভ্যতা', [
      this._field('কম নড়াচড়া', toggle('reducedMotion', s.reducedMotion)),
      this._field('রং-অন্ধ মোড', toggle('colorBlind', s.colorBlind)),
      this._field('উচ্চ কনট্রাস্ট', toggle('highContrast', s.highContrast)),
      this._field('ইউআই মাপ', this._scaleSel(s.uiScale)),
    ]));

    const closeBtn = button('বন্ধ করুন', () => this.closeSettingsPanel(), { variant: 'primary' });
    const resetBtn = button('ডিফল্টে ফিরুন', () => { const r = resetSettings(); applySettingsSideEffects(r); this.buildSettings(); this.openSettingsPanel(); }, { variant: 'utility' });
    const footer = el('div', { class: 'settings-footer' }, [resetBtn, closeBtn]);

    // header
    const header = el('div', { class: 'settings-header' }, [
      el('h2', { class: 'settings-title' }, 'সেটিংস'),
      button('✕', () => this.closeSettingsPanel(), { variant: 'utility', icon: '' }),
    ]);

    panel.append(header, body, footer);
    layer.append(scrim, panel);

    scrim.addEventListener('click', (e) => { if (e.target.dataset.close) this.closeSettingsPanel(); });
  }

  // Kept as a thin wrapper so existing call sites still work; opens the panel
  // without clearing the underlying screen. The underlying screen stays in place;
  // closing merely hides the panel, so onClose callbacks are no longer needed.
  showSettings(onClose = () => {}) {
    this.openSettingsPanel();
  }

  _scaleSel(current) {
    const sel = el('select', { class: 'input' }, ['small', 'normal', 'large'].map((v) => {
      const o = el('option', { value: v }, v === 'small' ? 'ছোট' : v === 'normal' ? 'সাধারণ' : 'বড়');
      if (current === v) o.selected = true;
      return o;
    }));
    sel.addEventListener('change', () => updateSettings({ uiScale: sel.value }) && applyAccessibility(getSettings()));
    return sel;
  }

  _group(title, fields) {
    return el('div', { class: 'settings-group' }, [el('h3', { class: 'group-title' }, title), ...fields]);
  }

  _field(label, control) {
    return el('div', { class: 'field-row' }, [el('span', { class: 'field-label' }, label), control]);
  }

  // ---------- game over ----------
  showGameOver(payload = {}) {
    const c = this.clear();
    c.appendChild(el('div', { class: 'screen-overlay' }));
    const { title, subtitle, win, online, onRematch, onMenu, onReview, pgn } = payload;
    const actions = [];
    if (onRematch) actions.push(button(online ? 'আবার খেলার প্রস্তাব দিন' : 'আবার খেলুন', () => onRematch(), { variant: 'primary', icon: '↻' }));
    if (onReview) actions.push(button('বোর্ড দেখুন', () => onReview(), { variant: 'secondary' }));
    actions.push(button('মূল মেনু', () => onMenu && onMenu(), { variant: 'utility' }));
    if (pgn) actions.push(button('PGN কপি করুন', () => { navigator.clipboard && navigator.clipboard.writeText(pgn); toast('গেম PGN হিসেবে কপি হয়েছে', { layer: this.toastLayer, type: 'info' }); }, { variant: 'utility' }));

    const panel = card('খেলা শেষ', [
      el('div', { class: `result-banner ${win ? 'win' : 'draw'}` }, [
        el('div', { class: 'result-icon' }, win ? '🏆' : '🤝'),
        el('div', { class: 'result-title' }, title),
        subtitle ? el('div', { class: 'result-sub' }, subtitle) : null,
      ]),
      el('div', { class: 'result-actions' }, actions),
    ]);
    c.appendChild(el('div', { class: 'pause-panel gameover-panel' }, panel));
  }
}

function applySettingsSideEffects(s) {
  applyAccessibility(s);
}
