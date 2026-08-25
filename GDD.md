# Regal Chess — Game Design Document (GDD)

**Version:** 1.0 (Pre-Implementation)
**Status:** Awaiting approval
**Owner:** Game Design Studio

> This document is the single source of truth for design. It sits on top of the
> Game Design System (`GAME_DESIGN_SYSTEM/`), the board-game genre spec
> (`genres/board-game.md`), and the project identity template
> (`projects/current-game.md`). Conflict resolution order:
> **project rules > genre rules > core rules.**

---

## 1. Game Identity

| Field | Value |
|---|---|
| **Name** | Regal Chess |
| **Genre** | Board Game (turn-based strategy) — `genres/board-game.md` |
| **Platforms** | Desktop + Mobile web (responsive, touch + pointer + keyboard) |
| **Engine/Tech** | HTML5, CSS, vanilla JavaScript, SVG rendering (board + pieces), Node.js + WebSocket server for online play |
| **One-line pitch** | A polished, jewel-toned game of chess you can play online against friends, against a smart AI, or around the same screen — with crisp vector pieces and a ritual-like sense of ceremony on every move. |
| **Mode of play (core)** | Multiplayer (online PvP), vs AI (3 levels), and local hotseat |
| **Gameboard** | Standard 8x8 chess, classical rules, no variants |

### 1.1 Design System Resolution
- Genre: **board-game.md** applies (tokens, ownership, capture, turn system, feedback).
- Identity overrides: jewel/dark-luxury art direction, gold primary accent.
- Core rules win everywhere the genre spec is silent.

---

## 2. Vision, Goals, and Audience

### 2.1 Vision
Regal Chess is chess that *feels* like the game deserves to feel: every move
reads, every capture lands, every check thrills. It is accessible enough for a
new player to pick up a piece and understand what is happening, and deep enough
that a club player is satisfied. It is fast to start a match and rewarding to
finish one.

### 2.2 Goals
1. **Clarity above all** — the player always knows: whose turn, what is
   highlighted, why a move is invalid, and what happens next.
2. **Polished feel** — animation, particles, audio and feedback on every
   meaningful action (per the four feedback questions).
3. **True multiplayer** — real-time online matches with room codes and turn
   synchronization over WebSockets.
4. **Reusable and maintainable** — a rules engine and presentation layer that
   are cleanly separated and unit-tested.
5. **Bulletproof** — no illegal moves, no state corruption, clean undo/restart,
   graceful disconnects.

### 2.3 Target Audience
- Casual players learning chess (AI Easy / hints).
- Intermediate players who want quick online games (AI Medium/Hard, online).
- Social players sharing a screen (hotseat) or playing friends remotely.
- Mobile and desktop users, including color-blind and reduced-motion users.

### 2.4 Success Criteria (product-level)
- No illegal move can ever be committed by the rules engine.
- Legally generated moves are 100% consistent with FIDE laws.
- A match can be started online within ~5 seconds of entering a room code.
- The game runs at a stable frame rate on a mid-tier phone; the board remains
  readable and touch targets ≥ 44px.
- UI scales and reflows for desktop, tablet, and mobile without clipping.

---

## 3. Art Direction

### 3.1 Overall Visual Style
A **dark-luxury regal** aesthetic: deep slate/navy surfaces, gold and cream
accents, and pieces rendered as elegant hand-tuned vector silhouettes. The board
feels like an inlaid tournament table; the pieces feel like heirloom set pieces.
Motion is restrained and ceremonial — pieces "glide" and land, captures have a
brief flourish.

### 3.2 Palette Reference / Mood
Warm, jewel-toned, high-contrast, premium. See `#define theme` colors below.
Mood: calm, dignified, slightly modern-castle.

### 3.3 Art Style Notes
- **Pieces:** clean 2D vector (SVG), two tonal families (ivory vs ebony) each
  with an inner gradient + thin gold rim-light so they read against any square.
- **Board:** two-tone wood/marble squares with subtle bevel and a soft ambient
  shadow beneath the grid; coordinates (a-h, 1-8) engraved on the frame.
- **Background:** dark, low-contrast vignette so the board is always the hero.
- **Style:** flat with soft depth (gradients + subtle shadows), never heavy 3D.

### 3.4 Reference / Benchmark Games (visual only)
Lichess & chess.com (board ergonomics, piece legibility), Monument Valley (soft
depth), the dark premium settings of AAA lobby screens.

---

## 4. UI Theme

### 4.1 Colors (project identity — overrides core colors.md defaults)
Defined once in a theme config object; never hardcoded per screen.

| Token | Value | Role |
|---|---|---|
| `bgBackground` | `#0E1220` | App/board backdrop (dark navy) |
| `bgSurface` | `#1A2032` | Panels, cards |
| `bgSurfaceElev` | `#232B42` | Elevated cards, modals |
| `fgPrimary` | `#F5F1E8` | Main text (warm ivory) |
| `fgSecondary` | `#A9B2C6` | Secondary text |
| `fgMuted` | `#6C7690` | Disabled/caption |
| `primary` | `#D8B24A` | Gold — primary CTA, selected, highlights |
| `primaryHover` | `#E6C766` | Gold hover |
| `secondary` | `#3E5C8B` | Steel blue — secondary CTA |
| `success` | `#58C185` | Valid moves, gains, victory |
| `error` | `#E0604E` | Invalid actions, danger |
| `warning` | `#E6B24A` | Timer low, caution |
| `info` | `#5A8BD8` | Hints, system messages |
| `boardLight` | `#F0E4CE` | Light square |
| `boardDark` | `#8A5A3B` | Dark square |
| `boardFrame` | `#241D14` | Board frame |
| `squareHighlight` | `rgba(216,178,74,0.32)` | Move hint overlay |
| `squareSelected` | `rgba(216,178,74,0.52)` | Selected piece |
| `squareCheck` | `rgba(224,96,78,0.60)` | King in check |
| `squareLastMove` | `rgba(90,139,216,0.28)` | From/to last move |

**Player/ownership colors** (color-blind safe — paired with shape/icon, not hue
alone): White = ivory tokens (pawn/knight silhouettes), Black = ebony. Always
distinguished by **piece shape + value + rim-light color**, never by square
color alone. A color-blind mode adds distinct piece **badges/icons** (see §16).

### 4.2 Fonts
- **Display:** a serif display face (e.g. Playfair Display) for titles/brand.
- **Body/UI:** a clean sans (e.g. Inter) for panels, buttons, HUD, move list.
- Expose both through the theme object; tabular figures for clocks/move counts.

### 4.3 Panel / Card Style
- Rounded surfaces, **corner radius 12–20**; large modals 20, small controls 6.
- Layered depth: backdrop → surface → elevated modal, with a dim scrim.
- Consistent padding from the spacing scale (8 / 12 / 16 / 24 / 32).
- Panel title (H3), optional close affordance, clear grouping.

### 4.4 Icons / Symbols Style
- Thin-stroke, gold-tinted line icons (pause, settings, sound, crown, home).
- Where a symbol conveys state, it is always paired with a label.

### 4.5 Spacing, Radius, Hierarchy (core foundations)
- Base unit 4, from the allowed scale. One consistent rhythm per screen.
- Visual hierarchy order: gameplay-critical info → primary action → progress
  → navigation → decoration.
- Exactly one primary CTA per screen where the flow demands one.

---

## 5. Gameplay

### 5.1 Core Loop (one paragraph)
A player enters the board (online, vs AI, or hotseat), selects one of their
pieces, sees its legal moves highlighted, then moves it. The engine validates,
applies the move (including castling, en passant, promotion, capture), animates
the piece and the capture, plays feedback, then hands control to the opponent.
Play continues through check/checkmate/ stalemate / draw until a Game Over panel
declares the result and offers Rematch / Return to Menu. At any point the player
can open the pause menu or settings.

### 5.2 Turn System (per genre + core)
- **Turn banner** always visible: whose turn (White/Black), a color-coded HUD,
  and the active player's identity/avatar in online & hotseat.
- Turn transition is explicit: who moved, what changed, whose turn is next, with
  concise feedback.
- **Input lockout:** during the opponent's turn (online), during AI thinking, and
  during animations, board input is disabled with a subtle "waiting" cue.
- **No timing pressure** required for standard mode (optional online clocks are
  a stretch scope; see §19).

### 5.3 Primary Mechanics
1. **Piece selection & legal move preview** — select own piece → valid target
   squares + capture squares highlighted; illegal destinations do not highlight.
2. **Move commitment** — click/tap a highlighted square (or drop) to commit.
3. **Capture** — occupying an enemy piece's square removes it with feedback.
4. **Special moves** — castling (kingside/queenside), en passant, pawn
   promotion (with an interactive piece-choice popup).
5. **Check/checkmate/stalemate** — king in check is visually flagged; game ends
   on checkmate/stalemate/draw with a result panel.
6. **Move history & undo** — moves are recorded (PGN-parseable) and undoable in
   offline modes; a move list panel shows the game so far.
7. **King safety** — the engine never permits a move that leaves own king in
   check (convention to be broken only by the engine's correctness).
8. **AI opponent (offline)** — 3 difficulty levels via alpha-beta search.

### 5.4 Win / Lose / Draw Conditions
- **Checkmate** → the checked player loses; victory panel.
- **Stalemate** → draw.
- **Insufficient material** → draw (K vs K, K+B vs K, K+N vs K, K+B vs K+B same
  color bishops).
- **50-move rule** → draw (no capture, no pawn move in the last 100 half-moves /
  50 moves by each player), with UI counter/warning.
- **Threefold repetition** → draw.
- **Resignation** → explicit surrender from the pause/action menu.
- **Draw by agreement** → both players accept in online mode.

### 5.5 Balancing / Config
All durations (animations, AI "thinking" delay), and AI difficulty parameters
(depth, randomness, search time) live in a config object, not as magic numbers.
Designers can tune without touching engine code.

---

## 6. Game Modes

### 6.1 Online PvP (required, real-time)
- Player A creates a room → gets a short **room code**; Player B joins by code
  (or via share link).
- **Color assignment:** room host's choice or random.
- Move synchronization via WebSocket (Node server) with authoritative turn
  validation on the server to prevent cheating/desync.
- Match flow: Lobby → board → result → rematch/leave.
- Graceful handling of disconnect: "opponent left", reconnect window,
  draw-by-timeout/abandon.

### 6.2 Offline — vs AI
- Player vs computer; choose difficulty (Easy/Medium/Hard).
- The AI plays the opponent color; you can pick your side.
- Endless replay: one-click rematch from the result panel.

### 6.3 Offline — Hotseat (local pass-and-play)
- Both players on one device, alternating turns (tap to pass).
- Optional **hidden-to-next-player** board (screen dims between turns so the
  opponent cannot see the previous player's intentions).
- No undo (competitive integrity) unless both agree; configurable.

---

## 7. Online Multiplayer Architecture

### 7.1 Stack
- **Client:** browser JS over a WebSocket connection to a Node.js server.
  Simple message protocol (JSON), no external heavy framework for the transport.
- **Server:** Node.js `ws`/`socket.io` (recommend `ws` for minimal footprint) —
  room management, turn authority, move validation (reuse the same rules engine
  as the client), broadcast, and cleanup.

### 7.2 Message Protocol (JSON) — key messages
- `host:create_room` → returns `room_code`, `player_id`
- `join_room` (code) → assigns color, both players ready
- `start_game` → initial board/FEN
- `make_move` (from, to, promotion) → server validates & broadcasts `move_applied`
- `move_applied` → full state diff (piece moved, captured, castling, en passant,
  promotion, check state, turn, move number)
- `resign`, `draw_offer`, `draw_accept`, `rematch_request`, `rematch_accept`
- `state_sync` (on reconnect) → full FEN + history + clocks
- `opponent_quit`, `error`

### 7.3 Synchronization & Authority
- The **server is authoritative**: it owns the board, validates every move with
  the shared rules engine, and broadcasts canonical state. Clients render
  optimistically only for local moves that the server then confirms.
- Idempotent by move token; the client ignores stale/newer mismatched moves.
- Reconnect: client sends a resume with room code + session token, server
  replies with full `state_sync` and the client rebuilds the board + history.

### 7.4 Rooms & Cleanup
- Rooms auto-expire after inactivity or when both players leave.
- Single-room-per-match (no persistence of past games required for v1;
  game records are a stretch goal).

---

## 8. AI Opponent (offline)

### 8.1 Model
Minimax with **alpha-beta pruning**, iterative deepening, move ordering, a
piece-square-table evaluation plus material, and small randomization for lower
difficulties to avoid deterministic play.

### 8.2 Difficulty Levels

| Level | Depth | Randomness | Intent |
|---|---|---|---|
| **Easy** | 1–2 | High (favors captures, ignores tactics often) | Forgiving, helps casuals learn |
| **Medium** | 2–3 | Low–moderate | Solid club-ish, makes occasional mistakes |
| **Hard** | 3–5 (or fixed depth with time cap) | Minimal | Strong, punishing blunders |

- "Thinking" indicator with a short delay and subtle animation for readability.
- AI moves are applied through the same validated move pipeline as a human.

---

## 9. Screens & Panels (Flow)

### 9.1 Screen Map
```
Main Menu
  ├─ Play Online (→ Lobby → board)
  ├─ Play vs AI (→ difficulty/side select → board)
  ├─ Hotseat (→ board, with hidden-toggle option)
  └─ Settings (→ panel, from anywhere)
Board
  ├─ Pause Menu (→ resume / resign / new game / settings / quit)
  ├─ Settings Panel (modal)
  └─ Game Over Panel (→ rematch / review / menu)
```

### 9.2 Main Menu
The screen the game opens on. Coordinates on the layout canvas hierarchy:
Background → Header (brand) → Content (menu) → Footer (version/settings).

- **Brand** — game title + small tagline.
- **Primary CTA:** *Play Online* (dominant, gold, glow on hover).
- **Secondary actions:** *Play vs AI*, *Hotseat*.
- **Utility / minor:** *Settings*, *Sound toggle*, *About*.
- **Footer:** version, credits, subtle decorative motif.
- Keyboard/controller navigation: arrow keys + Enter; visible focus states.

### 9.3 Play Online (Lobby)
- **Host tab:** "Create Room" → generates a room code to share.
- **Join tab:** enter room code → Join.
- Status states: *Waiting for opponent…* (animated), *Both ready → Start*.
- On start: color distribution (host picks or random), board appears.

### 9.4 Board (Game Screen)
Layout: board centered; side HUD per player; move list; controls.
- **HUD elements** (per shape in layout.md): player name/avatar, color, captured
  grid, active-turn highlight, captured-material indicator.
- **Move list panel:** numbered moves in algebraic (SAN), scrollable, latest move
  highlighted; tap to review history (optional).
- **Controls:** menu button (pause), sound, hint (AI-only), resign, settings.
- **Board interaction:** tap/click to select + move; drag-and-drop supported.
- **Turn banner / status line:** "White to move", "Black is in check", etc.

### 9.5 Pause Menu
Opens over the board with a dim scrim; board input disabled while open.
- **Resume** (primary), **Settings**, **Resign**, **New Game**, **Return to
  Menu**, **Sound toggle**.
- Back/esc returns to the game. Hotkey to toggle shown on mobile via a button.

### 9.6 Game Over Panel
Slides/scales in when the game ends. Shows:
- **Result headline** (e.g. *"Checkmate — White wins"*, *"Draw by stalemate"*,
  *"You resigned — Black wins"*), with a victory/celebration tone on a win.
- Who won and how (reason: checkmate / stalemate / material / 50-move /
  threefold / resign / agreement).
- **Primary CTA:** *Rematch* (or *Challenge Rematch* in online — sends a request).
- **Secondary:** *Review Board*, *Return to Menu*, *Share game / Copy PGN*.
- On a win (offline or as the winner online), apply the celebration feedback
  level (see §15).

### 9.7 Settings Panel (modal, reachable from menu/pause/game-over)
Organized into sections with tabs where the number of options grows.

**Gameplay**
- Difficulty (vs AI): Easy / Medium / Hard
- Your side: White / Black / Random (vs AI)
- Show legal moves: on / off (for casual vs AI)
- Promote hint (teach the point of castling/en-passant: toggle)

**Board**
- Piece style: set of SVG themes (classic / subtle / bold) — v1 ships at least 1.
- Board theme: a small palette set (dark royal / wooden / minimal).
- Show coordinates: on / off.
- Show last move highlight: on / off.

**Online**
- Player name (display).
- Incoming draw/rematch prompts: notify / auto-decline.
- (Color preference for host defaults.)

**Audio**
- SFX volume slider, Music volume slider, Master volume, mute toggle.
- Music on/off.

**Accessibility**
- Color-blind mode (adds distinct piece icons/outlines).
- Reduced motion (tames screen shake, big celebrations, particles).
- UI size: Small / Normal / Large (adjusts theme scale).
- High contrast text.

**Language**
- Locale selector (English v1; structure ready for localization).

**General**
- Reset settings (to defaults), About/credits, version.

Settings are persisted (localStorage); require explicit *Apply*/*Close* but
changes save immediately and hot-apply where safe.

---

## 10. Board & Interaction

### 10.1 Rendering
SVG. The board is an 8x8 grid; each square and piece is an SVG group.
- Piece color families: ivory and ebony with inner gradient + rim-light.
- Squares: light/dark with soft bevel + frame with engraved coordinates.
- Hover/selection overlays drawn as layered translucent rectangles.

### 10.2 Interaction States (per ui-components.md)
Squares/pieces support: Normal, Hover/Highlighted, Pressed, Selected, Disabled,
Locked. A piece you may not move is visually muted/locked; a highlighted target
indicates available (Level-2 feedback when settled).

### 10.3 Drag-and-Drop & Tap
- **Tap/click:** select → highlight legal moves → tap a target to move; tap
  elsewhere to deselect.
- **Drag:** grab a piece, a ghost follows the pointer, release over a legal
  target commits; invalid drop snaps back with feedback.
- **Tap-to-pass (hotseat):** after a move in hidden mode, a "pass" control
  reveals the board to the next player.

### 10.4 Legal Move Preview
- Rotating soft highlight on legal (non-capture) targets; a filled ring on
  capture targets; a red tint when a move would leave the king in check (never
  shown as legal).
- Check: the king's square pulses in `squareCheck` red.

---

## 11. Feedback & Game Juice

Feedback is the language of the game. Every event answers: what happened, why,
did it succeed, what next. Levels come from `feedback.md`.

| Event | Level | Notes |
|---|---|---|
| Button press | 1 | click + scale |
| Panel open/close | 1–2 | scale/fade |
| Piece select | 1 | subtle pop + tone |
| Legal-move reveal | 2 | highlight + soft particle |
| Move (settle) | 2 | glide + soft landing |
| Capture | 3 | impact + particles + capture sound + floating material line |
| Castling | 2–3 | rook+king animation (celebrated as one move) |
| En passant | 3 | remove the passed pawn + brief flourish |
| Pawn promotion | 3 | reveal + piece-choice popup + glow |
| Check | 3 | `squareCheck` pulse + alert sting |
| Invalid move | 1–2 | shake + error sound + brief emphasis |
| Checkmate | 4 | victory/defeat celebration + camera/screen effect + sting |
| Stalemate / draw | 3 | muted settle + draw cue |
| Online join / room | 2 | a soft chime |
| Opponent left / disconnect | 3 | warning + error tone |
| Achievement/stingers | 3 | (stretch) |

### 11.1 Floating Feedback
- "Capture" material line floats from the captured square (e.g. tiny piece
  glyph + "-1"), rises and fades ~0.9s. Pooled; never overlaps HUD.
- Promotion/check "Check!"/result words as prominent floating text.

### 11.2 Screen Feedback
- Checkmate win: gold vignette flash + gentle camera drift toward the victor
  (respects reduced motion — becomes a simple fade).
- Check: brief screen pulse (fast band). Errors: small horizontal shake only.

---

## 12. Audio Identity

### 12.1 Music Direction
Calm, dignified, ornamental **ambient** — a single evolving pad with subtle harp/
bowed-string color. Low-key so it stays out of the way during thinking. A soft
"library/study" mood. One looping track (v1) with room for a loose intro.

### 12.2 Signature Sounds
- **Move:** a refined, short wooden *click/thud* (pitch varies slightly per
  insta nce; slightly deeper for captures, a small flourish for castling).
- **Select/hover:** a light tick.
- **Capture:** a crisp crack + short tail.
- **Check:** a quick two-note alert.
- **Invalid:** a muted error tone.
- **Victory:** a warm three-note ascend (celebration cue).
- **UI:** button click, panel open/close, draw-request chime.
- **Promotion:** a bright reveal arpeggio.

### 12.3 Mix & Structure
- Separate mixer groups: SFX / Music / Master (persistent, user sliders).
- Pitch variation on repeated sounds to avoid fatigue.
- Audio collection referenced by a single audio system; never hardcoded paths.
- Audio is never the only signal — every sound has a visual equivalent.

---

## 13. Motion Design

- **Timing bands** from `motion.md`: state feedback fast (0.10–0.18), UI
  transitions normal (0.20–0.30), celebration slow (0.6–1.2).
- **Easing:** entrances/overshoot (EaseOutBack), generic movement (EaseOutCubic),
  exits (EaseInBack). No linear for polished UI.
- **Piece move:** glide with EaseOutQuad over ~0.25–0.35s (scaled to distance;
  instant when reduced-motion). Capture settles with a tiny squash-land.
- **Hover/select highlights** animate in (fast), not instant.
- **Panel/modal open:** scale 0.82 → 1 + fade, 0.25–0.35s EaseOutBack; close
  is a fast fade/scale-down.
- **Screen transitions:** fade 0.20–0.30s; slide 0.25–0.35s between major views.
- **Counter/clock changes:** animate toward value (fast band); clocks use
  tabular figures; timer-low warning.
- Motion timings centralized as tween presets, not per-screen magic numbers.
- **Reduced motion:** tamed to fades/minimal movement; key state changes stay
  visible without motion.

---

## 14. HUD & In-Game UI

- **Top bar** (within safe area): back/menu, room info (online), move counter,
  mute.
- **Side/bottom HUD:** two player cards (name/avatar, color, captured pieces,
  active-turn ring), plus the move list panel.
- HUD uses the icon + value pattern; updates animate. HUD must never cover the
  board or captured pieces illegibly; it stays readable over changing art with a
  subtle scrim.
- One primary CTA contextually (e.g., the *menu* button is utility; *rematch* is
  primary on the game-over panel).

---

## 15. Particles

- Particles are for events that matter, tied to feedback level ≥ 2.
- Small, tuned prefabs (not many one-offs):
  - **Select/hover:** a few gold specks.
  - **Capture:** a short burst + a heavier impact burst.
  - **Promotion:** a glimmering rise.
  - **Victory:** a generous, readable gold confetti shower that respects
    reduced-motion (becomes a simple fade/glow).
  - **Ambient:** extremely subtle drifting motes in the background (can be
    disabled).
- Particles never obscure the board, captured grid, or HUD counters. Pooled to
  avoid allocations; capped concurrent budgets; counts drop on reduced-motion or
  low-tier devices.

---

## 16. Accessibility

Faithful to `accessibility.md`:

- **Contrast/readability:** text meets contrast on every surface; scrim/outline
  where ambiguous.
- **Color-blind safety:** ownership conveyed by piece shape, value, and rim-light
  color — never hue alone. A color-blind mode adds distinct glyphs/outlines.
- **Size:** UI scale setting (Small/Normal/Large); min touch target 44px, larger
  for primary actions; text enlarges without breaking layout.
- **Reduced motion:** tames camera shake, big celebrations, heavy particles →
  fades/minimal motion; state changes stay visible.
- **Audio:** mute + SFX/Music sliders; every sound has a visual equivalent.
- **Input:** touch + pointer + keyboard navigation (arrow/enter/esc) through
  menus and board; no narrow single-input requirement.

---

## 17. Persistence

- **Settings** → localStorage (theme, audio, accessibility, difficulty, name).
- **Match state (offline)** → not persisted across reload in v1 (fast restart);
  a "continue last game" is a stretch goal.
- **Move history** → kept in-session, exportable to PGN (copy/share).
- **Online** → session tokens + reconnect keyed to room; past-game records are a
  stretch goal.

---

## 18. Performance Targets

- **Targets:** desktop and mid-tier phone; hold ~60fps in menus and board.
- **Board is SVG** — rendered once; piece moves animate via transform; no
  per-frame redraw of the whole board except when needed.
- **Rules engine** runs off the hot path (recompute legality only on selection
  and after each move; not per frame). Use dirty flags / event-driven state.
- **No allocations in the per-frame animation path** where avoidable; reuse
  cached element references; no per-frame object searches.
- **Particles pooled**, budgets capped; reduced-motion/low-tier lowers counts.
- **Pools** for floating text and particles.
- Profile on the lowest target device before calling done.

---

## 19. Scope & Stretch Goals

### 19.1 In Scope (v1)
- Full standard chess rules engine (legal moves, check/checkmate/stalemate,
  castling, en passant, promotion, draw conditions) — unit-tested.
- SVG board + pieces, responsive (desktop/mobile), touch + pointer + keyboard.
- Modes: Online PvP (WebSocket), vs AI (3 difficulties), Hotseat.
- Screens: Main Menu, Online Lobby, Board, Pause Menu, Settings, Game Over.
- Move history, undo (offline), PGN export/copy.
- Theme, audio (SFX+music), particles, animations per design system.
- Accessibility: reduced-motion, color-blind mode, UI scale, contrast, keyboard.

### 19.2 Stretch / Later
- Time controls (blitz/bullet/rapid clocks) + online option.
- Board replay / request-negotiated undo online.
- Game record persistence & history profile.
- Piece/board theme packs (multiple SVG sets).
- Achievements, rating points, elo-ish progression.
- Draw-offer with auto-accept by material/endgame.

---

## 20. Asset List

| Asset | Type | Notes |
|---|---|---|
| Board frame + squares | SVG | theme-driven; coordinates |
| 6 piece types × 2 colors | SVG | ivory/ebony, rim-light; themeable |
| Piece themes (v1: 1 classical) | SVG | extensible set |
| Background vignette | SVG/CSS | dark royal |
| Icons (menu, pause, settings, sound, home, crown, hint) | SVG | thin-stroke gold |
| Logo/wordmark | SVG | brand |
| Ambient music track | audio | 1 loop |
| SFX: move, capture, select, check, invalid, promotion, victory, UI, draw, join, quit | audio | collection asset |
| Particle prefabs | config | select, capture, promotion, victory, ambient |

---

## 21. Script/Module Architecture

Separate presentation from gameplay logic (per `gameplay.md`).

| Module | Responsibility | Testable |
|---|---|---|
| **Rules Engine** (`engine/`) | Board state, legal move generation, apply move, check/checkmate, castling/en-passant/promotion, draw detection, FEN/PGN | Yes (unit) |
| **AI** (`ai/`) | Alpha-beta search, difficulty config | Yes |
| **Net** (`net/`) | WebSocket client protocol, room join, move send/receive, reconnect | Yes (mock) |
| **Server** (`server/`) | Node WS, room mgmt, authoritative validation, broadcast | Yes |
| **State/Store** | GameState, move history, undo, turn, clocks | Yes |
| **Presentation** (`view/`) | SVG board render, pieces, highlights, animations (listens to events) | No (manual/visual) |
| **UI System** (`ui/`) | Buttons, panels, modals, HUD, settings — per design system components | No (manual/visual) |
| **Feedback/Effects** | Particles, audio player, floating text, screen effects (listens to events) | No (manual/visual) |
| **Audio** | Collection-based SFX/music mixer, sliders | No |
| **Theme** | Color/font/spacing tokens, piece themes | Yes |
| **Input** | Pointer/touch/keyboard intent map | Yes (mock) |

**Event flow:** gameplay raises typed events (move applied, capture, check,
game over, draw offered); presentation + feedback + audio subscribe and respond.
No direct coupling between the rules engine and UI.

---

## 22. Game State Machine

```
MAIN_MENU → LOBBY → PLAYING ⇄ PAUSED
                 └────────→ GAME_OVER → (rematch→PLAYING | menu→MAIN_MENU)
```
- **PLAYING:** input enabled for the current actor; animations run.
- **PAUSED:** board updates suspended; pause UI active. Never re-runs sim.
- **GAME_OVER:** board visible but input disabled; result panel up.
- **Restart/rematch:** resets state cleanly with no leftover effects.
- Frontends: Main Menu, Online Lobby, Board, Pause, Settings, Game Over.

---

## 23. Config / Tuning Surfaces (ScriptableObject-equivalent)

A JSON theme/config object exposing:
- colors, fonts, spacing
- animation durations & easing presets
- particle definitions & budgets
- audio collection
- AI difficulty params (depth, randomness, time cap)
- interaction toggles (show-legal-moves, coordinates, last-move highlight)

Designers retune without touching engine code.

---

## 24. QA & Verification Plan

Follow `qa-checklist.md` after each feature. Key chess-specific checks:
- Move generation matches FIDE for edge cases (pinned pieces, castling-through-
  check, en passant, promotion, stalemate detection, insufficient material).
- No illegal move possible; undo/restart is clean.
- Online: turn lockout, reconnect resync, disconnect handling, no desync.
- Responsiveness across desktop/tablet/mobile; safe areas; text no clipping in
  localized sizes.
- Reduced-motion & color-blind modes verified.
- Audio sliders, mute, no overlapping sound; particles never cover HUD.
- Performance: profile on lowest target; no GC spikes.

---

## 25. Milestones (Implementation Phases)

1. **Foundation — Rules engine + unit tests** (move gen, check, special moves,
   draw conditions, FEN/PGN), board SVG render + interaction, basic move/highlight
   feedback.
2. **Game shell** — state machine, Main Menu, Pause, Settings, Game Over, HUD,
   move list, undo, PGN export, theme + audio + particles + animations.
3. **Offline AI** — difficulty levels.
4. **Online PvP** — Node WebSocket server, lobby/room codes, authoritative sync,
   disconnect/reconnect, rematch.
5. **Polish & QA** — accessibility (reduced motion, color-blind, UI scale),
   performance pass, full QA checklist, cross-device testing.

---

## 26. Risks & Open Questions

- **SVG animation performance** on many moving pieces — mitigated by transform-
  based animation, no full-board redraw, and event-driven updates.
- **Server authoritative turn validation** complexity — mitigated by reusing the
  shared tested rules engine on both client and server.
- **Online desync** — solved by server-canonical state + `state_sync` on join/
  reconnect + move tokens.
- **Reduced-motion vs celebration richness** — celebration degrades to fades; the
  result panel still communicates the win clearly.
- **Promotion default** — default to Queen on double-tap with a popup for choice;
  confirmed in Settings/behavior.
- **Piece theme scope** — v1 ships one classical set; more are config-driven.

---

*End of GDD v1.0.*
