import { test } from 'node:test';
import assert from 'node:assert';
import { Game, DEFAULT_FEN, fenOf, parseFen } from '../../engine/index.js';

function g(fen = DEFAULT_FEN) {
  return new Game(fen);
}

// --- FEN round-trip ---
test('FEN round-trip preserves position', () => {
  const g = new Game();
  const fen = g.fen();
  assert.equal(fen, DEFAULT_FEN);
  assert.equal(fenOf(parseFen(fen)), fen);
});

test('FEN import of a known midgame position', () => {
  const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
  const g = new Game(fen);
  assert.equal(g.fen(), fen);
});

// --- insufficient material ---
test('K vs K is a draw by insufficient material', () => {
  const g = new Game('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
  assert.equal(g.result().type, 'insufficient');
});
test('K+B vs K is a draw', () => {
  const g = new Game('4k3/8/8/8/8/8/4B3/4K3 w - - 0 1');
  assert.equal(g.result().type, 'insufficient');
});
test('K+R vs K is NOT insufficient', () => {
  const g = new Game('4k3/8/8/8/8/8/4R3/4K3 w - - 0 1');
  assert.notEqual(g.result().type, 'insufficient');
});

// --- threefold repetition ---
test('threefold repetition detected after shuffling knights', () => {
  let game = g();
  const moves = [
    ['b1', 'c3'], ['b8', 'c6'], ['c3', 'b1'], ['c6', 'b8'],
    ['b1', 'c3'], ['b8', 'c6'], ['c3', 'b1'], ['c6', 'b8'],
    ['b1', 'c3'], ['b8', 'c6'], ['c3', 'b1'], ['c6', 'b8'],
  ];
  for (const [a, b] of moves) assert.ok(game.move(a, b), `move ${a}-${b}`);
  assert.equal(game.result().type, 'threefold');
});

// --- 50-move rule ---
test('50-move rule triggers (halfMove clock reaches 100)', () => {
  const g2 = new Game();
  g2.setFen('4k3/8/8/8/8/8/4R3/4K3 b - - 100 1');
  assert.equal(g2.result().type, 'fifty');
});

// --- move() rejects illegal move ---
test('illegal move returns null and does not change state', () => {
  const g = new Game();
  const fen = g.fen();
  assert.equal(g.move('e2', 'e5'), null); // two squares but not from start? actually e2->e4 legal; e2->e5 illegal
  assert.equal(g.move('e2', 'e5'), null);
  assert.equal(g.fen(), fen);
});

test('cannot move opponent piece', () => {
  const g = new Game();
  assert.equal(g.move('e7', 'e5'), null); // black to move? no, white to move
});

// --- undo ---
test('undo restores prior state', () => {
  const g = new Game();
  const fen0 = g.fen();
  g.move('e2', 'e4');
  const fen1 = g.fen();
  g.undo();
  assert.equal(g.fen(), fen0);
  assert.equal(g.turn, 'w');
});

// --- en passant with the engine wrapper ---
test('engine applies en passant (moving pawn placed, captured pawn removed)', () => {
  const g = new Game('4k3/8/8/4Pp2/8/8/8/4K3 w - f6 0 1');
  const r = g.move('e5', 'f6');
  assert.ok(r);
  assert.equal(g.pieceAt('f5'), null);
  assert.equal(g.pieceAt('f6').kind, 'P');
});

// --- castling via wrapper ---
test('kingside castle applies rook relocation', () => {
  const g = new Game('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.ok(g.move('e1', 'g1'));
  assert.equal(g.pieceAt('f1').kind, 'R');
  assert.equal(g.pieceAt('h1'), null);
});
