# Regal Chess — Product Requirements Document (PRD)

**Version:** 1.0
**Status:** Awaiting approval
**Design reference:** `GDD.md` v1.0

> The PRD states *what* the product must deliver and *why*, and defines
> priorities and acceptance criteria. The GDD is the design reference; the
> `Requirements.md` is the technical requirement-set. This document is the
> product contract.

---

## 1. Product Overview

**Regal Chess** is a polished, multiplayer-capable web chess game built with
HTML5, CSS, vanilla JavaScript and SVG, with a Node.js + WebSocket server for
real-time online matches. It ships standard 8x8 chess with three play modes
(Online PvP, vs AI, and local Hotseat), a full set of menus and panels (Main
Menu, Online Lobby, Pause, Settings, Game Over), and a design-system-driven
visual and audio identity.

### 1.1 Problem Statement
Chess on the web is abundant but rarely *polished* or *obviously clear*: many
clients are cluttered, hard to read on mobile, or poor at communicating state
(whose turn, why a move is blocked, what just happened). There is also no
turnkey, designed chess experience tied to our reusable design system.

### 1.2 Product Objective
Deliver a chess game that a casual or intermediate player can pick up instantly,
understand at a glance, play online with a friend, enjoy against a well-tuned
AI, and experience with polished, deliberate feedback — all running smoothly on
desktop and mobile browsers.

### 1.3 Value Proposition
- **Instant clarity** — legal moves previewed, last move shown, check and turn
  always visible; feedback answers what/why/succeeded/next.
- **Flexible play** — online with friends, offline vs a 3-tier AI, or hotseat on
  one screen.
- **Polish as a feature** — ritual-like animations, tasteful particles and
  audio, and an accessible, themeable board.
- **Own the stack** — authoritative server + a tested shared rules engine for
  correctness.

---

## 2. Target Audience & Personas

| Persona | Description | Needs |
|---|---|---|
| **The Casual** | New-ish to chess, plays to relax | Easy AI, clear highlights, gentle lessons, forgiving difficulty |
| **The Club Player** | Knows tactics and openings | True rules, competent AI (Hard), online friends, move list / PGN |
| **The Social Gamer** | Plays with a friend | Hotseat or quick online room code, share link |
| **The Accessibility User** | Color-blind, reduced-motion, low vision | Color-blind mode, reduced-motion, UI scale, contrast, keyboard nav |
| **The Mobile Player** | Plays on a phone on the go | Touch-first, safe-area, portrait/landscape layout, ≥44px targets |

---

## 3. Goals & Non-Goals

### 3.1 Goals
1. Ship a **correct, bulletproof** standard-chess rules engine (no illegal moves).
2. Deliver **online multiplayer** against a friend via room codes over WebSockets.
3. Deliver an **offline vs-AI** opponent at 3 difficulty levels.
4. Deliver a **local hotseat** mode.
5. Deliver the **full screen/panel set**: Main Menu, Online Lobby, Board, Pause
   Menu, Settings, Game Over.
6. Maintain a **clean separation** between the rules engine and presentation.
7. Meet the design system's **accessibility and performance** standards.
8. Ship an **extensible** theme/config so designers can retune without code.

### 3.2 Non-Goals (v1)
- No chess variants (960, no-castling, etc.).
- No time controls/clocks in v1 (stretch).
- No persistent game records or elo/rating profiles in v1 (stretch).
- No multiple physical piece/board theme packs beyond the shipped set (extensible
  only).
- No achievements in v1 (stretch).

---

## 4. User Stories & Priorities

Priorities: **P0** = must for v1, **P1** = should/strongly desired, **P2** =
nice / stretch.

### 4.1 Onboarding & Menu
- **P0** — As a new player, I open the app and land on a clean Main Menu where I
  can start a game or open settings.
- **P0** — As a player, I can start a game vs the AI after choosing difficulty
  and my side.
- **P0** — As a player, I can start a local hotseat game.

### 4.2 Online Multiplayer
- **P0** — As a host, I create a room and get a shareable code.
- **P0** — As a friend, I join a room by entering that code.
- **P1** — As a player, I can send and receive a rematch request from the Game
  Over panel.
- **P1** — As a player, I can resign and offer/accept a draw.
- **P1** — As a player, I safely reconnect after a dropped connection and resume
  the match.

### 4.3 Board & Rules Interaction
- **P0** — As a player, I select a piece and see all its legal moves.
- **P0** — As a player, I move pieces by tap/click and by drag-and-drop.
- **P0** — As a player, I can never commit an illegal move (engine-backed).
- **P0** — As a player, I am clearly told when it is my turn vs the opponent's.
- **P0** — As a player, I experience castling, en passant, and promotion with the
  correct rules and clear feedback.
- **P0** — As a player, I am shown when the king is in check.
- **P1** — As a player, I can view the move list and export/copy the game as PGN.

### 4.4 Game End
- **P0** — As a player, I see a Game Over panel stating the result and reason.
- **P0** — As a player, I can Rematch or Return to Menu from Game Over.
- **P1** — As the winner, I get a celebration sequence.

### 4.5 Settings & Persistence
- **P0** — As a player, I adjust difficulty, board theme, and audio (SFX/Music/
  Master) in Settings.
- **P0** — As an accessibility user, I enable reduced-motion, color-blind mode,
  and UI scale.
- **P0** — My settings persist across sessions.
- **P2** — As a player, I can reset settings to defaults.

### 4.6 AI
- **P0** — As a player, I play against AI at Easy/Medium/Hard.
- **P1** — As a player, I get a visible "AI thinking" indicator.

---

## 5. Functional Requirements Summary (see Requirements.md for IDs)

| Area | Requirement | Priority |
|---|---|---|
| Rules | Correct legal move generation, no illegal moves | P0 |
| Rules | Check/checkmate/stalemate/draw (50-move, repetition, material) | P0 |
| Rules | Castling, en passant, promotion | P0 |
| Modes | Online PvP (WebSocket, room codes) | P0 |
| Modes | vs AI (Easy/Medium/Hard) | P0 |
| Modes | Hotseat | P0 |
| Screens | Main Menu, Online Lobby, Board, Pause, Settings, Game Over | P0 |
| Interaction | Tap + drag to move; legal-move preview; keyboard nav | P0 |
| Feedback | Per-event juice per feedback levels | P0 |
| Audio | SFX + music, separate sliders, mute | P0 |
| Access | Reduced motion, color-blind mode, UI scale, contrast, keyboard | P0 |
| Perf | 60fps on mid-tier mobile; no GC hitches; pooled particles | P0 |
| Persist | Settings persisted; PGN export | P0/P1 |
| Online robustness | Reconnect resync, disconnect handling, rematch | P1 |

---

## 6. Acceptance Criteria (product-level)

1. **Rules correctness:** the engine passes a unit-test suite covering legal
   moves including pinned-piece and castling/promotion/en-passant edge cases; it
   is impossible to commit an illegal move through any UI path.
2. **Online end-to-end:** two clients on separate devices can connect via a room
   code, play a full legal game, and see synchronized state with no divergence.
3. **Offline AI:** each difficulty level produces play consistent with its
   configured depth/randomness, and AI never makes an illegal move.
4. **Hotseat:** two players alternate on one device; optional hidden-board
   toggle works.
5. **Screens:** all six screens/panels render correctly, respond to states, and
   have a single clear primary CTA per flow.
6. **Accessibility:** reduced-motion, color-blind mode, UI scale, and keyboard
   navigation are functional and verified.
7. **Performance:** game holds target frame rate on the lowest target device;
   no per-frame allocations in hot paths; particles/floating text pooled.
8. **Settings persistence:** audio, theme, difficulty, and accessibility choices
   persist across reload.
9. **QA checklist:** passes all steps in `core/qa-checklist.md`.

---

## 7. Release Criteria & Scope Phasing

- **v1 (MVP):** foundation rules engine + board, offline vs AI + hotseat, all
  screens/panels, settings + persistence, theme/audio/motion/particles,
  accessibility essentials. Online is **required** for v1 per the brief.
- **v1.1 (Polish):** reconnect robustness, rematch/draw flows, PGN copy, extra
  board/piece themes, performance tuning, QA hardening.
- **Stretch:** time controls, records/profile, achievements, variants.

> The brief requires the game to be multiplayer; therefore **Online PvP is a P0
> release gate for v1**, not a later add-on.

---

## 8. Key Metrics / Success Signals

- **Rules correctness** — 100% of legal-move and edge-case tests pass.
- **Time-to-start** — a match starts within ~5s of entering a valid room code.
- **Mobile performance** — stable frame rate; layout reflows with no clipping.
- **Accessibility** — all three accommodations verified working.
- **Engagement/quality (manual)** — the four feedback questions are answerable
  from the UI at every event; no dead-end or confusing state.

---

## 9. Risks & Dependencies

- **Dependency:** a Node.js server must be runnable/hostable for online play.
- **Risk:** SVG board animation performance — mitigated by transform anims and
  event-driven updates (no full redraw).
- **Risk:** server-authoritative validation complexity — reused tested engine.
- **Risk:** online desync — server-canonical state + state_sync + move tokens.
- **Risk:** scope creep from stretch items — tracks time controls/records/ratings
  as post-v1.

---

*End of PRD v1.0.*
