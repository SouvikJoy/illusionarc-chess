// ui/promotion.js
// Promotion piece-choice popup.
import { el, button } from './dom.js';
import { pieceSvg } from '../view/pieces.js';
import { playSfx } from '../audio/audio.js';

export function showPromotion(color, onPick) {
  // clear any existing promotion popups
  const layer = document.getElementById('promoLayer');
  layer.innerHTML = '';
  const scrim = el('div', { class: 'modal-scrim' });
  const panel = el('div', { class: 'modal promotion-panel' });
  const title = el('div', { class: 'modal-title' }, 'Promote to');
  const row = el('div', { class: 'promo-row' });
  const kinds = ['Q', 'R', 'B', 'N'];
  for (const k of kinds) {
    const btn = el('button', { type: 'button', class: 'promo-btn', 'data-kind': k });
    btn.innerHTML = pieceSvg(k, color);
    btn.addEventListener('click', () => {
      playSfx('click');
      scrim.remove();
      onPick(k);
    });
    row.appendChild(btn);
    // default ring color balance handled by css
  }
  panel.append(title, row);
  scrim.appendChild(panel);
  scrim.addEventListener('click', (e) => { if (e.target === scrim) { scrim.remove(); onPick('Q'); } });
  document.getElementById('promoLayer').appendChild(scrim);}
