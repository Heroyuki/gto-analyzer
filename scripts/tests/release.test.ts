import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createManifest, verifyManifest } from '../release.js';
test('AC11: release manifests identify the commit and reject modified or missing assets', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gto-release-test-')), sha = 'a'.repeat(40);
  try {
    mkdirSync(join(dir, 'assets')); writeFileSync(join(dir, 'index.html'), '<script src="/assets/app-hash.js"></script>'); writeFileSync(join(dir, 'assets/app-hash.js'), 'console.log(1)');
    const manifest = createManifest(dir, sha); assert.deepEqual(verifyManifest(dir, manifest, sha), manifest);
    assert.throws(() => verifyManifest(dir, manifest, 'b'.repeat(40))); assert.throws(() => createManifest(dir, 'main'));
    writeFileSync(join(dir, 'assets/app-hash.js'), 'console.log(2)'); assert.throws(() => verifyManifest(dir, manifest, sha), /SHA-256/);
    rmSync(join(dir, 'assets/app-hash.js')); assert.throws(() => verifyManifest(dir, manifest, sha));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
