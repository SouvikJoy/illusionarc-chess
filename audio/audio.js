// audio/audio.js
// Procedural WebAudio sound design (no external files). Provides SFX + a soft
// generative ambient music loop, with separate SFX/Music/Master volume groups.
// All sounds are synthesized so the game ships fully self-contained.

let ctx = null;
let masterGain = null;
let sfxGain = null;
let musicGain = null;
let ambientNodes = [];
let enabled = true;
let musicOn = false;

function ensureCtx() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  sfxGain = ctx.createGain();
  musicGain = ctx.createGain();
  sfxGain.connect(masterGain);
  musicGain.connect(masterGain);
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 1;
  sfxGain.gain.value = 0.9;
  musicGain.gain.value = 0.0;
  return ctx;
}

export function initAudio() {
  ensureCtx();
}

export function resumeAudio() {
  const c = ensureCtx();
  if (c.state === 'suspended') c.resume();
}

export function toggleEnabled(val) {
  enabled = val !== false;
  if (masterGain) masterGain.gain.value = enabled ? 1 : 0;
}
export function isEnabled() {
  return enabled;
}

export function setMaster(v) {
  if (masterGain) masterGain.gain.value = enabled ? v : 0;
}
export function setSFX(v) {
  if (sfxGain) sfxGain.gain.value = v;
}
export function setMusic(v) {
  if (musicGain) musicGain.gain.value = musicOn ? v : 0;
}

// tone helper
function tone({ freq = 440, dur = 0.12, type = 'sine', vol = 0.5, attack = 0.005, decay, when = 0, pitchTo }) {
  const c = ensureCtx();
  attack = attack == null ? 0.005 : attack;
  decay = decay == null ? dur : decay;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (pitchTo) osc.frequency.exponentialRampToValueAtTime(pitchTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  osc.connect(g);
  g.connect(sfxGain);
  osc.start(t0);
  osc.stop(t0 + attack + decay + 0.02);
}

// noise burst helper (for capture / impact)
function noise({ dur = 0.06, vol = 0.3, when = 0, freq = 1200 }) {
  const c = ensureCtx();
  const t0 = c.currentTime + when;
  const len = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(sfxGain);
  src.start(t0);
  src.stop(t0 + dur);
}

const jitter = () => 0.92 + Math.random() * 0.16;

export const sfx = {
  click() {
    tone({ freq: 520 * jitter(), dur: 0.05, type: 'triangle', vol: 0.25 });
  },
  hover() {
    tone({ freq: 380, dur: 0.04, type: 'sine', vol: 0.12 });
  },
  select() {
    tone({ freq: 660 * jitter(), dur: 0.08, type: 'triangle', vol: 0.3 });
  },
  move() {
    tone({ freq: 240, dur: 0.09, type: 'sine', vol: 0.4 });
    tone({ freq: 320, dur: 0.05, type: 'triangle', vol: 0.18, when: 0.01 });
  },
  capture() {
    noise({ dur: 0.07, vol: 0.34, freq: 1800 });
    tone({ freq: 190, dur: 0.16, type: 'sine', vol: 0.42 });
  },
  check() {
    tone({ freq: 780, dur: 0.12, type: 'square', vol: 0.16 });
    tone({ freq: 620, dur: 0.12, type: 'square', vol: 0.16, when: 0.1 });
  },
  invalid() {
    tone({ freq: 160, dur: 0.14, type: 'sawtooth', vol: 0.18 });
    tone({ freq: 130, dur: 0.12, type: 'sawtooth', vol: 0.14, when: 0.08 });
  },
  castle() {
    tone({ freq: 260, dur: 0.1, type: 'sine', vol: 0.34 });
    tone({ freq: 410, dur: 0.1, type: 'triangle', vol: 0.2, when: 0.09 });
  },
  promote() {
    tone({ freq: 660, dur: 0.12, type: 'triangle', vol: 0.28 });
    tone({ freq: 880, dur: 0.14, type: 'triangle', vol: 0.26, when: 0.09 });
    tone({ freq: 1100, dur: 0.16, type: 'sine', vol: 0.2, when: 0.18 });
  },
  catchMove() {
    // en passant-ish flick
    tone({ freq: 500, dur: 0.06, type: 'triangle', vol: 0.22 });
    noise({ dur: 0.03, vol: 0.2, freq: 2200 });
  },
  draw() {
    tone({ freq: 520, dur: 0.12, type: 'sine', vol: 0.22 });
    tone({ freq: 440, dur: 0.14, type: 'sine', vol: 0.2, when: 0.1 });
  },
  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone({ freq: f, dur: 0.28, type: 'triangle', vol: 0.3, when: i * 0.13 }));
  },
  defeat() {
    const notes = [400, 360, 300, 240];
    notes.forEach((f, i) => tone({ freq: f, dur: 0.26, type: 'sine', vol: 0.24, when: i * 0.13 }));
  },
  joined() {
    tone({ freq: 580, dur: 0.1, type: 'triangle', vol: 0.3 });
    tone({ freq: 720, dur: 0.1, type: 'triangle', vol: 0.28, when: 0.1 });
  },
  quit() {
    tone({ freq: 420, dur: 0.1, type: 'sine', vol: 0.22 });
    tone({ freq: 320, dur: 0.12, type: 'sine', vol: 0.2, when: 0.09 });
  },
  open() {
    tone({ freq: 500, dur: 0.06, type: 'triangle', vol: 0.2 });
  },
  close() {
    tone({ freq: 380, dur: 0.06, type: 'triangle', vol: 0.18 });
  },
};

export function playSfx(name) {
  if (!enabled) return;
  const fn = sfx[name];
  if (fn) fn();
}

// --- generative ambient music ---
// A gentle, looping set of slow sine/chord tones with soft attack, low volume.
const CHORDS = [
  [220, 277, 330], // A major-ish
  [196, 262, 294], // G
  [247, 311, 370], // B minor-ish
  [220, 277, 330],
];

export function startMusic() {
  const c = ensureCtx();
  musicOn = true;
  setMusic(musicGain ? musicGain.gain.value : 0.22);
  if (ambientNodes.length) return;
  let stepIndex = 0;
  const scheduler = () => {
    if (!musicOn || !ctx) return;
    const chord = CHORDS[stepIndex % CHORDS.length];
    const base = 0;
    chord.forEach((f, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      const t0 = c.currentTime;
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.02, t0 + 0.8);
      g.gain.linearRampToValueAtTime(0.0001, t0 + 4.2);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t0);
      osc.stop(t0 + 4.4);
      ambientNodes.push(osc);
    });
    stepIndex++;
    ambientTimer = setTimeout(scheduler, 4200);
  };
  var ambientTimer = setTimeout(scheduler, 10);
  ambientNodes._timer = ambientTimer;
}

export function stopMusic() {
  musicOn = false;
  if (ambientNodes) {
    clearTimeout(ambientNodes._timer);
    for (const n of ambientNodes) {
      try {
        n.stop();
      } catch {}
    }
    ambientNodes = [];
  }
  if (musicGain) musicGain.gain.value = 0;
}
