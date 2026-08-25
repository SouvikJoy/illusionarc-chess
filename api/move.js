// api/move.js
// POST { code, color, from, to, promo } -> validate + apply authoritative move.
// Auto-starts the game on the first move once both players have joined.
import { getRoom, saveRoom, tryMove, detectResult } from './_lib/room.js';
import { json, cors, readBody } from './_lib/response.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return cors(res);
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);
  const body = await readBody(req);

  const code = (body.code || '').toUpperCase();
  const room = await getRoom(code);
  if (!room) return json(res, { error: 'Room not found' }, 404);

  // auto-start when the second player is present and game hasn't started
  if (!room.started) {
    if (!room.players.b) return json(res, { error: 'Waiting for opponent' }, 400);
    room.started = true;
    room.status = 'playing';
  }

  const move = {
    color: body.color,
    from: body.from,
    to: body.to,
    promo: body.promo,
  };

  const out = tryMove(room, move);
  if (out.error) return json(res, { error: out.error }, 400);

  // detect game end
  room.result = detectResult(room, out.game);
  if (room.result) room.status = 'over';

  await saveRoom(room);
  return json(res, {
    ok: true,
    san: out.san,
    fen: out.game.fen(),
    moves: room.moves.length,
    result: room.result,
    status: room.status,
  });
}
