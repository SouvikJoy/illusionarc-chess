// view/piece-defs.js
// Folk-art painted chess set ("দাবা" — Bangladeshi heritage theme) inspired by
// hand-painted wooden sets. Each piece keeps its true chess identity but is
// dressed in folk painting: red (লাল) and green (সবুজ) armies, cream + gold
// (সোনালি) painted rings/scallops, dark outlines, and the distinctive tops —
// ball pawn, crenellated rook, horse knight, striped bishop, pink-lotus queen,
// and cross-topped king.
//
// Colours are injected via CSS custom properties (--armor/--armor2/--trim/--gold/
// --outline/--lotus) inherited into the shadow tree, so the same shapes paint
// as green or red depending on the side.

export const PIECE_DEFS = `
<g id="regal-pawn">
  <ellipse cx="85" cy="152" rx="30" ry="9" fill="var(--armor2)" stroke="var(--outline)" stroke-width="3"/>
  <ellipse cx="85" cy="146" rx="26" ry="8" fill="var(--armor)"/>
  <path d="M64 118 L64 140 L106 140 L106 118 Z" fill="var(--armor2)" stroke="var(--outline)" stroke-width="3"/>
  <circle cx="85" cy="93" r="9" fill="var(--gold)" stroke="var(--outline)" stroke-width="2"/>
  <path d="M68 118 C68 88 71 76 85 76 C99 76 102 88 102 118 Z" fill="var(--armor)" stroke="var(--outline)" stroke-width="3"/>
  <circle cx="85" cy="70" r="30" fill="var(--armor)" stroke="var(--outline)" stroke-width="3"/>
  <path d="M61 62 C 70 51 100 51 109 62" fill="none" stroke="var(--trim)" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M61 78 C 70 67 100 67 109 78" fill="none" stroke="var(--gold)" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
</g>

<g id="regal-rook">
  <ellipse cx="85" cy="152" rx="31" ry="9" fill="var(--armor2)" stroke="var(--outline)" stroke-width="3"/>
  <ellipse cx="85" cy="146" rx="27" ry="8" fill="var(--armor)"/>
  <path d="M60 44 L60 138 L110 138 L110 44 L104 44 L104 30 L96 44 L88 30 L82 44 L74 30 L66 44 Z" fill="var(--armor)" stroke="var(--outline)" stroke-width="3"/>
  <rect x="60" y="38" width="50" height="8" fill="var(--armor2)" stroke="var(--outline)" stroke-width="2"/>
  <rect x="60" y="104" width="50" height="8" fill="var(--armor2)" stroke="var(--outline)" stroke-width="2"/>
  <ellipse cx="85" cy="110" rx="24" ry="5" fill="var(--gold)" stroke="var(--outline)" stroke-width="2"/>
  <path d="M76 104 C76 92 94 92 94 104 Z" fill="var(--trim)" stroke="var(--outline)" stroke-width="2"/>
  <rect x="67" y="66" width="14" height="18" rx="3" fill="var(--trim)" stroke="var(--outline)" stroke-width="2"/>
  <rect x="89" y="66" width="14" height="18" rx="3" fill="var(--trim)" stroke="var(--outline)" stroke-width="2"/>
  <circle cx="85" cy="52" r="4" fill="var(--gold)" stroke="var(--outline)" stroke-width="1.5"/>
</g>

<g id="regal-knight">
  <ellipse cx="85" cy="152" rx="31" ry="9" fill="var(--armor2)" stroke="var(--outline)" stroke-width="3"/>
  <ellipse cx="85" cy="145" rx="27" ry="8" fill="var(--armor)"/>
  <path d="M57 132 C57 100 66 78 88 68 L95 44 L105 56 L122 38 L119 62 C128 70 132 82 129 96 C127 106 120 116 108 124 L100 124 L100 134 L70 134 Z" fill="var(--armor)" stroke="var(--outline)" stroke-width="3"/>
  <path d="M70 128 C70 100 78 84 92 76" fill="none" stroke="var(--gold)" stroke-width="5" stroke-linecap="round"/>
  <path d="M84 70 C90 60 100 56 108 60" fill="none" stroke="var(--trim)" stroke-width="4" stroke-linecap="round"/>
  <circle cx="105" cy="72" r="3.2" fill="var(--outline)"/>
  <circle cx="119" cy="86" r="3" fill="var(--outline)"/>
  <path d="M80 66 C 70 72 64 84 62 98" fill="none" stroke="var(--armor2)" stroke-width="6" stroke-linecap="round"/>
</g>

<g id="regal-bishop">
  <ellipse cx="85" cy="152" rx="30" ry="9" fill="var(--armor2)" stroke="var(--outline)" stroke-width="3"/>
  <ellipse cx="85" cy="146" rx="26" ry="8" fill="var(--armor)"/>
  <path d="M85 46 C 104 46 116 62 116 84 C116 108 106 120 96 128 L74 128 C64 120 54 108 54 84 C54 62 66 46 85 46 Z" fill="var(--armor)" stroke="var(--outline)" stroke-width="3"/>
  <path d="M85 54 V 120" stroke="var(--trim)" stroke-width="3" opacity="0.6"/>
  <path d="M70 58 C64 74 64 104 72 122" stroke="var(--gold)" stroke-width="2.5" fill="none" opacity="0.85"/>
  <path d="M100 58 C106 74 106 104 98 122" stroke="var(--gold)" stroke-width="2.5" fill="none" opacity="0.85"/>
  <ellipse cx="85" cy="122" rx="24" ry="5" fill="var(--gold)" stroke="var(--outline)" stroke-width="2"/>
  <circle cx="85" cy="40" r="7" fill="var(--gold)" stroke="var(--outline)" stroke-width="2"/>
  <rect x="83" y="42" width="4" height="6" fill="var(--armor)"/>
</g>

<g id="regal-queen">
  <ellipse cx="85" cy="152" rx="31" ry="9" fill="var(--armor2)" stroke="var(--outline)" stroke-width="3"/>
  <ellipse cx="85" cy="146" rx="27" ry="8" fill="var(--armor)"/>
  <path d="M85 66 C 102 66 114 80 114 100 C114 120 104 128 96 132 L74 132 C66 128 56 120 56 100 C56 80 68 66 85 66 Z" fill="var(--armor)" stroke="var(--outline)" stroke-width="3"/>
  <path d="M85 72 C73 72 66 82 66 98" stroke="var(--gold)" stroke-width="2.5" fill="none" opacity="0.85"/>
  <path d="M85 72 C97 72 104 82 104 98" stroke="var(--gold)" stroke-width="2.5" fill="none" opacity="0.85"/>
  <ellipse cx="85" cy="126" rx="24" ry="5" fill="var(--gold)" stroke="var(--outline)" stroke-width="2"/>
  <ellipse cx="85" cy="68" rx="20" ry="6" fill="var(--armor2)" stroke="var(--outline)" stroke-width="2"/>
  <!-- pink lotus finial -->
  <path d="M85 20 C 72 34 72 50 85 62 C98 50 98 34 85 20 Z" fill="var(--lotus)" stroke="var(--outline)" stroke-width="2.5"/>
  <path d="M70 34 C 62 42 62 52 70 58 C 78 52 78 42 70 34 Z" fill="var(--lotus)" stroke="var(--outline)" stroke-width="2.5"/>
  <path d="M100 34 C 108 42 108 52 100 58 C 92 52 92 42 100 34 Z" fill="var(--lotus)" stroke="var(--outline)" stroke-width="2.5"/>
  <path d="M85 27 C 77 36 77 48 85 56 C93 48 93 36 85 27 Z" fill="var(--trim)" opacity="0.65"/>
</g>

<g id="regal-king">
  <ellipse cx="85" cy="152" rx="31" ry="9" fill="var(--armor2)" stroke="var(--outline)" stroke-width="3"/>
  <ellipse cx="85" cy="146" rx="27" ry="8" fill="var(--armor)"/>
  <path d="M85 54 C 104 54 116 70 116 92 C116 114 106 124 96 130 L74 130 C64 124 54 114 54 92 C54 70 66 54 85 54 Z" fill="var(--armor)" stroke="var(--outline)" stroke-width="3"/>
  <path d="M85 62 V 124" stroke="var(--trim)" stroke-width="3" opacity="0.6"/>
  <path d="M70 62 C64 78 64 108 72 126" stroke="var(--gold)" stroke-width="2.5" fill="none" opacity="0.85"/>
  <path d="M100 62 C106 78 106 108 98 126" stroke="var(--gold)" stroke-width="2.5" fill="none" opacity="0.85"/>
  <ellipse cx="85" cy="124" rx="24" ry="5" fill="var(--gold)" stroke="var(--outline)" stroke-width="2"/>
  <ellipse cx="85" cy="56" rx="19" ry="6" fill="var(--armor2)" stroke="var(--outline)" stroke-width="2"/>
  <!-- crown -->
  <path d="M72 54 L72 38 L79 46 L85 32 L91 46 L98 38 L98 54 Z" fill="var(--gold)" stroke="var(--outline)" stroke-width="2.5"/>
  <!-- cross -->
  <rect x="82.5" y="2" width="5" height="30" rx="2" fill="var(--gold)" stroke="var(--outline)" stroke-width="2"/>
  <rect x="74" y="11" width="22" height="5" rx="2" fill="var(--gold)" stroke="var(--outline)" stroke-width="2"/>
</g>
`;
