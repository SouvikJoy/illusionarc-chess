// api/_lib/redis.js
// Tiny Upstash Redis REST client for Vercel serverless functions.
// Uses UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars.
// Falls back to an in-memory store when no endpoint is configured (local dev /
// preview without credentials), so the API never crashes.
const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// ---- in-memory fallback (single-instance dev/preview) ----
const memory = new Map();

function url(path) {
  return `${REST_URL}/${path}`;
}

async function req(path, options = {}) {
  const res = await fetch(url(path), {
    ...options,
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`redis ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function redisGet(key) {
  if (!REST_URL) {
    const v = memory.get(key);
    return v ? JSON.parse(JSON.stringify(v)) : null;
  }
  const data = await req(`get/${key}`);
  return data.result == null ? null : JSON.parse(data.result);
}

export async function redisSet(key, value, ttlSeconds) {
  if (!REST_URL) {
    memory.set(key, JSON.parse(JSON.stringify(value)));
    return;
  }
  let path = `set/${key}`;
  if (ttlSeconds) path += `/ex/${ttlSeconds}`;
  await req(path, { method: 'POST', body: JSON.stringify(value) });
}

export async function redisDel(key) {
  if (!REST_URL) {
    memory.delete(key);
    return;
  }
  await req(`del/${key}`, { method: 'POST' });
}
