// net/client.js
// WebSocket client + message protocol (per shared/protocol.js).
import { MSG, encode, decode } from '../shared/protocol.js';
import { setupName } from './name.js';

export class NetClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.handlers = new Map(); // MSG -> fn
    this.roomCode = null;
    this.playerColor = null; // 'w' | 'b'
    this.connected = false;
    this._queue = [];
  }

  connect(url = this.url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url || this.url);
      this.ws = ws;
      ws.onopen = () => {
        this.connected = true;
        const q = this._queue;
        this._queue = [];
        for (const m of q) this.send(m.type, m.data);
        resolve();
      };
      ws.onerror = () => { this.connected = false; reject(new Error('Connection failed')); };
      ws.onmessage = (e) => this._dispatch(decode(e.data));
      ws.onclose = () => { this.connected = false; this._fired('opponent_quit', { reason: 'connection_closed' }); };
    });
  }

  send(type, data = {}) {
    if (!this.ws) return;
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(encode(type, data));
    } else if (this.ws.readyState === WebSocket.CONNECTING) {
      this._queue.push({ type, data });
    }
  }

  _dispatch(msg) {
    if (!msg) return;
    const fn = this.handlers.get(msg.type);
    if (fn) fn(msg.data || {});
    else this._fired(msg.type, msg.data || {});
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, fn);
    else { const prev = this.handlers.get(type); this.handlers.set(type, (d) => { prev(d); fn(d); }); }
  }

  _fired(type, data) {
    const fn = this.handlers.get(type);
    if (fn) fn(data);
  }

  close() {
    try { this.ws && this.ws.close(); } catch {}
  }

  // helpers
  host() { this.send(MSG.CREATE_ROOM, { name: setupName() }); return this; }
  join(code) { this.send(MSG.JOIN_ROOM, { code, name: setupName() }); return this; }
  chooseColor(color) { this.send(MSG.CHOOSE_COLOR, { color }); return this; }
  start() { this.send(MSG.START); return this; }
  move(m) { this.send(MSG.MOVE, { from: m.from, to: m.to, promotion: m.promo }); return this; }
  resign() { this.send(MSG.RESIGN); return this; }
  drawOffer() { this.send(MSG.DRAW_OFFER); return this; }
  drawAccept() { this.send(MSG.DRAW_ACCEPT); return this; }
  drawDecline() { this.send(MSG.DRAW_DECLINE); return this; }
  rematchOffer() { this.send(MSG.REMATCH_OFFER); return this; }
  rematchAccept() { this.send(MSG.REMATCH_ACCEPT); return this; }
  resumeThen(code) { this.send(MSG.RESUME, { code }); return this; }
}
