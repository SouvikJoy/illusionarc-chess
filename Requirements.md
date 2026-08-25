# Regal Chess — Requirements.md

**Version:** 1.0
**Reference:** `GDD.md` v1.0, `PRD.md` v1.0

Requirement IDs are stable: **FR-x** functional, **NFR-x** non-functional.
Priorities: **P0** must for v1, **P1** should, **P2** stretch. Testability label
notes how each item is verified: **UT** unit test, **FT** functional test,
**A11y** accessibility check, **Perf** performance check, **V** visual/manual.

---

## A. Functional Requirements

### A.1 Rules Engine (engine)

| ID | Requirement | Priority | Test |
|---|---|---|---|
| FR-1 | The engine models an 8x8 board with each piece (type, color, square), turn, and move counters. | P0 | UT |
| FR-2 | The engine generates **all legal moves** for a selected piece, including castling, en passant, and pawn promotion (with promotion-piece options). | P0 | UT |
| FR-3 | The engine **never generates or accepts an illegal move** (e.g. it will not move into check, move a pinned piece off the pin line, move through check when castling). | P0 | UT |
| FR-4 | The engine detects and reports **check, checkmate, stalemate**. | P0 | UT |
| FR-5 | The engine detects **draw by insufficient material, 50-move rule, threefold repetition**. | P0 | UT |
| FR-6 | The engine applies a legal move and updates state (board, turn, castling rights, en passant target, half-move clock, full-move number), handling all special move side-effects (rook in castling, captured pawn in en passant, promotion). | P0 | UT |
| FR-7 | The engine exports **FEN** and **PGN/SAN**, and imports FEN to restore a position. | P0 | UT |
| FR-8 | The engine can **undo** a move and restore prior full state safely (offline use). | P0 | UT |
| FR-9 | The engine exposes the **captured pieces / material balance** and the **last move (from/to)** for presentation. | P1 | UT |
| FR-10 | The engine is **pure/state-isolated** — no dependency on DOM, UI, audio, or particles (enables client + server reuse). | P0 | UT/FT |

### A.2 AI Opponent (ai)

| ID | Requirement | Priority | Test |
|---|---|---|---|
| FR-11 | An AI provides **3 difficulty levels**: Easy, Medium, Hard, configurable by depth and randomness. | P0 | UT |
| FR-12 | The AI never submits an illegal move (it feeds moves through the validated engine). | P0 | UT/FT |
| FR-13 | The AI produces varied play (non-deterministic) at lower difficulty. | P1 | FT |
| FR-14 | The UI shows a clear **"AI thinking"** indicator while computing. | P1 | V |
| FR-15 | AI difficulty and player side are configurable and persist. | P0 | FT |
| FR-16 | AI moves are throttled / delayed so the player reads them (thinking-time config). | P1 | V |

### A.3 Game Modes

| ID | Requirement | Priority | Test |
|---|---|---|---|
| FR-17 | **Online PvP** — host creates a room and receives a shareable room code. | P0 | FT |
| FR-18 | **Online PvP** — a player joins a room by code (or share link). | P0 | FT |
| FR-19 | **Online PvP** — the server is authoritative: validates every move with the shared engine and broadcasts canonical state. | P0 | FT |
| FR-20 | **Online PvP** — color assignment (host choice or random) is established at match start. | P0 | FT |
| FR-21 | **Online PvP** — the client shows opponent status (connected, waiting, thinking, left). | P0 | V |
| FR-22 | **Online PvP** — reconnect resync: a rejoining client rebuilds board + history via `state_sync`. | P1 | FT |
| FR-23 | **Online PvP** — disconnect/leave is handled gracefully (opponent-left message, resign/abandon path). | P1 | FT |
| FR-24 | **vs AI** — play against AI with selectable difficulty and side. | P0 | FT |
| FR-25 | **Hotseat** — two players alternate on one device. | P0 | FT |
| FR-26 | **Hotseat optional** — hidden-board toggle dims the board between turns and requires tap-to-pass. | P1 | V |

### A.4 Screens, Panels & Navigation

| ID | Requirement | Priority | Test |
|---|---|---|---|
| FR-27 | **Main Menu** shows brand, a primary *Play Online* CTA, secondary *Play vs AI* / *Hotseat*, and utility *Settings* / *About* / sound toggle. | P0 | V |
| FR-28 | **Online Lobby** supports Create Room and Join Room (by code), showing waiting/both-ready/start states. | P0 | FT |
| FR-29 | **Board screen** renders the SVG board, HUD player cards, move list, and control bar. | P0 | V |
| FR-30 | **Pause Menu** opens over the game with Resume (primary), Settings, Resign, New Game, Return to Menu, sound toggle; board input disabled while open. | P0 | V |
| FR-31 | **Settings Panel** (modal) exposes Gameplay, Board, Online, Audio, Accessibility, Language, General groups, per GDD §9.7. | P0 | V |
| FR-32 | **Game Over Panel** shows result + reason, Rematch (primary), Review Board, Return to Menu, Copy PGN. | P0 | V |
| FR-33 | All screens/panels have one primary CTA and consistent back/close affordances. | P0 | V |
| FR-34 | Navigation state machine (menu → lobby → playing ⇄ paused → game over → menu) is enforced. | P0 | FT |
| FR-35 | Keyboard navigation (arrows/enter/esc) and visible focus through menus and board. | P0 | A11y |

### A.5 Board Interaction

| ID | Requirement | Priority | Test |
|---|---|---|---|
| FR-36 | Selecting a piece highlights all its legal target squares (distinguishing capture v non-capture). | P0 | V |
| FR-37 | Move by tap/click and by drag-and-drop (ghost follow; invalid drop snaps back). | P0 | FT |
| FR-38 | Illegal move attempts give clear feedback (shake + error tone) and never mutate state. | P0 | FT |
| FR-39 | Input is locked during: opponent's turn (online), AI thinking, and animation. A "waiting" cue is shown. | P0 | FT |
| FR-40 | King-in-check is clearly indicated; the king's square pulses red. | P0 | V |
| FR-41 | Last move (from -> to) is highlighted. | P1 | V |
| FR-42 | Board adapts to orientation so the current player's pieces are at the bottom. | P1 | V |
| FR-43 | Touch targets are ≥44px; safe areas respected on mobile. | P0 | A11y |

### A.6 Feedback & Juice

| ID | Requirement | Priority | Test |
|---|---|---|---|
| FR-44 | Each meaningful event plays its assigned feedback level (move, capture, check, promotion, checkmate, invalid, draw, join/quit) per GDD §11. | P0 | V |
| FR-45 | Floating feedback (e.g. captured material line, "Check!", result) rises and fades; pooled; never overlaps HUD. | P1 | V |
| FR-46 | Screen feedback (vignette/color flash, camera drift on win, pulse on check, shake on error) respects reduced-motion. | P0 | A11y |

### A.7 Audio

| ID | Requirement | Priority | Test |
|---|---|---|---|
| FR-47 | All interactive actions have expected audio (move, capture, select, check, invalid, promotion, victory, UI, draw, join/quit). | P0 | V |
| FR-48 | Separate SFX, Music, and Master volume sliders plus a mute toggle; persisted. | P0 | FT |
| FR-49 | Repeated sounds use pitch variation to avoid fatigue. | P1 | V |
| FR-50 | No excessive overlapping sounds; important events may briefly duck music. | P1 | V |
| FR-51 | Audio is never the sole signal — every sound has a visual equivalent. | P0 | A11y |

### A.8 Particles & Effects

| ID | Requirement | Priority | Test |
|---|---|---|---|
| FR-52 | Particles fire at feedback level ≥2 events (select, capture, promotion, victory, ambient optional) per GDD §15. | P0 | V |
| FR-53 | Particles never obscure the board, captured grid, or HUD counters. | P0 | V |
| FR-54 | Particle systems are pooled, budget-capped, and reduced under reduced-motion / low-tier. | P0 | Perf |

### A.9 Settings, Theme & Persistence

| ID | Requirement | Priority | Test |
|---|---|---|---|
| FR-55 | Settings (Gameplay, Board, Online, Audio, Accessibility, Language, General) are exposed in a modal and persist in localStorage. | P0 | FT |
| FR-56 | Theme (colors, fonts, spacing), AI params, particle defs, and animation times come from a config object, not hardcoded magic numbers. | P0 | V |
| FR-57 | Reset-to-defaults is available. | P2 | FT |
| FR-58 | PGN export/copy is available from the move list and Game Over. | P1 | FT |

### A.10 Accessibility

| ID | Requirement | Priority | Test |
|---|---|---|---|
| FR-59 | Reduced-motion mode tames camera shake, big celebrations, and heavy particles to fades/minimal motion; state changes stay visible. | P0 | A11y |
| FR-60 | Color-blind mode adds distinct piece glyphs/outlines so ownership is not conveyed by hue alone. | P0 | A11y |
| FR-61 | UI scale setting (Small/Normal/Large) resizes UI without breaking layout. | P0 | A11y |
| FR-62 | Text meets contrast on every surface; scrim/outline where ambiguous. | P0 | A11y |
| FR-63 | Keyboard navigation through menus and the board. | P0 | A11y |
| FR-64 | Color-blind-safe ownership via shape/value, not hue only. | P0 | A11y |

### A.11 Online Server (server)

| ID | Requirement | Priority | Test |
|---|---|---|---|
| FR-65 | Node.js WebSocket server manages rooms, players, and color assignment. | P0 | FT |
| FR-66 | Server validates each move with the shared rules engine and rejects illegal moves. | P0 | FT |
| FR-67 | Server broadcasts canonical move/state diffs to both clients. | P0 | FT |
| FR-68 | Server handles rematch, resign, draw offer/accept, and disconnect/leave. | P1 | FT |
| FR-69 | Server supports reconnection (`state_sync`) and room expiration on inactivity. | P1 | FT |

---

## B. Non-Functional Requirements

| ID | Requirement | Priority | Test |
|---|---|---|---|
| NFR-1 | **Rules correctness:** the engine matches FIDE laws for all tested legal-check, castling-through-check, en-passant, promotion, and draw edge cases; no illegal move is ever committed. | P0 | UT |
| NFR-2 | **Performance:** stable target frame rate on the lowest supported device; no per-frame allocations or object searches in hot paths; board not fully redrawn per frame. | P0 | Perf |
| NFR-3 | **Responsiveness:** layout adapts to desktop/tablet/mobile and portrait/landscape without clipping; safe areas respected. | P0 | A11y |
| NFR-4 | **Quality bar:** the QA checklist (`core/qa-checklist.md`) is satisfied across compilation, errors, functionality, hierarchy, responsiveness, feedback, particles, audio, motion, performance, polish. | P0 | Manual |
| NFR-5 | **Accessibility:** reduced-motion, color-blind mode, UI scale, contrast, and keyboard navigation pass. | P0 | A11y |
| NFR-6 | **Separation of concerns:** rules engine is independent of UI/audio/particles so it is reusable and testable. | P0 | UT |
| NFR-7 | **Persistence:** settings persist across sessions/reloads. | P0 | FT |
| NFR-8 | **Graceful failure:** network disconnect, illegal input, rapid re-entry, and zero/max states are handled without dead-ends or errors. | P0 | FT |
| NFR-9 | **No magic numbers:** durations, AI params, particle budgets, etc. are centralized in config. | P0 | V |
| NFR-10 | **Privacy/security:** no secrets committed to the repo; server-side validation prevents client cheating (no trusting client claims). | P0 | FT |

---

## C. Traceability

| PRD User Story / Area | Requirement IDs |
|---|---|
| Rules correctness | FR-1..FR-10, NFR-1 |
| Online multiplayer | FR-17..FR-23, FR-65..FR-69, NFR-8 |
| vs AI | FR-11..FR-16 |
| Hotseat | FR-25..FR-26 |
| Screens/panels | FR-27..FR-35 |
| Board interaction | FR-36..FR-43 |
| Feedback/juice | FR-44..FR-46 |
| Audio | FR-47..FR-51 |
| Particles | FR-52..FR-54 |
| Settings/theme/persistence | FR-55..FR-58, NFR-7, NFR-9 |
| Accessibility | FR-59..FR-64, NFR-5 |
| Performance | NFR-2 |
| Quality | NFR-4, NFR-6 |

---

*End of Requirements.md v1.0.*
