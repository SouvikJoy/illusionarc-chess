# Regal Chess — Technical Architecture (architecture.md)

**Version:** 1.0
**References:** `GDD.md` §21 (module architecture), `rules.md` (engine contract),
`Requirements.md` (FR/NFR), `memory.md` §6 (folder plan).

> Architecture goals, in priority order:
> 1. **Correctness** — a pure, testable rules engine reused on both client and
>    server so no illegal move ever commits.
> 2. **Separation of concerns** — gameplay logic has zero knowledge of UI,
>    audio, or particles; it raises typed events that presentation consumes.
> 3. **Reusability + extensibility** — one theme/config source of truth; small,
>    focused, independently testable modules.
> 4. **Performance** — event-driven updates (no full board redraw per frame),
>    pooled effects, no per-frame allocations.
> 5. **Online integrity** — server-authoritative state for multiplayer.

---

## 1. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Client language | Vanilla ES Modules (browser) | Dependency-light, per design system; runnable with no build step for dev |
| Rendering | HTML/CSS grid board + **SVG** pieces | Crisp, themeable, scalable; uses the SVG skills |
| Game logic | Pure JS modules (`engine/`) | Reusable on client & server, unit-testable, no DOM deps |
| Server | Node.js + `ws` (WebSocket) | Minimal, robust realtime; authoritative turn validation |
| State/persistence | localStorage (settings) | No backend DB required for v1 |
| Tests | Node's built-in `node:test` (or vitest) | Zero-extra-dependency engine tests; deterministic |
| Tooling | Optional npm scripts for lint/test; no mandatory bundler | Keep dev simple; a bundler can be added later if needed |

---

## 2. High-Level System Diagram

```
┌───────────────────────────── Browser (Client) ─────────────────────────────┐
│                                                                            │
│  UI Layer (reactivity)                                                     │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌─────────────────┐    │
│  │ Screens │ │ Buttons/ │ │ Panels/ │ │   HUD    │ │ Modals (Settings,│    │
│  │ + Flow  │ │ Controls │ │  Cards  │ │ Elements │ │  Pause, GameOver│    │
│  └────┬────┘ └────┬─────┘ └─────────┘ └──────────┘ └─────────────────┘    │
│       │          │  (design-system components, states, CTA)               │
│       └──────────┴──────────────┬──────────────────────────────────────┘  │
│                                 ▼                                         │
│  App State Machine  (menu ⇄ playing ⇄ paused → game_over)                  │
│                                 │                                          │
│        ┌────────────────────────┼──────────────────────────────┐          │
│        ▼                        ▼                              ▼          │
│  Store (GameState,      Input Layer            AI  (offline)               │
│  history, undo)      (pointer/touch/keyboard)  minimax+alpha-beta          │
│        │                        │                              │          │
│        └────────────┬───────────┴───────────┬─────────────────┘          │
│                     ▼                       ▼                             │
│           Rules Engine (shared)         Net Client (online) ◄────►        │
│           engine/* (pure, verified)     net/  WebSocket                  │
│                     │                       │                             │
│                     └──────────┬────────────┘                             │
│                                ▼                                          │
│  EventBus  (typed events: moveApplied / capture / check / gameOver / ...) │
│        │                                                                    │
│        ├──────────┬─────────────┬──────────────┬──────────────┐            │
│        ▼          ▼             ▼              ▼              ▼            │
│  view/ (SVG      feedback/   audio/        feedback/         theme/       │
│  board+pieces,  particles,   (collection   floating text,   (tokens,      │
│  highlights,    screen fx    mixer)        screen effects)  config)       │
│  animations)                                                                 │
└──────────────────────────────────────────────────────────────┬─────────────┘
                                                               │ WebSocket (JSON)
                                                                       │
┌────────────────────────────── Server ───────────────────────────────┐
│  server/  Rooms, Clients, Turn authority                             │
│  ┌────────────┐ ┌───────────────┐ ┌───────────────────────────────┐  │
│  │ RoomManager│ │ MessageRouter │ │ Rules Engine (shared engine/*) │  │
│  │ (rooms,    │ │ (messages in, │ │ validates every move, owns    │  │
│  │  players,  │ │  broadcast)   │ │  canonical board state)       │  │
│  │  rematch)  │ └───────────────┘ └───────────────────────────────┘  │
│  └────────────┘                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Module Map & Responsibilities

### 3.1 Shared (usable by client AND server)
| Module | Responsibility | Deps | Testable |
|---|---|---|---|
| `engine/types.js` | Types/constants: piece, color, square coords, SAN notation | — | UT |
| `engine/board.js` | Board setup, FEN import/export, piece placement | types | UT |
| `engine/moves.js` | Pseudo-legal + legal move generation per piece; move validation | board, types | UT |
| `engine/castle.js` | Castling availability + legality (through-check rules) | moves | UT |
| `engine/engine.js` | GameState model, apply move, undo, check/checkmate/stalemate, draw detection, event emission | all above | UT |
| `engine/pgn.js` | Move list → PGN/SAN; SAN parsing for replay | engine | UT |
| `engine/result.js` | Resolve game result (checkmate/stalemate/material/50-move/threefold/resign/agreement) | engine | UT |
| `shared/eventbus.js` | Typed event bus (pub/sub) | — | UT |
| `shared/protocol.js` | Message schemas (client↔server), validators, room-code gen | — | UT |

### 3.2 Client — Game logic
| Module | Responsibility | Deps |
|---|---|---|
| `store/state.js` | App GameState wrapper, selection, turn, history, undo interface | engine |
| `store/controller.js` | Orchestrates gameplay commands (select, move, undo, resign, draw, new game) — the only thing that writes state | engine, store |
| `ai/engine.js` | Alpha-beta search, move ordering, evaluation (material + PST) | engine |
| `ai/difficulty.js` | Difficulty config (depth/randomness/time cap per level) | theme/config |
| `net/client.js` | WebSocket client: connect, join/host, send move, receive state_sync, reconnect | shared/protocol |

### 3.3 Client — Presentation & UX
| Module | Responsibility |
|---|---|
| `view/render.js` | SVG board render: squares, coordinates, frame, piece placement from state |
| `view/piece.js` | SVG piece rendering (piece theme, icons, gradients, rim-light) |
| `view/highlight.js` | Layer overlays: legal moves, capture, selected, last-move, check, hover |
| `view/animation.js` | Piece move/capture/castle animations (transform-based, timing presets) |
| `ui/screens.js` | Screen flow: Main Menu, Online Lobby, Board, Pause, Settings, Game Over + transitions |
| `ui/components.js` | Design-system components: buttons (states), panels, cards, tabs, counters, progress, popups, notifications, navigation |
| `ui/hud.js` | Player cards, captured pieces, move list, turn banner, icons+values |
| `feedback/feedback.js` | Map events → feedback levels; trigger particles/audio/floating text/screen fx |
| `feedback/particles.js` | Particle pools + budgets + emitters (select/capture/promotion/victory/ambient) |
| `feedback/floating.js` | Floating text pool (captured material, "Check!", result) |
| `feedback/screenfx.js` | Vignette/color flash, camera drift, screen shake (respects reduced-motion) |
| `audio/mixer.js` | SFX/Music/Master groups, sliders, mute, ducking |
| `audio/bank.js` | Audio collection; central sound references |
| `theme/theme.js` | Tokens: colors, fonts, spacing, radii, durations, easing, particle defs, AI params |
| `input/input.js` | Pointer/touch/keyboard intent → actions; focus/kb navigation |

### 3.4 Server
| Module | Responsibility |
|---|---|
| `server/index.js` | WS server bootstrap, connection lifecycle, error bounds |
| `server/room.js` | Room model: players, color assignment, status, rematch, expiration |
| `server/router.js` | Map messages → handlers, validate protocol, respond/broadcast |
| `server/game.js` | Authoritative turn enforcement: validate with shared engine, apply, broadcast diffs |

---

## 4. Directory Structure (to be created at build)

```
chess/
  index.html
  manifest.webmanifest            (optional PWA metadata)
  css/
    theme.css                     (token-driven: colors/type/spacing)
    components.css                (buttons, panels, cards, modals, HUD)
    screens.css                   (menu, lobby, board, settings, game-over)
    layout.css                    (responsive grid, safe-areas)
    animations.css                (keyframes, reduced-motion overrides)
  js/
    app.js                        (bootstrap, state machine wiring)
    engine/                       (SHARED + client)
    ai/
    store/
    net/
    view/
    ui/
    feedback/
    audio/
    theme/
    input/
  server/
    index.js
    room.js
    router.js
    game.js
  shared/                          (dynamically symlinked/imported by client & server)
    protocol.js
    eventbus.js
  assets/
    svg/                          (board, pieces, icons, logo)
    audio/                        (music + sfx)
  test/
    engine/                       (move-gen, castling, en-passant, promotion, check, draw)
    server/                       (room, protocol, turn validation)
  config/
    theme.json                    (colors/fonts/spacing/durations)
    ai.json                       (difficulty params)
    particles.json                (particle defs/budgets)
    audio.json                    (sound map)
```

> Note: the client imports `engine/`, `shared/` as plain ES modules. The server
> imports the *same* `engine/` and `shared/` files. Keep these directories free
> of browser-only APIs (no `document`, `window`, `localStorage`, no DOM), so one
> rules implementation serves both runtimes.

### 4.1 Import strategy (shared code)
Keep `engine/*` and `shared/*` runtime-agnostic (ESM). Both `index.html` and the
Node server load them directly. Avoid a bundler in v1; add one only if module
graph/asset preprocessing becomes necessary.

---

## 5. Data Models

### 5.1 GameState (engine)
```js
{
  board: [ 64 | 8x8 ] of { type:'P'|'N'|'B'|'R'|'Q'|'K', color:'w'|'b' } | null,
  turn: 'w'|'b',
  castlingRights: { K, Q, k, q },          // booleans
  enPassant: squareName|null,              // en passant target square
  halfMoveClock: Number,                   // ply since last capture/pawn move
  fullMove: Number,                        // increments after black's move
  history: [ Move ],                       // for undo + PGN
}
```

### 5.2 Move
```js
{ from:'e2', to:'e4', promotion?:'Q'|'R'|'B'|'N' }
```

### 5.3 AppState (client store)
```js
{
  phase: 'menu'|'lobby'|'playing'|'paused'|'game_over',
  mode: 'online'|'ai'|'hotseat',
  selected: squareName|null,
  legalTargets: [ Square ],                  // for selected piece
  lastMove: { from, to } | null,
  captured: { w:[], b:[] },                  // material balance
  players: { w:{name,avatar}, b:{name,avatar} },
  clock: ...                               // (beyond v1)
}
```

### 5.4 Room (server)
```js
{
  id, code,
  clients: { playerId → { socket, name, color, connected } },
  status: 'waiting'|'ready'|'playing'|'finished'|'closed',
  game: GameState,
  rematchVotes: { [playerId]: bool },
  createdAt, lastActive
}
```

---

## 6. Rules Engine Design (`engine/`)

### 6.1 Principles
- **Pure functions** over an immutable-ish `GameState`. Apply-move returns a new
  state (or mutates a passed copy predictably); no side effects.
- **No DOM/UI/audio** anywhere. It raises typed events via an injected event sink
  (or returns event descriptors) so the presentation can react without coupling.
- **Single source of truth** — reused by client (offline/hotseat/AI) and server
  (online authority). This guarantees the AI and online moves obey the exact same
  validation.

### 6.2 Core API
```
createGame()            -> {state, events}
legalMoves(state, from)-> [{from,to,promotion?}]
isLegalMove(state, move)-> bool
makeMove(state, move)   -> newState + events (capture/castle/en-passant/promo/check/mate/...)
isInCheck(state, color) -> bool
isCheckmate(state)      -> bool
isStalemate(state)      -> bool
insufficientMaterial(state)-> bool
isFiftyMove(state)      -> bool
isThreefold(state)      -> bool
undoMove(state)         -> priorState
toFEN(state)/fromFEN(fen)-> string / state
toSAN(move, state)      -> 'Nf3' | 'exd5' | 'O-O' | 'e8=Q' | ...
```

### 6.3 Move-generation pipeline
1. Generate pseudo-legal moves for the selected piece.
2. Special-case castling, en passant, promotion.
3. Filter: simulate each move, keep those that leave the mover's king out of
   check (this naturally handles pins + discovered check + move-into-check).
4. Return legal moves for highlighting; `makeMove` re-validates (never trust a
   caller — even the AI must pass through `isLegalMove`).

### 6.4 Event contract
The engine returns/emits descriptors the presentation maps to feedback levels
(GDD §11). Example event shapes:
```
moveApplied({move, captured?, castled?, enPassant?, promotion?})
check({color, square})
checkmate({winner})
stalemate({})
draw({reason:'material'|'fifty'|'threefold'|'agreement'})
gameOver({result, winner?, reason})
```

---

## 7. AI Design (`ai/`)

- **Algorithm:** minimax with alpha-beta, iterative deepening, move ordering
  (captures first via MVV-LVA), and evaluation = material + piece-square tables.
- **Difficulty config** (`config/ai.json`):
  ```json
  { "easy": { "depth": 1, "randomness": 0.8 },
    "medium": { "depth": 3, "randomness": 0.2 },
    "hard": { "depth": 4, "timeCap_ms": 1200, "randomness": 0.0 } }
  ```
  Hard uses iterative deepening with a time cap so it stays responsive.
- **Randomness** = probability of picking a sub-optimal move (for Easy/Medium),
  weighing toward captures/blunders at low depth.
- The AI **feeds moves through `isLegalMove`** so it can never make an illegal
  move even on a bug.
- **Thinking gate:** controller sets a "thinking" state, the UI shows the
  indicator, then applies the resolved move (with a small delay for readability).

---

## 8. Networking (`net/client.js` ↔ `server/`)

### 8.1 Message protocol (JSON, via `shared/protocol.js`)
Each message: `{ type, seq?, data }`. Types:

| Direction | Type | Payload / Notes |
|---|---|---|
| C→S | `create_room` | → returns `{ roomCode, playerId, color? }` |
| C→S | `join_room` | `{ code, name }` → color assigned |
| C→S | `choose_color` | host option: white/black/random |
| C→S | `start` | begin match → broadcast initial FEN |
| C→S | `move` | `{ from, to, promotion? }` → server validates |
| S→C | `state` | authoritative diff/FEN after each accepted move |
| C→S | `resign` | surrender |
| C→S | `draw_offer` / `draw_accept` | negotiation |
| C→S | `rematch_offer` / `rematch_accept` | from Game Over |
| S→C | `opponent_quit` | disconnect/leave |
| C→S | `resume` | `{ roomCode, sessionId }` → `state_sync` |
| S→C | `state_sync` | full FEN + history + status (on reconnect/join) |
| S→C | `error` | `{ code, message }` (illegal move, room full, etc.) |

### 8.2 Turn authority & desync protection
- Server owns `GameState`; on each `move`, it validates via `isLegalMove` and
  applies via `makeMove`. It keeps a per-room `moveSeq`.
- Server broadcasts an **idempotent canonical `state`** (including `seq`).
- Client renders locally only for the current actor's own move, then reconciles
  on the server's canonical message. Mismatched/duplicate `seq` is ignored.
- On reconnect, `resume` → `state_sync` rebuilds board + history exactly.

### 8.3 Room lifecycle & cleanup
- Rooms expire on inactivity (`lastActive` timeout) or when both clients leave.
- Disconnect → mark `connected:false`, broadcast `opponent_quit` with a grace
  window for reconnect; on expiry, resolve the game (abandon/resign).

---

## 9. App State Machine

```
        ┌────────────────────────────────────────────────────────┐
        ▼                                                          │
  ┌──────┐   Play Online   ┌───────┐   both ready   ┌─────────────┐
  │ menu │ ──────────────▶ │ lobby │ ─────────────▶ │  playing    │
  └──────┘ ◀──────────────└───────┘ ◀────────────── │  (board)    │
      ▲                          ▲                    └─────┬───────┘
      │                    Return                             │ Resume
      │                                                       ▼
      │  Game Over ──── Rematch/Review ──────────────────── ▶  ┌───────┐
      └─────────────┐   Return to menu                        │pause  │
                    └─────────────▶ menu                     └───────┘
   (hotseat/ai start directly: menu → playing)                     ▲
                                                                  └─ Esc/back
```

- Phases: `menu`, `lobby`, `playing`, `paused`, `game_over`.
- **Restart/rematch** calls `controller.newGame()` which resets `GameState` and
  clears selection/historical leftovers with no residual effects.
- Pause freezes simulation (AI thinking/online wait) but keeps the pause UI live;
  it does not run the game loop in the background.

---

## 10. UI System (design-system components)

- **Canvas hierarchy** per `layout.md`: Background → Header → Content → HUD →
  PopupLayer → NotificationLayer → TransitionLayer. Modals spawn into
  `PopupLayer`, never arbitrary parents.
- **Components** (`ui/components.js`) implement the canonical forms from
  `ui-components.md`: buttons (all 6 states + feedback), panels, cards, tabs,
  counters, progress bars, popups (scale 0.82→1 + fade, EaseOutBack), HUD (icon+
  value), notifications (slide/fade, auto-dismiss, non-blocking), navigation
  (back, breadcrumbs, transitions).
- **Exactly one primary CTA** per screen; primary = gold filled, secondary =
  outlined/subservient.
- **Focus/keyboard:** arrow/enter/esc navigation; visible focus ring; the board
  is interactable via keyboard too.
- **Reduced-motion:** a global toggle swaps animation presets to fades; camera
  shake/celebration particles are tamed.

---

## 11. Rendering (SVG board + pieces)

- Board is an HTML/CSS grid with an SVG frame + coordinates; pieces are inline
  SVG `<g>` groups placed at cells.
- **One-time full render** on load; movement updates transform positions (not
  full-board redraws). Selection/highlights are stacked overlay groups.
- Piece themes load from asset config (`assets/svg/`) — v1 classical set; more are
  data-driven.
- **Responsive:** the board scales to the smaller viewport dimension, constrained
  within safe areas; HUD anchors to screen edges.

---

## 12. Feedback / Effects Pipeline

- `feedback/feedback.js` subscribes to the EventBus, maps each event to a
  **feedback level** (GDD §11), and coordinates the effect systems.
- **Particles** are pooled + budget-capped (config `particles.json`); emitters are
  reused, counts drop under reduced-motion/low-tier.
- **Floating text** pooled; rises ~0.9s and never overlaps HUD.
- **Screen fx** (vignette/color flash, camera drift, shake) gated by
  reduced-motion → degrade to fades.
- **Audio** via `audio/mixer.js` (separate SFX/Music/Master groups) and
  `audio/bank.js` (collection). Pitch-vary repeated sounds; duck music on
  important events.

---

## 13. Theme & Config

- `config/theme.json` — colors, fonts, spacing, radii, durations/easing,
  particle defs, AI params.
- `theme/theme.js` loads tokens and exposes them as CSS variables + a JS object;
  components read only from tokens (no magic numbers).
- A **player can retune** (difficulty, theme) via Settings without code changes.

---

## 14. Persistence

- **Settings** → `localStorage` (audio, theme, difficulty, accessibility, name).
- **Match state** — not persisted across reload in v1 (fast restart). "Continue
  last game" is a stretch goal by serializing `GameState` (FEN + history).
- **PGN export/copy** from move list + Game Over (uses `engine/pgn.js`).

---

## 15. Error Handling & Edge Cases

- **Illegal move:** engine rejects; UI plays error feedback (shake + tone) and
  never mutates state.
- **Rapid re-entry / double-tap:** input debounced during transitions; move
  buffers guarded by state phase.
- **Disconnect:** grace window + reconnect via `resume`; else resolve game.
- **Room edge cases:** code collision regenerates; room full/missing → `error`
  with a clear message; no dead-ends.
- **Zero/empty states:** no history yet → greyed undo; no captured pieces → empty
  grid.
- **AI/online waiting:** input locked, clear "waiting/thinking" cue, no input loss.
- **Promotion:** default Queen on quick double-tap; explicit popup for a choice.

---

## 16. Testing Strategy

| Layer | Tool | Coverage |
|---|---|---|
| Engine | `test/engine/*` (node:test) | Legal move gen, pins, castling-through-check, en-passant, promotion, check/mate/stalemate, insufficient material, 50-move, threefold, FEN/PGN round-trip, undo |
| Server | `test/server/*` | Room lifecycle, protocol validation, turn authority, reconnect/sync, rematch/draw |
| Net client | mock socket | Join/host, move send, state_sync reconciliation |
| UI | manual + devtools | Components states, screens flow, accessibility (reduced-motion, color-blind, UI scale, keyboard) |
| E2E (manual) | chrome-devtools MCP | Full match online across two tabs/devices |

**Correctness gate:** the engine test suite (FIDE edge cases) must be green
before any feature relying on it is marked done.

---

## 17. Build & Dev Workflow

- **Dev:** serve the project root over a static server (e.g. `npx serve .`) so
  ES modules load; run the WS server separately (`node server/index.js`).
- **Run engine tests:** `npm test` (maps to `node --test test/engine`).
- **Lint/format:** optional ESLint/Prettier if added; not required for v1.
- **No bundler required** for v1; if assets/shared-code shipping becomes awkward,
  introduce a minimal bundler (esbuild) later.

---

## 18. Cross-Cutting Conformance Map

| Concern | Where it lives | Key doc |
|---|---|---|
| Separation of concerns | engine is pure; events drive presentation | gameplay.md, GDD §21 |
| No magic numbers | theme/config tokens | performance.md, colors.md |
| No per-frame allocs | event-driven updates, pools | performance.md |
| Accessibility | theme reduced-motion/color-blind/UI scale; input keyboard | accessibility.md |
| Feedback levels | feedback/feedback.js mapping | feedback.md |
| Audio groups | audio/mixer.js | audio.md |
| Particle budgets | feedback/particles.js + config | particles.md |
| Online authority | server/game.js + shared engine | Require ments FR-17..23, 65..69 |

---

*End of architecture.md v1.0.*
