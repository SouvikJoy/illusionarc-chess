// server/index.js
// Regal Chess — Node server. Serves static files and hosts an authoritative
// WebSocket multiplayer room system reusing the shared rules engine.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Game } from '../engine/index.js';
import { parseFen } from '../engine/core.js';
import { MSG, encode, makeRoomCode } from '../shared/protocol.js';

const __dirname = resolve(fileURLToPath(new URL('.', import.meta.url)));
const ROOT = resolve(__dirname, '..');
const PORT = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent((req.url || '/').split('?')[0]);
    if (path === '/') path = '/index.html';
    const filePath = join(ROOT, path);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

const wss = new WebSocketServer({ server });

// --- room store ---
const rooms = new Map(); // code -> room
const clients = new Map(); // ws -> {roomCode, color, name}

function send(ws, type, data) {
  if (ws.readyState === 1) ws.send(encode(type, data));
}
function roomSend(room, type, data, except) {
  for (const [ws, info] of clients) {
    if (info.roomCode === room.code && ws !== except) send(ws, type, data);
  }
}

function makeRoom() {
  let code;
  do { code = makeRoomCode(5); } while (rooms.has(code));
  const room = {
    code,
    started: false,
    game: new Game(),
    colors: new Map(), // color -> ws
    last: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

function touch(room) { room.last = Date.now(); }

function assignColor(room, wants) {
  if (!room.colors.has('w')) { room.colors.set('w', wants); return 'w'; }
  if (!room.colors.has('b')) { room.colors.set('b', wants); return 'b'; }
  return null;
}

wss.on('connection', (ws) => {
  clients.set(ws, { roomCode: null, color: null, name: 'Player' });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    handle(ws, msg);
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    if (info && info.roomCode) {
      const room = rooms.get(info.roomCode);
      if (room) {
        room.colors.delete(info.color);
        roomSend(room, MSG.OPPONENT_QUIT, {});
        if (room.colors.size === 0) rooms.delete(room.code);
      }
    }
    clients.delete(ws);
  });
});

function handle(ws, msg) {
  const { type, data = {} } = msg;
  const info = clients.get(ws);
  if (type === MSG.CREATE_ROOM) {
    const room = makeRoom();
    info.roomCode = room.code;
    info.name = data.name || info.name;
    info.color = assignColor(room, 'w');
    clients.set(ws, { ...info, color: info.color });
    touch(room);
    send(ws, MSG.ROOM_CREATED, { code: room.code });
    send(ws, MSG.STATE_ASSIGNED, { color: info.color });
  } else if (type === MSG.JOIN_ROOM) {
    const room = rooms.get((data.code || '').toUpperCase());
    if (!room) { send(ws, MSG.ERROR, { message: 'Room not found' }); return; }
    if (room.colors.size >= 2) { send(ws, MSG.ERROR, { message: 'Room is full' }); return; }
    info.roomCode = room.code;
    info.name = data.name || info.name;
    const color = assignColor(room, null);
    info.color = color;
    clients.set(ws, { ...info, color });
    touch(room);
    send(ws, MSG.ROOM_JOINED, { code: room.code });
    send(ws, MSG.STATE_ASSIGNED, { color });
    // notify host a player joined
    roomSend(room, MSG.OPPONENT_READY, { color });
  } else if (type === MSG.CHOOSE_COLOR) {
    const room = rooms.get(info.roomCode);
    if (!room) return;
    // simple: if requested color free, reassign
  } else if (type === MSG.START) {
    const room = rooms.get(info.roomCode);
    if (!room) return;
    room.started = true;
    room.game = new Game();
    touch(room);
    roomSend(room, MSG.GAME_STARTED, { fen: room.game.fen() });
  } else if (type === MSG.MOVE) {
    const room = rooms.get(info.roomCode);
    if (!room || !room.started) { send(ws, MSG.ERROR, { message: 'Not in a game' }); return; }
    if (info.color !== room.game.turn) { send(ws, MSG.ERROR, { message: 'Not your turn' }); return; }
    const result = room.game.move(data.from, data.to, data.promotion);
    if (!result) { send(ws, MSG.ERROR, { message: 'Illegal move' }); return; }
    touch(room);
    roomSend(room, MSG.STATE, { fen: room.game.fen(), san: result.san, from: data.from, to: data.to, promotion: data.promotion || null });
    // game over?
    // (No auto-end required; client handles result UI. Server just relays state.)
  } else if (type === MSG.RESIGN) {
    const room = rooms.get(info.roomCode);
    if (!room) return;
    const winner = info.color === 'w' ? 'b' : 'w';
    roomSend(room, MSG.STATE, { fen: room.game.fen(), resign: true, winner });
    touch(room);
  } else if (type === MSG.DRAW_OFFER) {
    const room = rooms.get(info.roomCode);
    if (!room) return;
    roomSend(room, MSG.DRAW_REQUESTED, { from: info.color }, ws);
    touch(room);
  } else if (type === MSG.DRAW_ACCEPT) {
    const room = rooms.get(info.roomCode);
    if (!room) return;
    roomSend(room, MSG.DRAW_RESULT, { draw: true });
    touch(room);
  } else if (type === MSG.REMATCH_OFFER) {
    const room = rooms.get(info.roomCode);
    if (!room) return;
    roomSend(room, MSG.REMATCH_REQUESTED, { from: info.color }, ws);
    touch(room);
  } else if (type === MSG.REMATCH_ACCEPT) {
    const room = rooms.get(info.roomCode);
    if (!room) return;
    room.game = new Game();
    room.started = true;
    roomSend(room, MSG.GAME_STARTED, { fen: room.game.fen() });
    touch(room);
  } else if (type === MSG.RESUME) {
    const room = rooms.get((data.code || '').toUpperCase());
    if (!room) { send(ws, MSG.ERROR, { message: 'Room not found' }); return; }
    info.roomCode = room.code;
    info.color = room.colors.size >= 2 ? null : assignColor(room, 'w');
    clients.set(ws, { ...info, color: info.color });
    send(ws, MSG.STATE_ASSIGNED, { color: info.color });
    send(ws, MSG.STATE_SYNC, { fen: room.game ? room.game.fen() : undefined });
    roomSend(room, MSG.OPPONENT_READY, {});
    touch(room);
  }
}

// room cleanup every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.last > 30 * 60 * 1000) rooms.delete(code);
  }
}, 5 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`Regal Chess server running → http://localhost:${PORT}`);
});
