// api/state.js
// GET ?code=XXX&since=N -> poll for new moves + room status.
import { getRoom } from './_lib/room.js';
import { json, cors } from './_lib/response.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return cors(res);
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const url = new URL(req.url, `${proto}://${host}`);
  const code = (url.searchParams.get('code') || '').toUpperCase();
  const since = parseInt(url.searchParams.get('since') || '0', 10) || 0;

  const room = await getRoom(code);
  if (!room) return json(res, { error: 'Room not found', code: 404 }, 404);

  return json(res, {
    code: room.code,
    started: room.started,
    status: room.status,
    result: room.result,
    players: room.players,
    moves: room.moves.slice(since),
    movesTotal: room.moves.length,
    rematchVotes: room.rematchVotes,
    resign: room.resign,
    drawOffer: room.drawOffer,
  });
}
