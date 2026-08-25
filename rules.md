# Regal Chess — Rules Reference (rules.md)

**Version:** 1.0
**Purpose:** The authoritative rules the engine must implement, matching FIDE
laws of chess. This is the contract between the design and the rules engine
(`engine/`).

Coordinate convention: rank 1 is White's back rank; files a–h from White's
left. `a1` is bottom-left as viewed by White. Squares are `file + rank`, e.g.
`e4`. White moves up (increasing rank); Black moves down (decreasing rank).

---

## 1. Board & Setup

- 8x8 board. Standard starting position:
  - White: rank 1 rook, knight, bishop, queen, king, bishop, knight, rook (files
    a–h); rank 2 all pawns.
  - Black: rank 8 rook, knight, bishop, queen, king, bishop, knight, rook (files
    a–h); rank 7 all pawns.
- **White always moves first.**
- Move tracking: `turn` (w/b), `castlingRights` (KQkq), `enPassantTarget`
  (square or `-`), `halfMoveClock` (50-move), `fullMoveNumber` (increments after
  Black's move).

---

## 2. Piece Movement

### 2.1 Pawn
- Moves **forward one square** (opposite direction for Black).
- **First move:** may advance **two squares** if both squares are empty (from its
  starting rank: White rank 2, Black rank 7).
- **Captures** diagonally one square forward to an occupied enemy square.
- Does **not** capture straight ahead; does not move backward.
- **En passant:** if an enemy pawn just moved two squares from its starting
  square and lands beside this pawn (same rank, adjacent file), this pawn may
  capture it by moving diagonally forward onto the **empty** square it passed —
  this is legal **only on the immediately following move**.
- **Promotion:** upon reaching the last rank (White rank 8, Black rank 1) the
  pawn must promote to queen, rook, bishop, or knight (same color).

### 2.2 Knight
- Moves in an L-shape: two squares in one axis, then one square perpendicular.
- **Jumps** over pieces. Captures by landing on an enemy piece.

### 2.3 Bishop
- Moves any number of squares **diagonally**. Cannot jump. Captures on landing.

### 2.4 Rook
- Moves any number of squares **orthogonally** (rank/file). Cannot jump. Cannot
  be blocked by pieces.

### 2.5 Queen
- Combines rook + bishop: any number of squares orthogonally or diagonally.
  Cannot jump.

### 2.6 King
- One square in **any direction** (orthogonal or diagonal).
- **Castling** (see §3).
- The king may never move into, through, or remain in check. The king may not
  capture a defended piece.

---

## 3. Castling

A king and a rook of the same color may castle if **all** are true:

1. Neither the king nor the castling rook has **moved** (from its starting
   square) during the game; and
2. The squares between the king and that rook are **empty**; and
3. The king is **not currently in check**; and
4. The king does **not pass through a square attacked by an enemy piece**; and
5. The king does **not end up in check**.

Effect (White view, rank 1):
- **Kingside (O-O):** King e1 → g1; rook h1 → f1. (Black: e8 → g8, h8 → f8.)
- **Queenside (O-O-O):** King e1 → c1; rook a1 → d1. (Black: e8 → c8, a8 → d8.)

Note: the rook **may** pass through an attacked square; only the king's start,
destination, and the squares it travels through must be safe. Castling is a
**king** move (the king travels two squares); the rook is relocated
correspondingly in the same move. When castling, neither player's intervening
squares matter for the opponent — only the three king-safety conditions.

---

## 4. Check

- A king is **in check** if it is attacked by one or more enemy pieces.
- A player **in check must** respond to the threat on their immediate turn — the
  king must move, the attacker must be captured, or a piece must block (if
  possible).
- It is **illegal** to make any move that leaves one's own king in check
  (including moving another piece that exposes the king, "discovered check").

---

## 5. Checkmate

- A player is **checkmated** when they are **in check** and have **no legal
  move** that removes the check. The game ends immediately; the player in
  checkmate **loses** (the opponent wins).

---

## 6. Stalemate

- A player is **stalemated** when it is their turn, they are **NOT in check**,
  but they have **no legal move**. The game ends in a **draw**.

---

## 7. Draws

### 7.1 Insufficient Material
- Draw if neither side has enough material to force checkmate. Recognized cases:
  - King vs King
  - King + Bishop vs King
  - King + Knight vs King
  - King + Bishop vs King + Bishop **with bishops on the same color** squares
  - (Any position where no legal sequence of moves can lead to checkmate.)

### 7.2 50-Move Rule
- Draw if the last **100 half-moves (50 moves by each player)** have passed with
  **no capture and no pawn move** — i.e. the FEN half-move clock reaches 100. Hover/UI shows a warning before it becomes automatic; the engine
  can declare the draw automatically or offer it. (We auto-declare, per GDD,
  with a visual warning leading up to it.)

### 7.3 Threefold Repetition
- Draw if the **same position** occurs **three times** (with the same player to
  move and the same castling/en-passant rights). The engine tracks and flags it.
  In online mode the player may claim it, or the engine offers/awards it where
  configured. (We auto-award in offline; offer in online per GDD §5.4.)

### 7.4 Draw by Agreement
- Either player may **offer a draw**; the game is a draw if the opponent
  **accepts**. (Online only per GDD, but configurable.)

### 7.5 Resignation
- A player may **resign** at any time; the resigning player **loses**.

---

## 8. Illegal Moves & Validation

- A move is **legal** iff:
  1. It is a valid move for the piece (per §2/§3);
  2. The destination is empty or holds an enemy piece (capture), and the
     path is clear for sliding pieces;
  3. The moving color is the current turn's color; and
  4. After applying the move, the moving player's **own king is NOT in check**.
- The engine must **reject** any move failing these, even if requested directly.

### 8.1 Edge Cases to handle in validation/tests
- **Pinned pieces** — a piece that shields its king from a sliding attacker may
  only move along the pin line (and never leave the king in check).
- **Move into check** — can't move a piece to a square leaving the king exposed.
- **Castling through check** — king cannot cross an attacked square.
- **En passant** — only immediately after the double-pawn advance.
- **Promotion** — must specify promotion piece; default queen on double-tap.
- **Discovered check** — moving a piece reveals a line of attack to the king.
- **Stalemate detection** — the king may be legally able to *move* but all
  moves are blocked/captured; if no legal move and not in check → stalemate
  (draw), not checkmate.

---

## 9. Move Representation & Notation

- Squares: `a`–`h` (file) + `1`–`8` (rank).
- **Move:** `{ from: "e2", to: "e4", promotion?: "Q|R|B|N" }`.
- **SAN (Standard Algebraic):** `Nf3`, `exd5`, `O-O`, `O-O-O`, `e8=Q`,
  `pawn-capture` includes the departing file (`exd5`), disambiguation by file/
  rank where needed, check `+`, mate `#`.
- **FEN:** field order — piece placement, active color, castling rights
  (KQkq or `-`), en passant target (or `-`), half-move clock, full-move number.
- **PGN:** move text + optional headers (Event, Site, Date, White, Black,
  Result); loads to replay/export.

---

## 10. Engine State Model (contract to implementers)

```
Board: 8x8 array of pieces { type: P,N,B,R,Q,K, color: w|b } | null
State:
  turn                'w' | 'b'
  castlingRights      { K, Q, k, q }  (availability flags)
  enPassantTarget     square | null   (only the one square; excludes after-cap)
  halfMoveClock       uint             (increments on non-pawn/non-capture)
  fullMoveNumber      uint             (increments after black's move)
  history             [] of applied moves (for undo + PGN)
Events (typed, for presentation):
  moveApplied(payload) capture, castling, en passant, promotion, check, checkmate, stalemate, draw.
```

---

## 11. Win/Loss/Result Communication

The engine resolves the outcome into one of:
- `checkmate` → winner = mover.
- `stalemate` → draw.
- `insufficient_material` → draw.
- `fifty_move` → draw.
- `threefold_repetition` → draw.
- `agreement` (online) → draw.
- `resignation` → winner = non-resigner.
- (No clock in v1; clocks are a stretch scope — excluded here.)

The Game Over panel presents the result + reason text from these.

---

*End of rules.md v1.0.*
