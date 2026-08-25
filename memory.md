# Regal Chess — Project Memory & Decision Log (memory.md)

**Version:** 1.0
**Status:** Awaiting approval

> This is a living context file for the agent + collaborators. It records the
> project's identity, decisions, conventions, and pointers so anyone (or any
> agent) starting work on this project can pick up context instantly. Update it
> as decisions change.

---

## 1. Project Snapshot

| Field | Value |
|---|---|
| **Name** | Regal Chess |
| **Working dir** | `/Users/illusionbd/Documents/Workspace/Html/chess` |
| **Git** | Not a repo yet (init before first commit) |
| **Type** | Web game (HTML/CSS/vanilla JS/SVG) + Node.js WebSocket server |
| **Status** | Implemented & tested — v1.0 (28 tests passing; hotseat/AI/online verified) |
| **Primary mode** | Multiplayer (online) — requirement enforced |

## 2. Source Documents (the design contract)

| Doc | Contents | Authority |
|---|---|---|
| `GDD.md` | Full game design, art direction, screens, modes, feedback, audio, motion, particles, architecture, milestones | Design source of truth |
| `PRD.md` | Product goals, personas, user stories, priorities, acceptance criteria | Product contract |
| `Requirements.md` | FR-/NFR- requirement IDs with priorities & testability | Technical requirement set |
| `rules.md` | Exact FIDE chess rules the engine must implement | Engine contract |
| `memory.md` | This file — project memory | Working context |

## 3. Design System References

Rules live in `/Users/illusionbd/GameDesignSystem/GAME_DESIGN_SYSTEM/`.
Conflict resolution: **project > genre > core**.

- **Genre:** `genres/board-game.md` (board, tokens, ownership, turn system,
  captures, multiplayer status UI).
- **Core specs consulted:** foundations, colors, typography, layout,
  ui-components, feedback, audio, motion, particles, gameplay, performance,
  accessibility, qa-checklist.
- **Identity template:** `projects/current-game.md`.

## 4. Locked Design Decisions

| Decision | Choice | Why |
|---|---|---|
| **Game name** | Regal Chess | Regal/board identity matches dark-luxury art direction |
| **Genre scope** | Standard 8x8 chess, no variants, no clocks in v1 | Focus; clocks = stretch |
| **Play modes** | Online PvP (required), vs AI (3 difficulty), Hotseat | Full polished set; brief requires multiplayer |
| **Online backend** | Node.js + WebSocket server (custom `ws`) | Real online control + authoritative validation |
| **Rendering** | SVG board + pieces (HTML/CSS grid board, SVG pieces) | Crisp vector, themeable, uses the SVG skills |
| **AI** | Full engine: negamax + alpha-beta + quiescence + transposition table + opening book; 3 levels (Easy/Medium/Hard) + internal Master | Reuse validated move pipeline |
| **Targets** | Mobile-first responsive (portrait + landscape phone, tablet, desktop); touch + pointer + keyboard | Broad; safe-areas; ≥44px targets; dvh units |
| **Server authority** | Server owns board, validates, broadcasts canonical state | Prevent desync/cheat |
| **Result messaging** | Engine emits typed events; presentation + feedback + audio subscribe | Separation of concerns (gameplay.md) |
| **Draw auto-award** | Auto in offline; offer in online | Per GDD §5.4 / §7.3 |
| **Promotion default** | Queen on double-tap, popup for choice | Quick play vs correctness |

## 5. Colour-Branded Identity (from GDD §4.1)

- Base: dark navy `#0E1220` / `#1A2032` / `#232B42`
- Text: ivory `#F5F1E8`, `#A9B2C6`, muted `#6C7690`
- Primary accent: **gold** `#D8B24A` (hover `#E6C766`); secondary steel blue
  `#3E5C8B`
- Semantic: success green `#58C185`, error red `#E0604E`, warning amber
  `#E6B24A`, info blue `#5A8BD8`
- Board: light `#F0E4CE`, dark `#8A5A3B`, frame `#241D14`
- Highlights: move `rgba(216,178,74,…)`, selected, check red, last-move blue
- Fonts: serif display (Playfair Display) + sans body (Inter); tabular figures
  for clocks/counters.

## 6. Implementation Structure (implemented)

```
chess/
  index.html                    (shell, loads app.js as module)
  package.json                  (npm scripts, ws dep)
  app.js                        (bootstrap + App orchestrator controller)
  README.md                     (run/test instructions)
  engine/                       pure rules engine (SHARED client+server)
    core.js                     (board rep, squares, FEN parse/serialize)
    moves.js                    (move gen, castling, en passant, legality, attack)
    engine.js                   (Game: move/undo/SAN/PGN/result detection)
    index.js                    (re-exports)
  ai/
    engine.js                   (negamax: alpha-beta, quiescence, TT, null-move,
                                  killers/history ordering, iterative deepening)
    eval.js                     (tapered material+PST, mobility, pawn structure,
                                  king safety, bishop pair, rook open files)
    zobrist.js                  (Zobrist hashing for the transposition table)
    opening.js                  (compact opening book of main lines, keyed by FEN)
    difficulty.js               (Easy/Medium/Hard/Master config)
    index.js                    (aiMove facade: book-first then engine search)
  net/
    client.js                   (WebSocket client + send-queue)
    name.js                     (display name from settings)
  shared/
    eventbus.js                 (typed pub/sub)
    protocol.js                 (message types, encode/decode, room code)
  view/
    board.js                    (SVG board + pieces renderer, orientation)
    pieces.js                   (piece SVG paths + themed pieceSvg)
  ui/
    screens.js                  (menu/lobby/board/pause/settings/game-over)
    hud.js                      (player cards, move list, status)
    settings.js                 (localStorage settings store)
    dom.js                      (el/button/card/toast, container helpers)
    promotion.js                (promotion picker popup)
  feedback/
    particles.js                (canvas particle pool + emitters + feedback bind)
    fx.js                       (floating text + screen fx + bindings)
  audio/audio.js                (procedural WebAudio SFX + ambient synth)
  theme/
    theme.js                    (applyTheme/applyAccessibility)
    tokens.js                   (colors, fonts, spacing, radii, motion)
  css/styles.css                (design-system styles, responsive, reduced-motion)
  server/index.js               (Node WS: static serve + authoritative rooms)
  test/
    engine/engine.test.js       (move gen, castling, en passant, promo, mate)
    engine/rules.test.js        (FEN, draws, undo, illegal moves)
    ai/ai.test.js               (AI legality + hanging-material capture)
```

Note: `engine/` and `shared/` are kept DOM-free so the Node server imports the
*exact* same rules engine for authoritative validation.

## 7. Reusable Libraries / Constraints

- **No framework mandate** — vanilla JS is the default for the client
  (aligns with the design system's dependency-light ethos and the game-engine
  skill). Prefer small, focused modules; avoid heavy UI libs; reuse design-system
  components.
- **Node.js** for the server (`ws` package; or `socket.io` if richer semantics
  needed — still simple JSON messages).
- **SVG skills:** use `svg-icon-generator` (clean vector pieces) and
  `creating-svg-illustrations` (accessible, portable SVG) and `svg-animations`
  (piece/victory animation) per task.

## 8. Conventions & Rules of Thumb

- **Separation of concerns:** the rules engine has zero DOM/UI/audio/particle
  deps; it raises typed events; presentation subscribes. Never couple engine to
  view.
- **No magic numbers** — durations, AI params, particle budgets, spacing, and
  colors come from a config/theme object.
- **No placeholder implementations**; no temp hacks; no duplicated systems; no
  unnecessary Update loops.
- **Pool** floating text + particles; reuse/show-hide UI instead of destroy/
  instantiate.
- **TDD for the engine** — legal-move and edge-case tests (pins, castling-through
  check, en passant, promotion, stalemate) are the correctness gate.
- **Accessibility first** — reduced-motion, color-blind, UI scale, contrast,
  keyboard nav are requirements, not afterthoughts.
- **Board rendering = persistent DOM pieces** (reference-style). Pieces are
  created once and positioned via CSS custom props (--pos-row/--pos-col); a move
  updates ONLY the moved piece's transform so nothing else animates. Never
  re-render the whole board on a move. Piece SVG shapes live in
  `view/piece-defs.js` (referenced via `<use href="#regal-king">` so all colors
  theme through `--fill`/`--stroke`).

## 9. Build Checklist (repeat per feature, from core/qa-checklist.md)

1. Rules engine tests pass (legal moves / edge cases).
2. No illegal move possible via any UI path.
3. Screens: one primary CTA; no dead-end state.
4. Online: turn lockout, reconnect resync, disconnect handling, no desync.
5. Responsive across desktop/tablet/mobile; safe areas; no text clipping.
6. Reduced-motion & color-blind verified.
7. Audio sliders/mute work; no overlapping sound.
8. Particles never cover HUD; pooled/budget-capped.
9. Performance profile on lowest target; no per-frame allocations.
10. Settings persist; PGN export works.

## 10. Open Questions / Next Steps

- **Server run/host approach:** local dev (`npm run start` → localhost:8080) is
  default; deploy target is undecided (a hosted Node process is required for
  online play across devices).
- **Stretch backlog (post-v1):** time controls (blitz/bullet/rapid), online
  undo/negotiate, game records + profile, extra piece/board themes,
  achievements, rating/elo, online draw auto-offer by endgame.
- **Known minor items:** online move list rebuilds per state diff (already
  preserved via `remoteSans`).

---

*End of memory.md v1.0.*
