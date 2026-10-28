import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
const { values } = parseArgs({ options: {
  url: { type: 'string', default: 'http://127.0.0.1:5173/' },
  width: { type: 'string', default: '1440' },
  out: { type: 'string', default: 'test-results/inspect' },
} });
const url = values.url, width = Number(values.width), out = values.out;
if (!Number.isInteger(width) || width < 320) throw new Error('--widthは320以上の整数で指定してください。');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const consoleErrors: string[] = [], pageErrors: string[] = [], failedRequests: string[] = [], externalRequests: string[] = [];
  const origin = new URL(url).origin;
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('requestfailed', r => failedRequests.push(`${r.url()} ${r.failure()?.errorText ?? ''}`.trim()));
  page.on('request', r => { const u = new URL(r.url()); if (u.protocol.startsWith('http') && u.origin !== origin) externalRequests.push(r.url()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  const screenshot = join(out, `page-${width}.png`), aria = join(out, `aria-${width}.yml`);
  await page.screenshot({ path: screenshot, fullPage: true });
  writeFileSync(aria, await page.locator('body').ariaSnapshot());
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const report = { url, width, title: await page.title(), screenshot, aria, horizontalOverflow, consoleErrors, pageErrors, failedRequests, externalRequests };
  console.log(JSON.stringify(report, null, 2));
  if (consoleErrors.length || pageErrors.length || failedRequests.length || externalRequests.length || horizontalOverflow) process.exitCode = 1;
} finally { await browser.close(); }
