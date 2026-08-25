// ui/dom.js
// Small DOM helpers + design-system component factories (buttons, toast, modal).
import { playSfx } from '../audio/audio.js';

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'style') node.style.cssText = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

// Button with design-system states + click sound. variant: primary|secondary|utility.
export function button(label, onClick, opts = {}) {
  const { variant = 'primary', icon, disabled, className = '' } = opts;
  const btn = el('button', { class: `btn btn-${variant} ${className}`, type: 'button' });
  if (icon) btn.appendChild(el('span', { class: 'btn-icon', 'aria-hidden': 'true' }, icon));
  btn.appendChild(el('span', { class: 'btn-label' }, label));
  if (disabled) {
    btn.disabled = true;
    btn.classList.add('is-disabled');
  } else {
    btn.addEventListener('click', () => {
      playSfx('click');
      onClick && onClick();
    });
  }
  return btn;
}

export function iconButton(icon, label, onClick, opts = {}) {
  const btn = el('button', {
    class: 'icon-btn',
    type: 'button',
    title: label,
    'aria-label': label,
  }, icon);
  if (opts && onClick) {
    btn.addEventListener('click', () => {
      playSfx('click');
      onClick();
    });
  }
  return btn;
}

export function card(title, children = [], opts = {}) {
  const c = el('div', { class: 'card' });
  if (title) c.appendChild(el('div', { class: 'card-title' }, title));
  c.appendChild(el('div', { class: 'card-body' }, children));
  return c;
}

// toast/notification
export function toastLayer() {
  const layer = el('div', { class: 'toast-layer' });
  return layer;
}

export function toast(message, opts = {}) {
  const { layer, type = 'info', duration = 2200 } = opts;
  if (!layer) return;
  const t = el('div', { class: `toast toast-${type}` }, message);
  layer.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, duration);
}
