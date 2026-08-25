// api/room/create.js
// POST { name } -> create a new room, host is White.
import { createRoom } from '../_lib/room.js';
import { json, cors, readBody } from '../_lib/response.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return cors(res);
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);
  const body = await readBody(req);
  const name = (body.name || 'Player').slice(0, 20);
  const room = await createRoom(name);
  return json(res, { code: room.code, color: room.host, players: room.players });
}
