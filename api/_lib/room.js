// api/_lib/room.js
// Room store + authoritative game logic for serverless multiplayer.
// Rooms live in Upstash Redis; every move is validated with the shared rules
// engine (the exact same code the client uses), so the server is authoritative.
import { Game, DEFAULT_FEN } from '../../engine/index.js';
import { redisGet, redisSet } from './redis.js';

const ROOM_TTL = 60 * 60 * 2; // 2h
const ROOM_KEY = (code) => `regal:room:${code}`;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeRoomCode(len = 5) {
  let code = '';
  for (let i = 0; i < len; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

function emptyRoom(code, hostName) {
  return {
    code,
    host: 'w',
    players: { w: { name: hostName }, b: { name: null } },
    moves: [], // {from, to, promo, san}
    started: false,
    status: 'waiting', // waiting | playing | over
    result: null, // {winner, type}
    rematchVotes: { w: false, b: false },
    resign: { w: false, b: false },
    drawOffer: null,
    lastActive: Date.now(),
  };
}

export async function createRoom(hostName) {
  let code;
  do {
    code = makeRoomCode();
  } while (await redisGet(ROOM_KEY(code)) != null);
  const room = emptyRoom(code, hostName);
  await saveRoom(room);
  return room;
}

export async function getRoom(code) {
  if (!code) return null;
  return redisGet(ROOM_KEY(code));
}

export async function saveRoom(room) {
  room.lastActive = Date.now();
  await redisSet(ROOM_KEY(room.code), room, ROOM_TTL);
}

export async function joinRoom(code, name) {
  const room = await getRoom(code);
  if (!room) return { error: 'Room not found', code: 404 };
  if (room.status !== 'waiting' && !room.players.b) return { error: 'Room is full', code: 400 };
  room.players.b = { name };
  // game starts as soon as the second player joins
  room.started = true;
  room.status = 'playing';
  await saveRoom(room);
  return { room };
}

// Rebuild a fresh Game from the room's move list (authoritative source of truth).
export function gameFromRoom(room) {
  const game = new Game(DEFAULT_FEN);
  for (const m of room.moves) {
    const r = game.move(m.from, m.to, m.promo);
    if (!r) throw new Error('corrupt room history');
  }
  return game;
}

// Attempt to apply a move. Returns {ok, game} or {error}.
export function tryMove(room, move) {
  if (room.status !== 'playing') return { error: 'Game has not started' };
  const game = gameFromRoom(room);
  // color must match the side to move
  const color = move.color;
  if (color !== game.turn) return { error: 'Not your turn' };
  const result = game.move(move.from, move.to, move.promo);
  if (!result) return { error: 'Illegal move' };
  room.moves.push({ from: move.from, to: move.to, promo: move.promo, san: result.san });
  return { ok: true, game, san: result.san };
}

// Detect terminal result using the shared engine.
export function detectResult(room, game) {
  const res = game.result();
  if (res.over) {
    return {
      winner: res.winner || null,
      type: res.type,
    };
  }
  return null;
}

export async function roomResult(room) {
  if (room.status === 'over' && room.result) return room.result;
  return null;
}

export async function resignRoom(room, color) {
  if (room.status !== 'playing') return { error: 'Not in a game' };
  room.resign[color] = true;
  room.status = 'over';
  room.result = { winner: color === 'w' ? 'b' : 'w', type: 'resign' };
  await saveRoom(room);
  return { ok: true, result: room.result };
}

export async function drawRoom(room, color, accept) {
  if (room.status !== 'playing') return { error: 'Not in a game' };
  if (accept) {
    if (room.drawOffer && room.drawOffer !== color) {
      room.status = 'over';
      room.result = { winner: null, type: 'agreement' };
      room.drawOffer = null;
    } else {
      return { error: 'No draw to accept' };
    }
  } else {
    room.drawOffer = color;
  }
  await saveRoom(room);
  return { ok: true, result: room.result || null, drawOffer: room.drawOffer };
}

export async function rematchRoom(room, color) {
  room.rematchVotes[color] = true;
  if (room.rematchVotes.w && room.rematchVotes.b) {
    // reset the game
    room.moves = [];
    room.started = true;
    room.status = 'playing';
    room.result = null;
    room.rematchVotes = { w: false, b: false };
    room.resign = { w: false, b: false };
    room.drawOffer = null;
    await saveRoom(room);
    return { ok: true, reset: true };
  }
  await saveRoom(room);
  return { ok: true, reset: false };
}
