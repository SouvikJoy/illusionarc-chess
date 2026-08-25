# Regal Chess

A polished, multiplayer web chess game built with HTML, CSS, vanilla JavaScript
and SVG rendering, with a Node.js + WebSocket server for real-time online play.

Runs entirely from a single Node server (serves static files **and** hosts
online multiplayer). No build step, no bundler.

## Features

- **Standard 8x8 chess** with full FIDE rules (castling, en passant, promotion,
  check/checkmate/stalemate, insufficient material, 50-move, threefold).
- **Three play modes:** Online PvP (room codes via WebSocket), vs AI
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

## Requirements

- Node.js 18+ (uses ES modules + `node --test`)

## Run

```bash
npm install        # installs ws
npm run start      # starts the server on http://localhost:8080
```

Then open **http://localhost:8080** in a browser.

To **play online**, open the game in two browsers/tabs:
1. One player: **Play Online → Create Room** (share the 5-letter code).
2. Other player: **Play Online** → enter the code → **Join Room**.
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
ai/       alpha-beta search + difficulty levels
net/      WebSocket client + protocol helpers
shared/   event bus + WebSocket message contract
view/     SVG board + pieces renderer
ui/       screens (menu/lobby/board/pause/settings/game-over), HUD, components
feedback/ particles, floating text, screen effects
audio/    procedural WebAudio SFX + ambient music
theme/    design tokens (colors, fonts, spacing, motion)
server/   Node WS server: static serve + authoritative online play
app.js    bootstrap + orchestration controller
css/      design-system styles
test/     engine + AI unit tests
```
