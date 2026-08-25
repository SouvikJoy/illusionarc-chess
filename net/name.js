// net/name.js
import { getSettings } from '../ui/settings.js';
export function setupName() {
  const s = getSettings();
  return s.name || 'Player';
}
