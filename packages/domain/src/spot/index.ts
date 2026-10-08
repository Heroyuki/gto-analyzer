import { fixedUnits } from '@gto-analyzer/contracts/spot';
import type { Spot, SpotData, Position, PlayerStrategy } from '@gto-analyzer/contracts/spot';
export function calculate(spot: Spot) {
  const pot = BigInt(fixedUnits(spot.pot, 3, 'pot'));
  const effective = BigInt(Math.min(fixedUnits(spot.stacks.BTN, 3, 'BTN stack'), fixedUnits(spot.stacks.BB, 3, 'BB stack')));
  const percent = BigInt(fixedUnits(spot.betPercent, 2, 'betPercent'));
  if (pot <= 0n) throw new Error('potは正の数で指定してください。');
  const requestedNumerator = pot * percent;
  // Round a requested bet down to the nearest 0.001 bb before capping.
  const requested = requestedNumerator / 10000n;
  const bet = requested < effective ? requested : effective;
  const afterPot = pot + bet * 2n;
  return { effective: Number(effective) / 1000, spr: Number(effective) / Number(pot), requestedBet: Number(requestedNumerator) / 10000000,
    bet: Number(bet) / 1000, afterPot: Number(afterPot) / 1000, afterSpr: Number(effective - bet) / Number(afterPot), equity: Number(bet) / Number(afterPot) * 100,
    capped: requestedNumerator > effective * 10000n, allIn: effective > 0n && bet === effective };
}
export function allInPercent(spot: Spot): number {
  const pot = BigInt(fixedUnits(spot.pot, 3, 'pot'));
  const effective = BigInt(Math.min(fixedUnits(spot.stacks.BTN, 3, 'BTN stack'), fixedUnits(spot.stacks.BB, 3, 'BB stack')));
  return Number((effective * 10000n + pot - 1n) / pot) / 100;
}
export function signature(spot: Spot): string { return JSON.stringify([spot.board, spot.pot, spot.stacks.BTN, spot.stacks.BB]); }
export function strategyState(data: SpotData, boundSignature: string, position: Position): { player?: PlayerStrategy; reason?: string } {
  if (!data.strategy) return { reason: '戦略データがありません。JSONから取り込むと、アクション頻度を表示できます。' };
  if (signature(data.spot) !== boundSignature) return { reason: '局面の条件が変わりました。戦略の表示を保留しています。対応する結果を取り込んでください。' };
  const player = data.strategy.players[position];
  if (!player) return { reason: `${position}の戦略データがありません。` };
  if (position === 'BB' && player.facingBetPercent !== data.spot.betPercent) return { reason: `このBBの結果はBTN ${player.facingBetPercent}% betに対するものです。ベットサイズを戻すか、対応する結果を取り込んでください。` };
  return { player };
}
export function exportData(data: SpotData, boundSignature: string): SpotData {
  const out: SpotData = { schemaVersion: 1, spot: structuredClone(data.spot) };
  if (data.strategy && signature(data.spot) === boundSignature) {
    const players: NonNullable<SpotData['strategy']>['players'] = {};
    for (const position of ['BTN', 'BB'] as const) {
      const { player } = strategyState(data, boundSignature, position); if (player) players[position] = structuredClone(player);
    }
    if (Object.keys(players).length) out.strategy = { source: structuredClone(data.strategy.source), players };
  }
  return out;
}
export function describeHand(hero: Spot['hero'], board: Spot['board']): string {
  const rank = (c: string) => '23456789TJQKA'.indexOf(c[0] ?? '') + 2;
  const all = [...hero, ...board], ranks = all.map(rank), counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.values()].sort((a, b) => b - a);
  const flushSuit = ['s', 'h', 'd', 'c'].find(s => all.filter(c => c[1] === s).length >= 5);
  const straight = (nums: number[]) => {
    const sorted = [...new Set(nums)].sort((a, b) => a - b); if (sorted.includes(14)) sorted.unshift(1);
    let run = 1; for (let i = 1; i < sorted.length; i++) { run = sorted[i] === (sorted[i - 1] ?? 0) + 1 ? run + 1 : 1; if (run >= 5) return true; } return false;
  };
  if (flushSuit && straight(all.filter(c => c[1] === flushSuit).map(rank))) return 'ストレートフラッシュ';
  if (groups[0] === 4) return 'フォーカード';
  if (groups[0] === 3 && (groups[1] ?? 0) >= 2) return 'フルハウス';
  if (flushSuit) return 'フラッシュ'; if (straight(ranks)) return 'ストレート';
  if (groups[0] === 3) return 'スリーカード'; if (groups[0] === 2 && groups[1] === 2) return 'ツーペア';
  if (groups[0] === 2) {
    const br = board.map(rank).sort((a, b) => b - a);
    if (hero[0]?.[0] === hero[1]?.[0]) return (ranks[0] ?? 0) > (br[0] ?? 0) ? 'オーバーペア' : 'ポケットペア';
    if (new Set(br).size === br.length) {
      const pair = [...counts.entries()].find(([, count]) => count === 2)?.[0] ?? 0, n = br.indexOf(pair);
      if (n === 0) return 'トップペア'; if (n === 1) return 'セカンドペア'; if (n === br.length - 1) return 'ボトムペア';
    }
    return 'ワンペア';
  }
  return 'ハイカード';
}
