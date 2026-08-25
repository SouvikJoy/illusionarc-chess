// net/client.js
// Multiplayer client for Vercel: HTTP + polling (no WebSocket server needed).
// Server-authoritative: moves are validated on the server (shared engine),
// the client polls /api/state and reconciles.
import { setupName } from './name.js';

const BASE = typeof window !== 'undefined' ? window.location.origin : '';
const POLL_MS = 800;

export class NetClient {
  constructor() {
    this.roomCode = null;
    this.playerColor = null;
    this.handlers = new Map(); // msg type -> fn
    this.connected = false;
    this.pollTimer = null;
    this._since = 0;
    this._disposed = false;
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, fn);
    else { const prev = this.handlers.get(type); this.handlers.set(type, (d) => { prev(d); fn(d); }); }
  }

  _fire(type, data = {}) {
    const fn = this.handlers.get(type);
    if (fn) fn(data);
  }

  async _post(path, body) {
    const res = await fetch(`${BASE}/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async _get(path) {
    const res = await fetch(`${BASE}/api/${path}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // ---- lobby ----
  async host() {
    const data = await this._post('room/create', { name: setupName() });
    this.roomCode = data.code;
    this.playerColor = data.color;
    this.connected = true;
    this._fire('room_created', { code: data.code });
    this._fire('state_assigned', { color: data.color });
    this._startPoll();
    return data;
  }

  async join(code) {
    const data = await this._post('room/join', { code, name: setupName() });
    this.roomCode = data.code;
    this.playerColor = data.color;
    this.connected = true;
    this._fire('room_joined', { code: data.code });
    this._fire('state_assigned', { color: data.color });
    this._startPoll();
    return data;
  }

  // ---- in-game ----
  async move(m) {
    const data = await this._post('move', {
      code: this.roomCode,
      color: this.playerColor,
      from: m.from,
      to: m.to,
      promo: m.flags && m.flags.promo ? m.flags.promo : undefined,
    });
    return data;
  }

  async resign() {
    return this._post('resign', { code: this.roomCode, color: this.playerColor });
  }

  async drawOffer() {
    return this._post('draw', { code: this.roomCode, color: this.playerColor });
  }

  async drawAccept() {
    return this._post('draw', { code: this.roomCode, color: this.playerColor, accept: true });
  }

  async rematchOffer() {
    return this._post('rematch', { code: this.roomCode, color: this.playerColor });
  }

  close() {
    this._disposed = true;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
    this.connected = false;
  }

  // ---- polling loop ----
  _startPoll() {
    this.poll();
  }

  async poll() {
    if (this._disposed) return;
    try {
      const data = await this._get(`state?code=${this.roomCode}&since=${this._since}`);
      this._fire('poll', data);
      this._since = data.movesTotal;
      // reconcile new moves
      if (data.moves && data.moves.length) {
        this._fire('opponent_moves', { moves: data.moves });
      }
      if (data.status === 'over' && data.result) {
        this._fire('game_result', { result: data.result });
      }
      if (data.status === 'playing' && data.started && !this._gameStarted) {
        this._gameStarted = true;
        this._fire('game_started', {});
      }
      if (data.rematchVotes && (data.rematchVotes.w || data.rematchVotes.b)) {
        this._fire('rematch_requested', { votes: data.rematchVotes });
      }
      if (data.drawOffer) {
        this._fire('draw_requested', { from: data.drawOffer });
      }
    } catch (err) {
      // transient errors: keep polling
    }
    if (!this._disposed) this.pollTimer = setTimeout(() => this.poll(), POLL_MS);
  }
}
