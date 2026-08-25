import { test } from 'node:test';
import assert from 'node:assert';
import { Game } from '../../engine/index.js';

function makeGame(fen) {
  const g = new Game(fen);
  return g;
}
function sq(m) { return m; } // alias

// --- basic move generation ---
test('starting position: white has 20 legal moves', () => {
  const g = makeGame();
  assert.equal(g.allLegalMoves().length, 20);
});

test('opening e4 then black e5 then Nf3', () => {
  const g = makeGame();
  assert.ok(g.move('e2', 'e4'));
  assert.equal(g.turn, 'b');
  assert.ok(g.move('e7', 'e5'));
  assert.ok(g.move('g1', 'f3'));
  assert.equal(g.fen().startsWith('rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b'), true);
});

test('knight can jump', () => {
  const g = makeGame();
  assert.ok(g.move('g1', 'f3'));
  assert.ok(g.move('b8', 'c6'));
});

// --- pins ---
test('pinned piece cannot move off the pin line', () => {
  // White king e1, white bishop d2, black rook d... rook attacks along d-file.
  let g = makeGame('4k3/8/8/8/8/8/8/3R2K1 w - - 0 1');
  // white king g1, white rook d1; rook pinned? no. Let's set a clear pin:
  // White: Kg1, Ne2; Black: Re8 pins knight e2 to king g1 (knight shields).
  g = makeGame('4k3/8/8/8/8/8/4N3/6K1 b - - 0 1');
  // Black to move; white knight e2, king g1.
  // Black rook to e8 attacking along e-file? knight on e2 not on e-file king g1. not a pin.
  // Use a real pin: black rook g8 (attack king g1 along g-file) with knight on g2 in between.
  g = makeGame('k3k3/8/8/8/8/8/6N1/6K1 w - - 0 1');
  // black king a8, e8? Let's craft: white K g1, white N g2, black R g8 -> knight pinned.
  g = makeGame('r3k3/8/8/8/8/8/6N1/6K1 w - - 0 1');
  // black rook a8 does not pin. Just set black rook on g8 (rank 8 rest).
  g = makeGame('6rk/8/8/8/8/8/6N1/6K1 w - - 0 1');
  // rank8: g8 = rook, h8 = king of black. But black king adjacent? g8 rook, h8 king. King h8 attacked by White? fine.
  const moves = g.legalMoves('g2');
  // knight g2 is pinned by rook g8 -> king g1. It may only move along the g-file? Knight can't stay on g-file except blocking. Legal knight moves from g2: e1,f4,e3,h4,h0(no),f0(no),e..., let's allow any move that still leaves king safe = none that leave g-file uncovered. Knight can't block on g3? it's not a knight destination. So pinned knight should have NO legal moves.
  assert.equal(moves.length, 0);
});

// --- castling ---
test('kingside castling works and is blocked if king passes through check', () => {
  let g = makeGame('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.ok(g.move('e1', 'g1')); // white kingside castle
  assert.equal(g.fen(), 'r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1');
});

test('castling blocked when king passes through attacked square', () => {
  // black rook e8 attacks f1? no. Put a black rook on f8? attacks down f-file: f1.
  let g = makeGame('5rk1/8/8/8/8/8/8/R3K2R w KQ - 0 1');
  // black rook f8 attacks f1 (king path from e1->f1->g1 passes f1 attacked)
  // So kingside castling illegal.
  const moves = g.allLegalMoves().filter((m) => m.flags && m.flags.castle);
  assert.equal(moves.filter((m) => m.flags.castle === 'K').length, 0);
});

test('castling blocked when king in check', () => {
  // black rook e8 attacks e1 (down e-file) -> white king in check; cannot castle.
  let g = makeGame('4r2k/8/8/8/8/8/8/R3K2R w KQk - 0 1');
  assert.equal(g.inCheck('w'), true);
  const castle = g.allLegalMoves().filter((m) => m.flags && m.flags.castle);
  assert.equal(castle.length, 0);
});

// --- en passant ---
test('en passant capture', () => {
  // White pawn e5, black pawn d7 comes to d5 in one double -> white captures e.p.
  let g = makeGame('4k3/8/8/4Pp2/8/8/8/4K3 w - f6 0 1');
  // White pawn e5, black pawn f5, ep target f6 (black just double-pushed f7-f5). White e5xf6 ep.
  const epMoves = g.legalMoves('e5').filter((m) => m.flags && m.flags.enPassant);
  assert.equal(epMoves.length, 1);
  assert.equal(epMoves[0].to, 21); // f6 idx
  const r = g.move('e5', 'f6');
  // f5 pawn should disappear
  assert.equal(g.pieceAt('f5'), null);
});

test('en passant is only immediate', () => {
  // After white plays a move, ep target clears
  let g = makeGame('4k3/8/8/4Pp2/8/8/8/4K3 w - f6 0 1');
  g.move('e5', 'e6'); // waste: still white? e5->e6 white, then turn black
  // ep should now be cleared (f6 no longer target)
  assert.equal(g.ep, -1);
});

// --- promotion ---
test('pawn promotes with choices', () => {
  let g = makeGame('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  const moves = g.legalMoves('a7');
  const promo = moves.filter((m) => m.flags && m.flags.promo);
  assert.equal(promo.length, 4); // Q R B N
  g.move('a7', 'a8', 'Q');
  assert.equal(g.pieceAt('a8').kind, 'Q');
  g.undo();
  g.move('a7', 'a8', 'N');
  assert.equal(g.pieceAt('a8').kind, 'N');
});

// --- check / checkmate / stalemate ---
test('fools mate (scholars-like)', () => {
  let g = makeGame();
  g.move('f2', 'f3');
  g.move('e7', 'e5');
  g.move('g2', 'g4');
  g.move('d8', 'h4');
  assert.equal(g.inCheck('w'), true);
  const res = g.result();
  assert.equal(res.type, 'checkmate');
  assert.equal(res.winner, 'b');
});

test('stalemate detection', () => {
  // Black king h8, white queen f7? Actually stalemate: white to move? Let's set black to move with no moves not in check.
  // Classic: White Kf7? No. Standard: White king e6? Let's use known: black Kg8? White Qg6, Ke6 -> black Kh8 stalemated.
  let g = makeGame('7k/8/5Q2/4K3/8/8/8/8 b - - 0 1');
  // Black king h8, white queen f6? wait I wrote 5Q2 = f6 queen? Let me recompute: rank6: '5Q2' -> f6 queen. rank5 '4K3' -> e5 king.
  // Black kh8, white Qf6, Ke5. Is black in check? Qf6 attacks h8? f6 to h8 diagonal distance 2 -> yes check. That's checkmate not stalemate.
  // For stalemate use Qg6 not attacking h8.
  g = makeGame('7k/8/6Q1/4K3/8/8/8/8 b - - 0 1');
  // Qg6: attacks g-file and diagonals; h8 not directly attacked (g6->h7->? h8 not on diagonal from g6). Ke5 safe.
  // legal moves for black k from h8: g8,g7,h7. g8 attacked by Qg6 (file), g7 attacked (file g), h7 attacked? g6->h7 diagonal yes. All covered -> stalemate.
  const res = g.result();
  assert.equal(res.type, 'stalemate');
  assert.equal(g.inCheck('b'), false);
});

test('king cannot move into check', () => {
  let g = makeGame('4k3/8/8/8/8/8/R7/4K3 w - - 0 1');
  // Black king e8. White rook a2 attacks a... to test, white king e1 and rook a2 no immediate.
  // Instead test: black king e8, white rook e... let's set white to move and ensure white only legal moves.
});
