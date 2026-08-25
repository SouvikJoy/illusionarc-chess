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
      this.screens.lobbyStatus('রুম তৈরি হচ্ছে…');
      this._connect();
      this.net.host().catch((e) => {
        this.screens.lobbyStatus('রুম তৈরি করা যায়নি: ' + e.message);
      });
    } else if (action === 'join') {
      if (!code) { this.screens.lobbyStatus('প্রথমে রুম কোড লিখুন'); return; }
      this.screens.lobbyStatus('যোগ দেওয়া হচ্ছে…');
      this._connect();
      this.net.join(code).catch((e) => {
        this.screens.lobbyStatus(e.status === 404 ? 'রুম পাওয়া যায়নি — কোডটি মিলিয়ে দেখুন' : 'যোগ দেওয়া যায়নি: ' + e.message);
      });
    }
  }

  _connect() {
    if (this.net) return;
    this.net = new NetClient();
    this._bindNet();
  }

  _bindNet() {
    const net = this.net;
    net.on('room_created', (d) => {
      this.roomCode = d.code;
      this.screens.lobbyStatus('রুম তৈরি হয়েছে। কোড শেয়ার করুন: ' + d.code);
      toast('কোড শেয়ার করুন: ' + d.code, { layer: this.toastLayer, type: 'info', duration: 5000 });
    });
    net.on('room_joined', (d) => {
      this.roomCode = d.code;
      this.screens.lobbyStatus('রুমে যোগ দিয়েছেন ' + d.code);
    });
    net.on('state_assigned', (d) => {
      this.playerColor = d.color;
      this.screens.lobbyStatus(d.color === 'w' ? 'আপনি সবুজ। প্রতিপক্ষের অপেক্ষায়…' : 'আপনি লাল। প্রতিপক্ষের অপেক্ষায়…');
    });
    net.on('game_started', () => {
      this._gameStarted = true;
      this._newGame();
      this.mode = 'online';
      this.gameMode = 'online';
      this.screens.lobbyStatus('');
      this._renderBoardScreen();
    });
    net.on('opponent_moves', (d) => this._applyRemoteMoves(d.moves));
    net.on('game_result', (d) => {
      if (this.gameOverShown) return;
      const { result } = d;
      const winnerColor = result.winner;
      let win;
      if (winnerColor == null) win = false;
      else win = winnerColor === this.playerColor;
      const title = this._resultTitle(result);
      this._end({ title, win, online: true });
    });
    net.on('rematch_requested', () => {
      this._pendingRematch = true;
      toast(this.opponentName() + ' আবার খেলতে চান', { layer: this.toastLayer, type: 'info', duration: 4000 });
    });
    net.on('draw_requested', (d) => {
      if (d.from === this.playerColor) return;
      this._pendingDraw = d.from;
      toast('প্রতিপক্ষ ড্র-এর প্রস্তাব দিয়েছেন। মেনে নিতে বোতামে চাপুন।', { layer: this.toastLayer, type: 'info', duration: 5000 });
    });
    net.on('opponent_quit', () => {
      toast('প্রতিপক্ষ গেম ছেড়ে চলে গেছেন।', { layer: this.toastLayer, type: 'error' });
      this._end({ title: 'প্রতিপক্ষ চলে গেছেন', subtitle: 'খেলাটি ত্যাগ করা হয়েছে।', win: false, online: true });
    });
  }

  _resultTitle(result) {
    const type = result && result.type;
    const winner = result && result.winner;
    const who = winner ? (winner === 'w' ? 'সবুজ' : 'লাল') : '';
    const map = {
      checkmate: `${who} কিস্তিমাতে জিতেছেন`,
      stalemate: 'স্টালমেটে ড্র',
      insufficient: 'অপর্যাপ্ত গুটিতে ড্র',
      fifty: '৫০-মুভ নিয়মে ড্র',
      threefold: 'তিনবার পুনরাবৃত্তিতে ড্র',
      resign: `${who} জিতেছেন — পরাজয় স্বীকার`,
      agreement: 'চুক্তিতে ড্র',
    };
    return (map[type] || 'খেলা শেষ') + (winner === this.playerColor ? ' — আপনি জিতেছেন!' : '');
  }

  _newGame() {
    this.game = new Game();
    this.gameMode = this.mode;
    this.selected = -1;
    this.aiThinking = false;
    this.pendingPromotion = null;
    this._winner = null;
    this.remoteSans = [];
    this._moveInFlight = false;
    this._lastSentMove = null;
    this._gameStarted = false;
    this._pendingRematch = false;
    this._pendingDraw = null;
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
    for (const h of this.game.history) this.hud.addMove(h.san);
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
      const me = 'খেলোয়াড়';
      return {
        w: { name: this.playerColor === 'w' ? (s.name || 'আপনি') : (this.opponentName() || 'প্রতিপক্ষ') },
        b: { name: this.playerColor === 'b' ? (s.name || 'আপনি') : (this.opponentName() || 'প্রতিপক্ষ') },
      };
    }
    if (this.mode === 'ai') {
      return {
        w: { name: s.side === 'b' ? 'কম্পিউটার' : (s.name || 'আপনি') },
        b: { name: s.side === 'w' ? 'কম্পিউটার' : (s.name || 'আপনি') },
      };
    }
    return { w: { name: 'সবুজ' }, b: { name: 'লাল' } };
  }

  getSettingsSide() {
    return this.settings;
  }

  opponentName() {
    return (this.netName || 'প্রতিপক্ষ');
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
    if (this.mode === 'online') {
      // server-authoritative: send move, apply once confirmed via poll
      this._sendOnlineMove(move);
      return;
    }
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

  // In online mode, submit the move to the authoritative server. We optimistically
  // apply locally for immediate feedback; the poll reconciles authoritative state.
  _sendOnlineMove(move) {
    if (this._moveInFlight) return;
    this._moveInFlight = true;
    this._lastSentMove = { from: move.from, to: move.to };
    this.net.move(move)
      .then(() => {
        // apply locally (server confirmed the move is legal via its own engine)
        const moverColor = colorOf(this.game.board[move.from]);
        const wasCastle = move.flags && move.flags.castle;
        const wasPromo = move.flags && move.flags.promo;
        const capturedIdx = move.captured ? move.to : -1;
        const enPassantIdx = move.flags && move.flags.enPassant ? this._epCapturedIdx(move, moverColor) : -1;
        const result = this.game.move(move.from, move.to, move.flags && move.flags.promo);
        this._onMoveMade(result.san, {
          castle: wasCastle,
          promo: wasPromo,
          capturedIdx: capturedIdx >= 0 ? capturedIdx : enPassantIdx,
          captured: move.captured,
          from: move.from,
          to: move.to,
          square: nameOfSquare(move.to),
          enPassant: enPassantIdx >= 0,
          promotionKind: wasPromo ? (move.flags.promo) : null,
          castledRook: wasCastle ? this._castledRookIdx(move, moverColor) : -1,
        });
      })
      .catch(() => {
        toast('সার্ভার মুভটি প্রত্যাখ্যান করেছে', { layer: this.toastLayer, type: 'error' });
        this._moveInFlight = false;
        this._lastSentMove = null;
        this.selected = -1;
        this._applyHighlights();
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
      checkmate: winnerColor === 'w' ? 'সবুজ কিস্তিমাতে জিতেছে' : 'লাল কিস্তিমাতে জিতেছে',
      stalemate: 'স্টালমেটে ড্র',
      insufficient: 'অপর্যাপ্ত গুটিতে ড্র',
      fifty: '৫০-মুভ নিয়মে ড্র',
      threefold: 'তিনবার পুনরাবৃত্তিতে ড্র',
    };
    const title = resTxt[res.type] || 'খেলা শেষ';
    return {
      title,
      subtitle: res.type === 'checkmate' ? 'কিস্তিমাত' : res.type === 'stalemate' ? 'প্যাট' : '',
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
    this.hud.setStatus('কম্পিউটার ভাবছে…', 'thinking');
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
    const t = this.game.turn === 'w' ? 'সবুজ' : 'লাল';
    if (this.game.inCheck()) return t + ' এর পালা — কিস্তি!';
    return t + ' এর পালা';
  }

  _title() {
    if (this.mode === 'online') return 'অনলাইন ম্যাচ';
    if (this.mode === 'ai') return 'কম্পিউটারের বিরুদ্ধে';
    return 'একই ডিভাইসে';
  }

  _rematch() {
    this.gameOverShown = false;
    if (this.mode === 'online') {
      this.net && this.net.rematchOffer();
      this.screens.showMenu();
    } else {
      this._newGame();
      this._renderBoardScreen();
    }
  }

  _quitToMenu() {
    this.gameOverShown = false;
    this.screens.clear();
    this.mode = null;
    this._gameStarted = false;
    if (this.net) { this.net.close(); this.net = null; }
    this.screens.showMenu();
  }

  _pause() {
    this.screens.showPause({
      onResume: () => { playSfx('close'); this._renderBoardScreen(); },
      onResign: () => {
        if (this.mode === 'online') {
          this.net && this.net.resign();
          this._end({ title: 'আপনি পরাজয় স্বীকার করেছেন', subtitle: 'আপনি খেলাটি ছেড়ে দিয়েছেন।', win: false, online: true });
        } else {
          this._end({ title: 'আপনি পরাজয় স্বীকার করেছেন', subtitle: 'আপনি খেলাটি ছেড়ে দিয়েছেন।', win: false });
        }
      },
      onNewGame: () => { this._newGame(); this._renderBoardScreen(); },
      onMenu: () => this._quitToMenu(),
    });
  }

  // Apply moves that arrived from the server (opponent moves + confirmations).  // The player's own move is applied locally right after the server confirms it,
  // so here we skip any move that matches the player's just-sent move.
  _applyRemoteMoves(moves) {
    if (!moves || !moves.length) return;
    for (const m of moves) {
      const from = m.from;
      const to = m.to;
      // Skip if this is the player's own last move (already applied locally).
      if (this._lastSentMove && this._lastSentMove.from === from && this._lastSentMove.to === to) {
        this._lastSentMove = null;
        this._moveInFlight = false;
        continue;
      }
      // It's an opponent move (or a replay): apply to the local engine.
      const legal = this.game.legalMoves(from);
      const mv = legal.find((x) => x.to === to);
      if (!mv) continue;
      const moverColor = colorOf(this.game.board[from]);
      const capturedIdx = mv.captured ? mv.to : -1;
      const enPassantIdx = mv.flags && mv.flags.enPassant ? this._epCapturedIdx(mv, moverColor) : -1;
      const result = this.game.move(from, to, mv.flags && mv.flags.promo);
      this._onMoveMade(result.san, {
        castle: !!(mv.flags && mv.flags.castle),
        promo: !!(mv.flags && mv.flags.promo),
        capturedIdx: capturedIdx >= 0 ? capturedIdx : enPassantIdx,
        captured: mv.captured,
        from,
        to,
        square: nameOfSquare(to),
        enPassant: enPassantIdx >= 0,
        promotionKind: mv.flags && mv.flags.promo ? mv.flags.promo : null,
        castledRook: mv.flags && mv.flags.castle ? this._castledRookIdx(mv, moverColor) : -1,
      });
      this._moveInFlight = false;
    }
    this._renderHud();
  }
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
