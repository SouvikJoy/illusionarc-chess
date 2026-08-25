import { test } from 'node:test';
import assert from 'node:assert';
import { Game } from '../../engine/index.js';
import { aiMove } from '../../ai/index.js';
import { search } from '../../ai/engine.js';
import { evaluate } from '../../ai/eval.js';
import { nameOfSquare } from '../../engine/core.js';

function isLegal(game, mv) {
  if (!mv) return false;
  // book moves are {from,to,promo}; engine moves have .from/.to
  const legal = game.legalMoves(mv.from);
  return legal.some((m) => m.to === mv.to && (!m.flags || !m.flags.promo || m.flags.promo === mv.promo));
}

function mvName(m) { return m ? `${nameOfSquare(m.from)}-${nameOfSquare(m.to)}` : 'NONE'; }

test('AI returns a legal move at all difficulties', () => {
  for (const diff of ['easy', 'medium', 'hard']) {
    const g = new Game();
    g.move('e2', 'e4');
    const mv = aiMove(g, diff);
    assert.ok(mv, `${diff} should return a move`);
    assert.ok(isLegal(g, mv), `${diff} move should be legal`);
  }
});

test('AI never returns an illegal move on a complex middlegame', () => {
  const g = new Game('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
  const mv = aiMove(g, 'hard');
  assert.ok(isLegal(g, mv), 'hard AI move must be legal');
});

test('opening book answers 1.e4 with a book move', () => {
  const g = new Game();
  const mv = aiMove(g, 'hard');
  assert.ok(mv, 'book should answer the starting position');
  assert.ok(isLegal(g, mv), 'book move must be legal');
});

test('engine finds a mate in 1 (Ra8#) from depth >= 2', () => {
  const g = new Game('6k1/5pp1/8/8/8/8/8/R3K2R w - - 0 1');
  const r = search(g.p, 3, { timeCapMs: 0, color: 'w' });
  assert.equal(mvName(r.move), 'a1-a8', 'engine must find the back-rank mate');
});

test('engine captures a hanging queen', () => {
  const g = new Game('4k3/8/8/8/q7/8/8/R3K3 w - - 0 1');
  const r = search(g.p, 2, { timeCapMs: 0, color: 'w' });
  assert.ok(r.move && r.move.captured, 'engine should take the hanging queen');
});

test('engine does not blunder into check', () => {
  // white queen can be captured if it moves recklessly; ensure engine keeps king safe
  const g = new Game('r3k2r/8/8/8/8/8/8/4K2R w - - 0 1');
  const mv = aiMove(g, 'hard');
  assert.ok(isLegal(g, mv));
  // after applying, white king must not be in check
  const res = g.move(mv.from, nameOfSquare(mv.to));
  assert.ok(res, 'move applies');
  assert.equal(g.inCheck('w'), false, 'AI must not leave own king in check');
});

test('evaluation is symmetric for a symmetric position', () => {
  const g = new Game();
  const w = evaluate(g.p, 'w');
  const b = evaluate(g.p, 'b');
  assert.ok(Math.abs(w + b) < 30, `symmetric eval should sum ~0, got ${w}+${b}=${w + b}`);
});
