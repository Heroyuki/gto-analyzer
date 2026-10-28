export const RANKS = 'AKQJT98765432'.split('');
export const SUITS = {
  s: { symbol: '♠', className: 'spades' }, h: { symbol: '♥', className: 'hearts' },
  d: { symbol: '♦', className: 'diamonds' }, c: { symbol: '♣', className: 'clubs' },
} as const;
export type Suit = keyof typeof SUITS;
export type Card = `${string}${Suit}`;
export type Position = 'BTN' | 'BB';
export type ActionType = 'check' | 'call' | 'bet' | 'raise' | 'fold';
export const COLORS: Record<ActionType, string> = { check: '#64bda2', call: '#64bda2', bet: '#d39860', raise: '#bd6e63', fold: '#719db8' };
export interface Spot { board: Card[]; hero: Card[]; pot: number; stacks: Record<Position, number>; betPercent: number }
export interface StrategyAction { id: string; label: string; type: ActionType; frequency: number }
export interface PlayerStrategy { node: string; actions: StrategyAction[]; hands: Record<string, { frequencies: number[] }>; facingBetPercent?: number }
export interface Strategy { source: { kind: 'demo' | 'solver'; label: string }; players: Partial<Record<Position, PlayerStrategy>> }
export interface SpotData { schemaVersion: 1; spot: Spot; strategy?: Strategy }
export const MAX_JSON_BYTES = 1024 * 1024;

function requireValue(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function object(value: unknown, name: string): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), `${name}はオブジェクトで指定してください。`);
  return value as Record<string, unknown>;
}
function number(value: unknown, name: string, min = 0, max = 100000): number {
  requireValue(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max, `${name}は${min}〜${max}の数値で指定してください。`);
  return value;
}
/** Validate decimal precision without rounding the caller's input. */
export function fixedUnits(value: number, digits: number, name: string): number {
  requireValue(Number.isFinite(value) && value >= 0, `${name}は非負の有限数で指定してください。`);
  const [mantissa = '', exponent = '0'] = String(value).toLowerCase().split('e');
  const [whole = '', fraction = ''] = mantissa.split('.');
  const shift = digits + Number(exponent) - fraction.length;
  let raw = (whole + fraction).replace(/^0+(?=\d)/, '');
  if (shift < 0) {
    requireValue(-shift <= raw.length && /^0*$/.test(raw.slice(shift)), `${name}は小数${digits}桁までです。`);
    raw = raw.slice(0, shift) || '0';
  } else {
    requireValue(shift <= 16, `${name}が大きすぎます。`);
    raw += '0'.repeat(shift);
  }
  const result = Number(raw);
  requireValue(Number.isSafeInteger(result), `${name}が大きすぎます。`);
  return result;
}
function decimal(value: unknown, name: string, digits: number, min = 0, max = 100000) {
  const result = number(value, name, min, max); fixedUnits(result, digits, name); return result;
}
function string(value: unknown, name: string, max = 120): string {
  requireValue(typeof value === 'string' && value.trim().length > 0 && value.length <= max, `${name}は1〜${max}文字で指定してください。`); return value;
}
export function handName(i: number, j: number): string {
  const a = RANKS[i], b = RANKS[j];
  requireValue(a && b, 'ハンド分類が範囲外です。');
  return i === j ? a + b : i < j ? a + b + 's' : b + a + 'o';
}
function cards(value: unknown, name: string, min: number, max: number): Card[] {
  requireValue(Array.isArray(value) && value.length >= min && value.length <= max, `${name}は${min === max ? min : `${min}〜${max}`}枚です。`);
  return value.map((c: unknown) => { requireValue(typeof c === 'string' && /^[AKQJT2-9][shdc]$/.test(c), 'カードはJh / 8d / Asの形式で指定してください。'); return c as Card; });
}
function frequencies(value: unknown, length: number, name: string): number[] {
  requireValue(Array.isArray(value) && value.length === length, `${name}はactionsと同じ順序・件数にしてください。`);
  const values = value.map((v: unknown) => decimal(v, name, 2, 0, 100));
  requireValue(values.reduce((sum, v) => sum + fixedUnits(v, 2, name), 0) === 10000, `${name}は合計100にしてください。`); return values;
}
export function validateData(input: unknown): SpotData {
  const data = object(input, 'JSON'); requireValue(data.schemaVersion === 1, 'schemaVersion: 1 のJSONを指定してください。');
  const s = object(data.spot, 'spot'), stacks = object(s.stacks, 'stacks');
  const board = cards(s.board, 'board', 3, 5), hero = cards(s.hero, 'hero', 2, 2);
  requireValue(new Set([...board, ...hero]).size === board.length + hero.length, '同じカードが重複しています。');
  const spot: Spot = { board, hero, pot: decimal(s.pot, 'pot', 3, 0.1), stacks: { BTN: decimal(stacks.BTN, 'BTN stack', 3), BB: decimal(stacks.BB, 'BB stack', 3) }, betPercent: decimal(s.betPercent ?? 33, 'betPercent', 2, 0, 100000000) };
  if (data.strategy === undefined) return { schemaVersion: 1, spot };
  const st = object(data.strategy, 'strategy'), source = object(st.source, 'source');
  requireValue(source.kind === 'demo' || source.kind === 'solver', 'source.kindはdemo または solverです。');
  const strategy: Strategy = { source: { kind: source.kind, label: string(source.label, 'source.label') }, players: {} };
  const players = object(st.players, 'strategy.players');
  const legalHands = new Set(RANKS.flatMap((_, i) => RANKS.map((_, j) => handName(i, j))));
  for (const position of ['BTN', 'BB'] as const) {
    if (players[position] === undefined) continue;
    const p = object(players[position], position);
    requireValue(Array.isArray(p.actions) && p.actions.length >= 1 && p.actions.length <= 8, `${position}.actionsは1〜8件です。`);
    const actions = p.actions.map((value: unknown): StrategyAction => {
      const a = object(value, 'action'); requireValue(typeof a.type === 'string' && Object.hasOwn(COLORS, a.type), 'action.typeはcheck / call / bet / raise / foldです。');
      return { id: string(a.id, 'action.id', 30), label: string(a.label, 'action.label', 60), type: a.type as ActionType, frequency: decimal(a.frequency, 'frequency', 2, 0, 100) };
    });
    requireValue(new Set(actions.map(a => a.id)).size === actions.length, 'action.idが重複しています。');
    frequencies(actions.map(a => a.frequency), actions.length, 'actionsのfrequency');
    const player: PlayerStrategy = { node: string(p.node, 'node'), actions, hands: {} };
    if (position === 'BB') player.facingBetPercent = decimal(p.facingBetPercent, 'BB.facingBetPercent', 2, 0, 100000000);
    for (const [hand, value] of Object.entries(p.hands === undefined ? {} : object(p.hands, 'hands'))) {
      requireValue(legalHands.has(hand), `ハンド分類が不正です：${hand}`);
      const h = object(value, hand); player.hands[hand] = { frequencies: frequencies(h.frequencies, actions.length, `${hand}.frequencies`) };
    }
    strategy.players[position] = player;
  }
  requireValue(Object.keys(strategy.players).length > 0, 'BTNまたはBBの戦略が必要です。');
  return { schemaVersion: 1, spot, strategy };
}
export function parseSpotJson(text: string): SpotData {
  requireValue(new TextEncoder().encode(text).byteLength <= MAX_JSON_BYTES, 'JSONはUTF-8で1 MiB以内にしてください。');
  let data: unknown; try { data = JSON.parse(text); } catch { throw new Error('JSONの構文を確認してください。'); }
  return validateData(data);
}
