# Regal Chess

A polished, multiplayer web chess game built with HTML, CSS, vanilla JavaScript
and SVG rendering.

**Online multiplayer runs serverless on Vercel** (Upstash Redis for rooms +
shared rules engine as the authoritative server) — no persistent WebSocket
server required.

## Live

**Deployed:** https://chess-liart-beta.vercel.app
**Repo:** https://github.com/SouvikJoy/illusionarc-chess

## Features

- **Standard 8x8 chess** with full FIDE rules (castling, en passant, promotion,
  check/checkmate/stalemate, insufficient material, 50-move, threefold).
- **Three play modes:** Online PvP (serverless + polling), vs AI
  (Easy/Medium/Hard), and local Hotseat.
- **Full screen set:** Main Menu, Online Lobby, Board, Pause Menu, Settings,
  Game Over — with buildable, reusable UI components per the Game Design System.
- **Polish:** SVG board + pieces, move/capture/check/promotion animations,
  particle bursts, floating feedback, screen effects, procedural audio
  (SFX + ambient music), all design-system driven.
- **Accessibility:** reduced-motion, color-blind mode, high-contrast, UI scale,
  keyboard navigation, contrast-safe, ≥44px touch targets.
- **Correctness:** a pure, unit-tested rules engine reused by both client and
  server (server is authoritative for online play).

## How online multiplayer works on Vercel

Vercel serverless can't hold a WebSocket connection or game state in memory, so
multiplayer uses:

- **Vercel serverless API** (`/api/*`): create/join rooms, submit moves,
  resign/rematch/draw. The **shared rules engine** validates every move, so the
  server is authoritative (no cheating/desync).
- **Upstash Redis** (via `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
  env vars) stores room state.
- **Client polling** (`net/client.js`) fetches `/api/state` every ~800ms and
  applies opponent moves.

## Requirements

- Node.js 18+ (for local dev + `node --test`)

## Local dev

```bash
npm install
vercel dev      # serves the app + /api functions locally
```

Without Upstash credentials the API falls back to an in-memory store (works for
a single local session).

## Play online

1. Open the deployed site in two browsers/tabs.
2. Player 1: **Play Online → Create Room** (share the 5-letter code).
3. Player 2: **Play Online** → enter the code → **Join Room**.
4. The game starts automatically; moves sync both ways via the server.

## Test

```bash
npm test
```

Runs the engine + AI suite (rules, castling, en passant, promotion, draws,
repetition, FEN/PGN, AI legality and material play).
3. The host presses **Start** (auto after both are in the room).

## Test

```bash
npm test
```

Runs the engine + AI suite (rules, castling, en passant, promotion, draws,
repetition, FEN/PGN, AI legality and material play).

## Notes

- Settings persist in `localStorage`.
- Move history exports to PGN from the move list / Game Over panel.
- Visual identity, screens, and feedback follow the design system in
  `GAME_DESIGN_SYSTEM/` (see `projects/regal-chess.md`).

## Structure

```
engine/   pure rules engine (move gen, FEN, game state) — shared client+server
ai/       alpha-beta search + difficulty levels + opening book
api/      Vercel serverless multiplayer endpoints (rooms, moves, state)
net/      HTTP + polling multiplayer client (Upstash-backed)
shared/   event bus + message helpers
view/     SVG board + pieces renderer
ui/       screens (menu/lobby/board/pause/settings/game-over), HUD, components
feedback/ particles, floating text, screen effects
audio/    procedural WebAudio SFX + ambient music
theme/    design tokens (colors, fonts, spacing, motion)
server/   legacy standalone Node WS server (optional, not used on Vercel)
app.js    bootstrap + orchestration controller
css/      design-system styles
test/     engine + AI unit tests
```
