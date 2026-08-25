// api/resign.js
// POST { code, color } -> resign the game.
import { getRoom, resignRoom } from './_lib/room.js';
import { json, cors, readBody } from './_lib/response.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return cors(res);
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);
  const body = await readBody(req);
  const room = await getRoom((body.code || '').toUpperCase());
  if (!room) return json(res, { error: 'Room not found' }, 404);
  const out = await resignRoom(room, body.color);
  if (out.error) return json(res, { error: out.error }, 400);
  return json(res, { ok: true, result: out.result });
}
