import assert from 'node:assert/strict';
const [url, bucket, expectedStatus = '200'] = process.argv.slice(2);
if (!url || !bucket || !/^https:\/\/[a-z0-9.-]+\.cloudfront\.net\/?$/.test(url) || !/^[a-z0-9.-]+$/.test(bucket) || !['200', '403'].includes(expectedStatus)) throw new Error('Usage: npm run smoke:aws -- https://<domain>.cloudfront.net <bucket> [200|403]');
const index = await fetch(url); assert.equal(index.status, Number(expectedStatus));
if (expectedStatus === '200') {
  const html = await index.text(); assert.match(html, /Poker Spot Visualizer/);
  const paths = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(m => m[1]); assert.ok(paths.length >= 2);
  for (const path of paths) { const asset: Response = await fetch(new URL(path!, url)); assert.equal(asset.status, 200); assert.ok((await asset.arrayBuffer()).byteLength > 0); }
  const missing = await fetch(new URL('/assets/does-not-exist.js', url)); assert.ok([403, 404].includes(missing.status));
} else {
  for (const path of ['/index.html', '/assets/does-not-exist.js']) assert.equal((await fetch(new URL(path, url))).status, 403);
}
assert.equal((await fetch(`https://${bucket}.s3.ap-northeast-1.amazonaws.com/index.html`)).status, 403);
console.log('CloudFront response and direct S3 denial verified.');
