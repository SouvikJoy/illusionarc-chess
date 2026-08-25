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
    const header = el('div', { class: 'menu-header' }, [
      el('div', { class: 'menu-logo', 'aria-hidden': 'true' }, CHESS_GLYPH),
      el('h1', { class: 'menu-title' }, 'Regal Chess'),
      el('div', { class: 'menu-tagline' }, 'Play the timeless game'),
    ]);
    const content = el('div', { class: 'menu-content' }, [
      button('Play Online', () => this.showLobby(), { variant: 'primary', icon: '🌐' }),
      button('Play vs AI', () => this.onModeRef('ai'), { variant: 'secondary', icon: '🤖' }),
      button('Hotseat', () => this.onModeRef('hotseat'), { variant: 'secondary', icon: '♟' }),
      button('Settings', () => this.showSettings(() => this.showMenu()), { variant: 'secondary', icon: '⚙' }),
    ]);
    const footer = el('div', { class: 'menu-footer' }, [
      el('span', { class: 'version' }, 'v1.0'),
    ]);
    c.append(header, content, footer);
  }

  // ---------- lobby (online) ----------
  showLobby() {
    const c = this.clear();
    c.appendChild(el('div', { class: 'menu-bg bg-motif' }));
    const back = button('← Back', () => this.showMenu(), { variant: 'utility' });
    const join = (host) => {
      const codeInput = c.querySelector('#roomCode');
      const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
      this.onOnlineRef('join', code);
    };
    const hostBtn = button('Create Room', () => this.onOnlineRef('host'), { variant: 'primary' });
    const joinBtn = button('Join Room', null, { variant: 'secondary' });

    const panel = card('Play Online', [
      el('p', { class: 'hint' }, 'Create a room and share the code, or join a friend\u2019s room.'),
      hostBtn,
      el('div', { class: 'divider' }, 'or'),
      el('div', { class: 'join-row' }, [
        el('input', { id: 'roomCode', class: 'input room-input', placeholder: 'Room code', maxlength: '6', autocomplete: 'off', spellcheck: 'false' }),
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
      el('span', { class: 'toolbar-title' }, opts.title || 'Regal Chess'),
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
    const back = button('Resume', () => opts.onResume && opts.onResume(), { variant: 'primary', icon: '▶' });
    const actions = [
      back,
      button('Settings', () => this.showSettings(() => this.showPause(opts)), { variant: 'secondary' }),
      button('Resign', () => opts.onResign && opts.onResign(), { variant: 'utility' }),
      button('New Game', () => opts.onNewGame && opts.onNewGame(), { variant: 'utility' }),
      button('Main Menu', () => opts.onMenu && opts.onMenu(), { variant: 'utility' }),
    ];
    const panel = card('Paused', actions);
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
      b.append(mk(true, 'On'), mk(false, 'Off'));
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
      ...['w', 'b', 'random'].map((v) => { const o = el('option', { value: v }, v === 'w' ? 'White' : v === 'b' ? 'Black' : 'Random'); if (s.side === v) o.selected = true; return o; }),
    ]);
    sideSel.addEventListener('change', () => setVal('side', sideSel.value));

    body.append(this._group('Gameplay', [
      this._field('AI Difficulty', diffSel),
      this._field('Your side (vs AI)', sideSel),
      this._field('Show legal moves', toggle('showLegalMoves', s.showLegalMoves)),
      this._field('Show coordinates', toggle('showCoordinates', s.showCoordinates)),
      this._field('Show last move', toggle('showLastMove', s.showLastMove)),
    ]));

    // Audio
    body.append(this._group('Audio', [
      this._field('SFX', slider('sfxVolume')),
      this._field('Music', slider('musicVolume')),
      this._field('Master', slider('masterVolume')),
      this._field('Ambient music', toggle('music', s.music)),
    ]));

    // Accessibility
    body.append(this._group('Accessibility', [
      this._field('Reduced motion', toggle('reducedMotion', s.reducedMotion)),
      this._field('Color-blind mode', toggle('colorBlind', s.colorBlind)),
      this._field('High contrast', toggle('highContrast', s.highContrast)),
      this._field('UI scale', this._scaleSel(s.uiScale)),
    ]));

    const closeBtn = button('Close', () => this.closeSettingsPanel(), { variant: 'primary' });
    const resetBtn = button('Reset to defaults', () => { const r = resetSettings(); applySettingsSideEffects(r); this.buildSettings(); this.openSettingsPanel(); }, { variant: 'utility' });
    const footer = el('div', { class: 'settings-footer' }, [resetBtn, closeBtn]);

    // header
    const header = el('div', { class: 'settings-header' }, [
      el('h2', { class: 'settings-title' }, 'Settings'),
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
      const o = el('option', { value: v }, v === 'small' ? 'Small' : v === 'normal' ? 'Normal' : 'Large');
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
    if (onRematch) actions.push(button(online ? 'Request Rematch' : 'Rematch', () => onRematch(), { variant: 'primary', icon: '↻' }));
    if (onReview) actions.push(button('Review Board', () => onReview(), { variant: 'secondary' }));
    actions.push(button('Main Menu', () => onMenu && onMenu(), { variant: 'utility' }));
    if (pgn) actions.push(button('Copy PGN', () => { navigator.clipboard && navigator.clipboard.writeText(pgn); toast('Game copied as PGN', { layer: this.toastLayer, type: 'info' }); }, { variant: 'utility' }));

    const panel = card('Game Over', [
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
