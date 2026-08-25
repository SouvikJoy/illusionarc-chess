// app.js
// Regal Chess — application bootstrap + game orchestration controller.
// Wires engine, board, HUD, AI, net, feedback, and the screen state machine.
import { applyTheme, applyAccessibility } from './theme/theme.js';
import { Game, EMPTY, WHITE, BLACK, kindOf, colorOf, nameOfSquare, codeOf } from './engine/index.js';
import { BoardView } from './view/board.js';
import { HUD } from './ui/hud.js';
import { Screens } from './ui/screens.js';
import { Particles } from './feedback/particles.js';
import { FloatingText, ScreenFX, bindFX } from './feedback/fx.js';
import { bindFeedback } from './feedback/particles.js';
import { aiMove } from './ai/index.js';
import { level } from './ai/difficulty.js';
import { NetClient } from './net/client.js';
import { showPromotion } from './ui/promotion.js';
import { button, el, toast } from './ui/dom.js';
import { emit, on } from './shared/eventbus.js';
import { MSG } from './shared/protocol.js';
import {
  getSettings, updateSettings, loadSettings, subscribe,
} from './ui/settings.js';
import { initAudio, resumeAudio, playSfx, setSFX, setMusic, setMaster, toggleEnabled, startMusic, stopMusic } from './audio/audio.js';

class App {
  constructor(root) {
    this.root = root;
    loadSettings();
    applyTheme(root);
    this.mode = null; // 'ai' | 'hotseat' | 'online'
    this.game = new Game();
    this.gameMode = 'hotseat';
    this.settings = getSettings();

    // DOM layers
    root.innerHTML = `
      <div id="app" class="app"></div>
      <div id="particleCanvas" class="canvas-layer"><canvas id="fx-canvas"></canvas></div>
      <div id="fx" class="fx-layer"></div>
      <div id="toastLayer" class="toast-layer"></div>
      <div id="promoLayer" class="promo-layer"></div>`;

    this.appEl = root.querySelector('#app');
    this.canvasEl = root.querySelector('#fx-canvas');
    this.fxLayer = root.querySelector('#fx');
    this.toastLayer = root.querySelector('#toastLayer');

    this.screens = new Screens(this.appEl, {
      onOnline: (action, code) => this.handleOnlineMenu(action, code),
      onMode: (mode) => this.startMode(mode),
    });
    this.screens.toastLayer = this.toastLayer;

    this.particles = new Particles(this.canvasEl);
    this.floating = new FloatingText(this.fxLayer);
    this.screenFx = new ScreenFX(this.fxLayer);

    this.board = new BoardView(document.createElement('div'));
    this.hud = new HUD(document.createElement('div'));

    this._applyAudio();
    subscribe(() => {
      this.settings = getSettings();
      applyAccessibility(this.settings);
      this._applyAudio();
    });
  }

  _applyAudio() {
    const s = this.settings;
    initAudio();
    setSFX(s.sfxVolume);
    setMusic(s.musicVolume);
    setMaster(s.masterVolume);
    toggleEnabled(true);
    this.musicOn = s.music;
  }

  boot() {
    BoardView.ensureDefs();
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const reduce = mq.matches;
      if (reduce && !this.settings.reducedMotion) updateSettings({ reducedMotion: true });
    }
    applyAccessibility(getSettings());
    this.screens.showMenu();
    this._fitCanvas();
    window.addEventListener('resize', () => this._fitCanvas());
    requestAnimationFrame(() => this._peerFeedback());
  }

  _peerFeedback() {
    if (this.settings.reducedMotion) this.particles.reducedMotion = true;
    if (this.settings.colorBlind) document.documentElement.dataset.colorBlind = 'true';
    if (this.settings.highContrast) document.documentElement.dataset.highContrast = 'true';
    if (this.settings.uiScale) document.documentElement.dataset.uiScale = this.settings.uiScale;
    this.screenFx.reducedMotion = this.settings.reducedMotion;
    this.particles.reducedMotion = this.settings.reducedMotion;
    this.particles.setAmbient(this.settings.music);
    bindFeedback(this.particles, this.board, () => this.boardRect());
    bindFX(this.floating, this.screenFx, () => this.boardRect());
    this._fitCanvas();
  }

  _fitCanvas() {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    this.canvasEl.width = Math.max(300, w);
    this.canvasEl.height = Math.max(300, h);
  }

  boardRect() {
    const b = this.board.boardEl;
    if (!b) return { cx: () => this.root.clientWidth / 2, cy: () => this.root.clientHeight / 2 };
    const r = b.getBoundingClientRect();
    const sz = r.width / 8;
    return {
      cx: (sq) => { const i = typeof sq === 'string' ? this.idx(sq) : sq; return r.left + (i % 8) * sz + sz / 2; },
      cy: (sq) => { const i = typeof sq === 'string' ? this.idx(sq) : sq; return r.top + Math.floor(i / 8) * sz + sz / 2; },
    };
  }

  idx(sq) {
    if (typeof sq !== 'string') return sq;
    const col = sq.charCodeAt(0) - 97;
    const row = 8 - parseInt(sq[1], 10);
    return row * 8 + col;
  }

  // ------- start modes -------
  startMode(mode) {
    resumeAudio();
    if (this.settings.music) startMusic();
    this.mode = mode;
    this._newGame();
    if (mode === 'ai') this.screens.showBoard();
    else if (mode === 'hotseat') this.screens.showBoard();
    // online handled via handleOnlineMenu
    this._renderBoardScreen();
  }

  handleOnlineMenu(action, code) {
    resumeAudio();
    if (action === 'host') {
      this.screens.lobbyStatus('Creating room…');
      this._connect();
      this.net.host();
    } else if (action === 'join') {
      if (!code) { this.screens.lobbyStatus('Enter a room code first'); return; }
      this.screens.lobbyStatus('Joining…');
      this._connect();
      this.net.join(code);
    }
  }

  _connect() {
    if (this.net) return;
    this.net = new NetClient(wsUrl());
    this._bindNet();
    this.net.connect(wsUrl()).catch((e) => {
      this.screens.lobbyStatus('Could not connect to server: ' + e.message);
    });
  }

  _bindNet() {
    const net = this.net;
    net.on(MSG.ROOM_CREATED, (d) => {
      this.screens.lobbyStatus('Room created. Code: ' + d.code);
      toast('Share code: ' + d.code, { layer: this.toastLayer, type: 'info', duration: 4000 });
      this.roomCode = d.code;
    });
    net.on(MSG.ROOM_JOINED, (d) => {
      this.roomCode = d.code;
      this.screens.lobbyStatus('Joined room ' + d.code);
    });
    net.on(MSG.STATE_ASSIGNED, (d) => {
      this.playerColor = d.color;
      this.screens.lobbyStatus(d.color === 'w' ? 'You are White. Waiting for opponent…' : 'You are Black. Waiting for opponent…');
    });
    net.on(MSG.GAME_STARTED, (d) => {
      this.mode = 'online';
      this.game = new Game(d.fen || undefined);
      this.gameMode = 'online';
      this.screens.lobbyStatus('');
      this._renderBoardScreen();
    });
    net.on(MSG.STATE, (d) => this._applyRemote(d));
    net.on(MSG.STATE_SYNC, (d) => {
      this.game = new Game(d.fen || undefined);
      this.gameMode = 'online';
      this._renderBoardScreen();
    });
    net.on(MSG.OPPONENT_QUIT, () => {
      toast('Opponent left the game.', { layer: this.toastLayer, type: 'error' });
      this._end({ title: 'Opponent left', subtitle: 'The game was abandoned.', win: false, online: true });
    });
    net.on(MSG.OPPONENT_MOVE, (m) => {
      if (this.aiThinking) return;
    });
    net.on(MSG.ERROR, (d) => {
      toast(d.message || 'Error', { layer: this.toastLayer, type: 'error' });
    });
    net.on(MSG.REMATCH_REQUESTED, () => {
      this._pendingRematch = true;
      toast(this.opponentName() + ' wants a rematch', { layer: this.toastLayer, type: 'info', duration: 4000 });
    });
  }

  _newGame() {
    this.game = new Game();
    this.gameMode = this.mode;
    this.selected = -1;
    this.aiThinking = false;
    this.pendingPromotion = null;
    this._winner = null;
    this.remoteSans = [];
  }

  // ------- render board screen -------
  _renderBoardScreen() {
    const { c, boardWrap, main, boardCol } = this.screens.showBoard({
      title: this._title(),
      onPause: () => this._pause(),
      onSettings: () => this.screens.showSettings(() => this._renderBoardScreen()),
    });

    const boardContainer = el('div', { class: 'board-outer' });
    const boardEl = el('div', { class: 'board-inner' });
    boardEl.appendChild(this.board.container);
    boardContainer.appendChild(boardEl);
    boardWrap.appendChild(boardContainer);
    // HUD as sibling column
    main.appendChild(this.hud.container);

    // orientation
    const s = this.settings;
    let bottomColor = 'w';
    if (this.mode === 'ai') bottomColor = s.side === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : s.side;
    else if (this.mode === 'online') bottomColor = this.playerColor || 'w';
    this.board.setOrientation(bottomColor === 'w' ? 'w' : 'b');
    this.bottomColor = bottomColor;

    this._renderPieces();
    this._renderHud();
    this._bindBoardInput();
    this.screens.lobbyStatus && this.screens.lobbyStatus('');
    requestAnimationFrame(() => {
      this._fitCanvas();
      if (this.mode === 'ai' && this.game.turn !== this.bottomColor) this._aiMove();
    });
  }

  _renderPieces() {
    const pieces = [];
    for (let i = 0; i < 64; i++) {
      const code = this.game.board[i];
      if (code !== EMPTY) pieces.push({ idx: i, color: colorOf(code), kind: kindOf(code) });
    }
    this.board.setPieces(pieces);
    this._applyHighlights();
  }

  _applyHighlights() {
    this.board.clearHighlights();
    if (this.selected >= 0) {
      const targets = this.game.legalMoves(this.selected);
      if (this.settings.showLegalMoves !== false) this.board.highlight(this.selected, targets);
    }
  }

  _renderHud() {
    const players = this._players();
    this.hud.setPlayers(players);
    this.hud.setTurn(this.game.turn);
    this.hud.clearMoves();
    const sans = this.mode === 'online' && this.remoteSans && this.remoteSans.length ? this.remoteSans : this.game.history.map((h) => h.san);
    for (const san of sans) this.hud.addMove(san);
    this.hud.setStatus(this._statusText(), this._statusClass());
    this._renderStatusCheck();
  }

  _statusClass() {
    if (this.aiThinking) return 'thinking';
    return this.game.inCheck() ? 'check' : '';
  }

  // mark the king square red when the side to move is in check
  _renderStatusCheck() {
    if (this.aiThinking || this.mode === 'online') return;
    if (this.game.inCheck()) {
      const kingIdx = this.game.board.indexOf(codeOf(this.game.turn, 'K'));
      if (kingIdx >= 0) {
        this.board.markCheck(kingIdx);
      }
    }
  }

  _players() {
    const s = this.getSettingsSide();
    if (this.mode === 'online') {
      const me = 'Player';
      return {
        w: { name: this.playerColor === 'w' ? (s.name || 'You') : (this.opponentName() || 'Opponent') },
        b: { name: this.playerColor === 'b' ? (s.name || 'You') : (this.opponentName() || 'Opponent') },
      };
    }
    if (this.mode === 'ai') {
      return {
        w: { name: s.side === 'b' ? 'AI' : (s.name || 'You') },
        b: { name: s.side === 'w' ? 'AI' : (s.name || 'You') },
      };
    }
    return { w: { name: 'White' }, b: { name: 'Black' } };
  }

  getSettingsSide() {
    return this.settings;
  }

  opponentName() {
    return (this.netName || 'Opponent');
  }

  // ------- board input -------
  _bindBoardInput() {
    this.board.container.querySelectorAll('.tile').forEach((sq) => {
      sq.addEventListener('click', () => this._onSquareClick(parseInt(sq.dataset.idx, 10)));
    });
  }

  _onSquareClick(idx) {
    if (this.aiThinking) return;
    const code = this.game.board[idx];
    const color = code !== EMPTY ? colorOf(code) : null;
    const myTurn = this.game.turn === this.bottomColor;

    if (this.mode === 'online') {
      if (color === this.playerColor && this.game.turn === this.playerColor) {
        this._select(idx);
      } else if (this.selected >= 0 && myTurn && this.game.turn === this.playerColor) {
        this._tryMove(this.selected, idx);
      } else {
        this._flashInvalid(idx);
      }
      return;
    }

    if (this.mode === 'ai') {
      if (color !== null && color === this.game.turn && this.game.turn === this.bottomColor) {
        this._select(idx);
      } else if (this.selected >= 0 && this.game.turn === this.bottomColor) {
        this._tryMove(this.selected, idx);
      } else {
        this._flashInvalid(idx);
      }
      return;
    }

    // hotseat
    if (color !== null && color === this.game.turn) {
      this._select(idx);
    } else if (this.selected >= 0) {
      this._tryMove(this.selected, idx);
    } else {
      this._flashInvalid(idx);
    }
  }

  _select(idx) {
    if (this.pendingPromotion) return;
    const moves = this.game.legalMoves(idx);
    if (!moves.length) { this._flashInvalid(idx); return; }
    this.selected = idx;
    this._applyHighlights();
    playSfx('select');
  }

  _tryMove(from, to) {
    const legal = this.game.legalMoves(from || this.selected);
    const move = legal.find((m) => m.to === to);
    if (!move) { this._flashInvalid(to); this.selected = -1; this._applyHighlights(); return; }
    // promotion?
    if (move.flags && move.flags.promo) {
      this.pendingPromotion = { from: move.from, to };
      showPromotion(this.game.turn, (k) => {
        const mk = legal.find((m) => m.to === to && m.flags.promo === (k || 'Q'));
        this.pendingPromotion = null;
        if (mk) this._applyMove(mk);
      });
      return;
    }
    this._applyMove(move);
  }

  _applyMove(move) {
    const moverColor = colorOf(this.game.board[move.from]);
    const capturedBefore = move.captured;
    const wasCastle = move.flags && move.flags.castle;
    const wasPromo = move.flags && move.flags.promo;
    const capturedIdx = move.captured ? move.to : -1;
    const enPassantIdx = move.flags && move.flags.enPassant ? this._epCapturedIdx(move, moverColor) : -1;
    const result = this.game.move(move.from, move.to, move.flags && move.flags.promo);
    this._onMoveMade(result.san, {
      castle: wasCastle,
      promo: wasPromo,
      capturedIdx: capturedIdx >= 0 ? capturedIdx : enPassantIdx,
      captured: capturedBefore,
      from: move.from,
      to: move.to,
      square: nameOfSquare(move.to),
      enPassant: enPassantIdx >= 0,
      promotionKind: wasPromo ? (move.flags.promo) : null,
      castledRook: wasCastle ? this._castledRookIdx(move, moverColor) : -1,
    });
  }

  _epCapturedIdx(move, moverColor) {
    const toRow = Math.floor(move.to / 8);
    const col = move.to % 8;
    const capturedRow = moverColor === 'w' ? toRow + 1 : toRow - 1;
    return capturedRow * 8 + col;
  }

  _castledRookIdx(move, moverColor) {
    const home = moverColor === 'w' ? 7 : 0;
    if (move.flags.castle === 'K') return home * 8 + 7; // rook h
    if (move.flags.castle === 'Q') return home * 8 + 0; // rook a
    return -1;
  }

  _onMoveMade(san, ev) {
    this.selected = -1;
    // animate only the moved piece (+ rook if castling, - captured)
    this.board.movePiece(ev.from, ev.to, ev.capturedIdx);
    if (ev.castledRook >= 0) {
      const rookTo = ev.to % 8 === 6 ? ev.to - 1 : ev.to + 1;
      this.board.movePiece(ev.castledRook, rookTo);
    }
    if (ev.promotionKind && ev.promotionKind !== 'Q') {
      this.board.setPieceShape(ev.to, ev.promotionKind);
    } else if (ev.promo) {
      this.board.setPieceShape(ev.to, 'Q');
    }
    this.board.clearHighlights();
    this.board.markLast(ev.from, ev.to);
    this._renderHud();
    if (this.game.inCheck()) this.board.markCheck(this._kingIdx(this.game.turn));
    // events for feedback/audio
    if (ev.capturedIdx >= 0) emit('capture', { square: ev.square, enPassant: !!ev.enPassant });
    if (ev.castle) emit('castle', { square: ev.square });
    if (ev.promo) emit('promote', { square: ev.square });
    if (this.game.inCheck()) emit('check', { color: this.game.turn, square: nameOfSquare(this._kingIdx(this.game.turn)) });
    emit('moveApplied', { ...ev, silent: this.mode === 'online' });
    this._endIfOver();
    // if it's now the AI's turn (and game not over), trigger AI move
    if (this.mode === 'ai' && this.game.turn !== this.bottomColor && !this.gameOverShown) {
      this._aiMove();
    }
  }

  _kingIdx(color) {
    const code = codeOf(color, 'K');
    return this.game.board.indexOf(code);
  }

  _endIfOver() {
    const res = this.game.result();
    if (res.over) {
      if (res.type === 'checkmate') emit('gameOver', { winner: res.winner, win: res.winner === this.bottomColor && this.mode === 'ai' || (this.mode === 'online' && res.winner === this.playerColor) || (this.mode === 'hotseat' && true) });
      // compute win for UI
      const winnerColor = res.winner;
      let win;
      if (this.mode === 'ai') win = winnerColor === this.bottomColor;
      else if (this.mode === 'online') win = winnerColor === this.playerColor;
      else win = false; // hotseat neutral
      emit('gameOver2', { winner: winnerColor, win });
      this._end(this._gameOverPayload(res, winnerColor, win));
    }
  }

  _gameOverPayload(res, winnerColor, win) {
    const resTxt = {
      checkmate: winnerColor === 'w' ? 'White wins by checkmate' : 'Black wins by checkmate',
      stalemate: 'Draw by stalemate',
      insufficient: 'Draw by insufficient material',
      fifty: 'Draw by 50-move rule',
      threefold: 'Draw by threefold repetition',
    };
    const title = resTxt[res.type] || 'Game Over';
    return {
      title,
      subtitle: res.type === 'checkmate' ? 'Checkmate' : res.type === 'stalemate' ? 'Stalemate' : '',
      win,
      online: this.mode === 'online',
      onRematch: () => this._rematch(),
      onMenu: () => this._quitToMenu(),
      pgn: this.game.pgn(),
    };
  }

  _end(payload) {
    if (this.gameOverShown) return;
    this.gameOverShown = true;
    if (payload.win) { playSfx('victory'); emit('victory', {}); }
    else playSfx('defeat');
    this.screens.showGameOver(payload);
  }

  _flashInvalid(idx) {
    playSfx('invalid');
    this.screenFx.shake();
    this.particles.burst(this._sqCenter(idx).x, this._sqCenter(idx).y, { color: 'rgba(224,96,78,', count: 10 });
    emit('invalidMove', { square: typeof idx === 'number' ? nameOfSquare(idx) : idx });
  }

  _sqCenter(idx) {
    const r = this.board.boardEl.getBoundingClientRect();
    const sz = r.width / 8;
    return { x: r.left + (idx % 8) * sz + sz / 2, y: r.top + Math.floor(idx / 8) * sz + sz / 2 };
  }

  _aiMove() {
    if (this.mode !== 'ai' || this.aiThinking) return;
    if (this.game.turn === this.bottomColor) return;
    this.aiThinking = true;
    this.hud.setStatus('AI thinking…', 'thinking');
    const difficulty = this.settings.difficulty;
    const cfg = level(difficulty);
    setTimeout(() => {
      const mv = aiMove(this.game, difficulty);
      this.aiThinking = false;
      if (mv) {
        const moverColor = colorOf(this.game.board[mv.from]);
        const capturedIdx = mv.captured ? mv.to : (mv.flags && mv.flags.enPassant ? this._epCapturedIdx(mv, moverColor) : -1);
        const result = this.game.move(mv.from, mv.to, mv.flags && mv.flags.promo);
        this._onMoveMade(result.san, {
          castle: !!(mv.flags && mv.flags.castle),
          promo: !!(mv.flags && mv.flags.promo),
          capturedIdx,
          captured: mv.captured,
          from: mv.from,
          to: mv.to,
          square: nameOfSquare(mv.to),
          enPassant: !!(mv.flags && mv.flags.enPassant),
          promotionKind: mv.flags && mv.flags.promo ? mv.flags.promo : null,
          castledRook: mv.flags && mv.flags.castle ? this._castledRookIdx(mv, moverColor) : -1,
        });
      }
      this.hud.setStatus(this._statusText(), '');
      this._renderHud();
    }, cfg.thinkMs);
  }

  _statusText() {
    const t = this.game.turn === 'w' ? 'White' : 'Black';
    if (this.game.inCheck()) return t + ' to move — Check!';
    return t + ' to move';
  }

  _title() {
    if (this.mode === 'online') return 'Online Match';
    if (this.mode === 'ai') return 'vs AI';
    return 'Hotseat';
  }

  _rematch() {
    this.gameOverShown = false;
    if (this.mode === 'online') {
      this.net && this.net.rematchOffer();
    } else {
      this._newGame();
      this._renderBoardScreen();
    }
  }

  _quitToMenu() {
    this.gameOverShown = false;
    this.screens.clear();
    this.mode = null;
    if (this.net) { this.net.close(); this.net = null; }
    this.screens.showMenu();
  }

  _pause() {
    const res = this.game.result();    this.screens.showPause({
      onResume: () => { playSfx('close'); this._renderBoardScreen(); },
      onResign: () => { this._end({ title: 'You resigned', subtitle: 'You resigned the game.', win: false }); },
      onNewGame: () => { this._newGame(); this._renderBoardScreen(); },
      onMenu: () => this._quitToMenu(),
    });
  }

  _applyRemote(d) {
    // authoritative state update from server
    if (d.fen) {
      this.game = new Game(d.fen);
      this.selected = -1;
      if (d.san && this.remoteSans) {
        this.remoteSans.push(d.san);
      } else if (d.resign) {
        this._end({ title: d.winner === this.playerColor ? 'Opponent resigned — You win' : 'You resigned', subtitle: 'Resignation', win: d.winner === this.playerColor });
      }
      this._renderBoardScreen();
    }
  }
}

function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const host = location.host;
  const base = proto + '://' + host;
  return base;
}

export default App;

if (typeof window !== 'undefined' && !window.__regalBootstrap) {
  window.__regalBootstrap = true;
  window.addEventListener('DOMContentLoaded', () => {
    const app = new App(document.getElementById('game'));
    window.__app = app;
    app.boot();
  });
}
