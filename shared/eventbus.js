// shared/eventbus.js
// Minimal typed event bus. Framework-agnostic (client + presentation).
const listeners = new Map(); // type -> Set<fn>

export function emit(type, payload) {
  const set = listeners.get(type);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(payload);
    } catch (err) {
      // keep one bad listener from breaking others
      console.error('[eventbus] listener error for "' + type + '":', err);
    }
  }
}

export function on(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  return () => off(type, fn);
}

export function off(type, fn) {
  const set = listeners.get(type);
  if (set) set.delete(fn);
}

export function clear() {
  listeners.clear();
}
