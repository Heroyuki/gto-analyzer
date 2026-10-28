import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { SAMPLE } from '../../packages/contracts/src/spot/sample.js';
async function importData(page: Page, data: unknown) {
  await page.getByRole('button', { name: 'JSON 入出力', exact: true }).click();
  await page.getByLabel('JSON データ', { exact: true }).fill(JSON.stringify(data));
  await page.getByRole('button', { name: '取り込む', exact: true }).click();
}
test.beforeEach(async ({ page }) => { await page.goto('/'); });
test('AC02/03: inputs, capped bet and zero stack', async ({ page }) => {
  await page.getByLabel('ベット前のポット', { exact: true }).fill('10');
  await page.getByLabel('BTN 残り', { exact: true }).fill('100');
  await page.getByLabel('BB 残り', { exact: true }).fill('20');
  await page.getByRole('button', { name: '50%', exact: true }).click();
  await expect(page.getByTestId('spr')).toHaveText('2'); await expect(page.getByTestId('required-equity')).toHaveText('25%'); await expect(page.getByTestId('after-spr')).toHaveText('0.75');
  await page.getByRole('button', { name: 'All-in', exact: true }).click(); await expect(page.getByTestId('bet-amount')).toHaveText('20'); await expect(page.getByTestId('after-spr')).toHaveText('0');
  await page.getByLabel('BB 残り', { exact: true }).fill('0'); await expect(page.getByTestId('required-equity')).toHaveText('—');
});
test('AC04/09: card selection, duplicate rejection, turn/river removal and keyboard focus', async ({ page }) => {
  const turn = page.getByRole('button', { name: 'ターンを追加', exact: true });
  await expect(page.getByRole('button', { name: 'リバーを追加', exact: true })).toBeDisabled();
  await turn.click(); const dialog = page.getByRole('dialog'); await expect(dialog.getByRole('button', { name: 'A♠', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Q♣', exact: true }).click();
  await page.getByRole('button', { name: 'リバーを追加', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'K♣', exact: true }).click();
  await page.getByRole('button', { name: 'ボード 4 Qcを変更', exact: true }).click();
  await page.getByRole('button', { name: 'このストリート以降を削除', exact: true }).click(); await expect(turn).toBeVisible();
  await turn.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await expect(turn).toBeFocused();
  await expect(page.getByTestId('hand-category')).toHaveText('セカンドペア');
});
test('AC05/06/08/12: imports are local, failures preserve spot, export roundtrip and reload reset', async ({ page }) => {
  const requests: string[] = []; page.on('request', r => requests.push(r.url()));
  const data = structuredClone(SAMPLE); data.spot.pot = 10; data.strategy!.source = { kind: 'solver', label: '持込データ' };
  await importData(page, data); await expect(page.getByTestId('strategy-note')).toContainText('自己申告');
  await page.getByRole('button', { name: 'JSON 入出力', exact: true }).click();
  const exported = JSON.parse(await page.getByLabel('JSON データ', { exact: true }).inputValue()); expect(exported).toEqual(data);
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: '現在の局面を保存', exact: true }).click(); const download = await downloadPromise; expect(download.suggestedFilename()).toBe('poker-spot.json');
  for (const invalid of ['{', JSON.stringify({ ...data, schemaVersion: 2 }), JSON.stringify({ ...data, spot: { ...data.spot, hero: ['Jh', 'As'] } })]) {
    await page.getByLabel('JSON データ', { exact: true }).fill(invalid); await page.getByRole('button', { name: '取り込む', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.locator('#json-message')).not.toBeEmpty();
  }
  await page.getByRole('button', { name: '閉じる', exact: true }).click(); await expect(page.getByLabel('ベット前のポット', { exact: true })).toHaveValue('10');
  expect(requests).toEqual([]);
  await page.reload(); await expect(page.getByLabel('ベット前のポット', { exact: true })).toHaveValue('5.5'); await expect(page.getByTestId('strategy-note')).toContainText('説明用');
});
test('AC07: BB facing bet mismatch hides and excludes only BB; restored values restore strategy', async ({ page }) => {
  await page.getByRole('button', { name: 'BB', exact: true }).click(); await page.getByRole('button', { name: '50%', exact: true }).click();
  await expect(page.getByTestId('strategy-note')).toContainText('33% bet');
  await page.getByRole('button', { name: 'JSON 入出力', exact: true }).click();
  const exported = JSON.parse(await page.getByLabel('JSON データ', { exact: true }).inputValue()); expect(exported.strategy.players.BB).toBeUndefined(); expect(exported.strategy.players.BTN).toBeDefined();
  await page.getByRole('button', { name: '閉じる', exact: true }).click(); await page.getByRole('button', { name: '33%', exact: true }).click(); await expect(page.getByTestId('strategy-note')).toContainText('説明用');
  await page.getByLabel('ベット前のポット', { exact: true }).fill('6'); await expect(page.getByTestId('strategy-note')).toContainText('条件が変わりました');
  await page.getByLabel('ベット前のポット', { exact: true }).fill('5.5'); await expect(page.getByTestId('strategy-note')).toContainText('説明用');
});
for (const width of [390, 1440]) test(`AC09: ${width}px with 200% text retains inputs and dialog controls`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.addStyleTag({ content: ':root { font-size: 32px; }' });
  await expect(page.getByLabel('ベット前のポット', { exact: true })).toBeVisible();
  const board = await page.locator('.board-center').boundingBox();
  const hero = await page.locator('.player.hero').boundingBox();
  expect(board && hero && board.y + board.height <= hero.y).toBeTruthy();
  await page.screenshot({ path: `test-results/spot-${width}-200percent.png`, fullPage: true });
  await page.getByRole('button', { name: 'JSON 入出力', exact: true }).click(); await expect(page.getByRole('button', { name: '取り込む', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '閉じる', exact: true }).click(); await expect(page.getByRole('button', { name: 'JSON 入出力', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
