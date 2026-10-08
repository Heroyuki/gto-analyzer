import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE } from '../../contracts/src/spot/sample.js';
import { calculate, allInPercent, describeHand, exportData, signature, strategyState } from '../src/spot/index.js';
test('SPOT-001-AC02/03: integer calculations, capped all-in and zero stack', () => {
  const spot = { ...SAMPLE.spot, pot: 10, stacks: { BTN: 100, BB: 20 }, betPercent: 50 };
  const c = calculate(spot); assert.equal(c.effective, 20); assert.equal(c.spr, 2); assert.equal(c.bet, 5); assert.equal(c.equity, 25); assert.equal(c.afterSpr, 0.75);
  assert.equal(calculate({ ...spot, betPercent: 1000 }).bet, 20);
  assert.equal(calculate({ ...spot, betPercent: 1000 }).afterSpr, 0);
  const zero = calculate({ ...spot, stacks: { BTN: 0, BB: 20 } }); assert.equal(zero.bet, 0); assert.equal(zero.equity, 0); assert.ok(Object.values(zero).every(v => typeof v !== 'number' || Number.isFinite(v)));
});
test('decimal conservation and tiny bets use explicit truncation', () => {
  const spot = { ...SAMPLE.spot, pot: 0.1, stacks: { BTN: 0.003, BB: 10 }, betPercent: 0.01 };
  assert.equal(calculate(spot).bet, 0);
  assert.equal(calculate({ ...spot, betPercent: 3 }).bet, 0.003);
  const s = { ...spot, pot: 3, stacks: { BTN: 1, BB: 2 } }; assert.equal(allInPercent(s), 33.34); assert.equal(calculate({ ...s, betPercent: allInPercent(s) }).bet, 1);
  assert.equal(calculate(SAMPLE.spot).bet, 1.815);
  assert.equal(calculate({ ...spot, pot: 100000, betPercent: 100000000 }).bet, 0.003);
});
test('SPOT-001-AC07: stale strategies are excluded per player and return with original conditions', () => {
  const data = structuredClone(SAMPLE), bound = signature(data.spot);
  data.spot.betPercent = 50;
  assert.ok(strategyState(data, bound, 'BTN').player); assert.ok(strategyState(data, bound, 'BB').reason);
  assert.ok(exportData(data, bound).strategy?.players.BTN); assert.equal(exportData(data, bound).strategy?.players.BB, undefined);
  data.spot.betPercent = 33; assert.ok(strategyState(data, bound, 'BB').player);
  data.spot.hero = ['Ac', '8s']; assert.ok(strategyState(data, bound, 'BTN').player);
  data.spot.pot = 6; assert.equal(exportData(data, bound).strategy, undefined);
  data.spot.pot = 5.5; assert.ok(exportData(data, bound).strategy);
});
test('card categories include wheel, double trips, flush and pocket pairs', () => {
  assert.equal(describeHand(['As', '8s'], ['Jh', '8d', '5h']), 'セカンドペア');
  assert.equal(describeHand(['As', 'Ah'], ['Ac', 'Kh', 'Ks', 'Kd', '2s']), 'フルハウス');
  assert.equal(describeHand(['As', '2s'], ['3s', '4s', '5s']), 'ストレートフラッシュ');
  assert.equal(describeHand(['As', 'Ah'], ['Jh', '8d', '5h']), 'オーバーペア');
});
