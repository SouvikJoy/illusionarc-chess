// api/room/join.js
// POST { code, name } -> join a room as Black.
import { joinRoom } from '../_lib/room.js';
import { json, cors, readBody } from '../_lib/response.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return cors(res);
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);
  const body = await readBody(req);
  const code = (body.code || '').toUpperCase();
  const name = (body.name || 'Player').slice(0, 20);
  const out = await joinRoom(code, name);
  if (out.error) return json(res, { error: out.error }, out.code || 400);
  return json(res, { code: out.room.code, color: 'b', players: out.room.players });
}
