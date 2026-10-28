import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE } from '../src/spot/sample.js';
import { validateData, parseSpotJson, fixedUnits, MAX_JSON_BYTES } from '../src/spot/index.js';
test('SPOT-001-AC05: v1 sample and JSON roundtrip', () => {
  assert.deepEqual(parseSpotJson(JSON.stringify(SAMPLE)), SAMPLE);
  const data = structuredClone(SAMPLE); delete data.strategy; assert.deepEqual(validateData(data), data);
});
test('SPOT-001-AC06: invalid data rejected without altering input', () => {
  for (const change of [
    (d: typeof SAMPLE) => { d.spot.board[0] = 'As'; },
    (d: typeof SAMPLE) => { d.spot.pot = 0; },
    (d: typeof SAMPLE) => { d.spot.stacks.BB = -1; },
    (d: typeof SAMPLE) => { d.spot.pot = 1.0001; },
    (d: typeof SAMPLE) => { d.spot.betPercent = 33.001; },
    (d: typeof SAMPLE) => { d.strategy!.players.BTN!.actions[0]!.frequency = 18; },
    (d: typeof SAMPLE) => { d.strategy!.players.BB!.facingBetPercent = Infinity; },
  ]) { const data = structuredClone(SAMPLE); change(data); const before = structuredClone(data); assert.throws(() => validateData(data)); assert.deepEqual(data, before); }
  for (const input of [null, [], { ...SAMPLE, schemaVersion: 2 }, { ...SAMPLE, strategy: null }]) assert.throws(() => validateData(input));
  assert.throws(() => parseSpotJson('{'), /構文/);
});
test('UTF-8 size is measured in bytes for pasted JSON', () => {
  const large = JSON.stringify({ ...SAMPLE, padding: 'あ'.repeat(MAX_JSON_BYTES / 2) });
  assert.ok(large.length < MAX_JSON_BYTES); assert.throws(() => parseSpotJson(large), /1 MiB/);
});
test('fixed units reject excess decimal places and handle scientific notation', () => {
  assert.equal(fixedUnits(97.5, 3, 'bb'), 97500); assert.equal(fixedUnits(0.001, 3, 'bb'), 1);
  assert.equal(fixedUnits(100000000, 2, '%'), 10000000000);
  assert.throws(() => fixedUnits(0.0000001, 3, 'bb')); assert.throws(() => fixedUnits(NaN, 3, 'bb')); assert.throws(() => fixedUnits(-1, 3, 'bb'));
});
