// shared/protocol.js
// Client<->Server WebSocket message contract (per architecture.md §8).
export const MSG = {
  // client -> server
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  CHOOSE_COLOR: 'choose_color',
  START: 'start',
  MOVE: 'move',
  RESIGN: 'resign',
  DRAW_OFFER: 'draw_offer',
  DRAW_ACCEPT: 'draw_accept',
  DRAW_DECLINE: 'draw_decline',
  REMATCH_OFFER: 'rematch_offer',
  REMATCH_ACCEPT: 'rematch_accept',
  RESUME: 'resume',
  // server -> client
  ROOM_CREATED: 'room_created',
  ROOM_JOINED: 'room_joined',
  OPPONENT_READY: 'opponent_ready',
  STATE_ASSIGNED: 'state_assigned',
  GAME_STARTED: 'game_started',
  STATE: 'state', // authoritative state diff after a move
  OPPONENT_MOVE: 'opponent_move',
  OPPONENT_QUIT: 'opponent_quit',
  DRAW_REQUESTED: 'draw_requested',
  DRAW_RESULT: 'draw_result',
  REMATCH_REQUESTED: 'rematch_requested',
  STATE_SYNC: 'state_sync',
  ERROR: 'error',
};

export function encode(type, data = {}) {
  return JSON.stringify({ type, data });
}

export function decode(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.type) return null;
    return parsed;
  } catch {
    return null;
  }
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeRoomCode(len = 4) {
  let code = '';
  for (let i = 0; i < len; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}
