import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkImport, importsOf, scan } from '../check-deps.js';
test('importsOf finds static, side-effect, re-export and dynamic imports', () => {
  const source = "import { a } from './a.js';\nimport type {\n  B,\n} from '@gto-analyzer/contracts/spot';\nimport './style.css';\nexport * from '../c.js';\nconst d = await import('node:fs');";
  assert.deepEqual(importsOf(source), ['./a.js', '@gto-analyzer/contracts/spot', './style.css', '../c.js', 'node:fs']);
});
test('checkImport enforces the dependency direction in CONTRIBUTING.md', () => {
  assert.equal(checkImport('packages/domain/src/spot/index.ts', '@gto-analyzer/contracts/spot'), null);
  assert.equal(checkImport('packages/domain/tests/spot.test.ts', '../../contracts/src/spot/sample.js'), null);
  assert.equal(checkImport('apps/web/src/main.tsx', '@gto-analyzer/domain/spot'), null);
  assert.equal(checkImport('tests/acceptance/spot.test.ts', '../../packages/contracts/src/spot/sample.js'), null);
  assert.match(checkImport('packages/contracts/src/index.ts', '@gto-analyzer/domain/spot') ?? '', /他のworkspaceに依存できません/);
  assert.match(checkImport('packages/domain/src/spot/index.ts', '../../../parser/src/index.js') ?? '', /contracts/);
  assert.match(checkImport('packages/domain/src/spot/index.ts', 'react') ?? '', /UI・AWS/);
  assert.match(checkImport('packages/contracts/src/index.ts', '@aws-sdk/client-s3') ?? '', /UI・AWS/);
  assert.match(checkImport('packages/parser/src/index.ts', '../../../apps/web/src/main.js') ?? '', /packages\/から/);
  assert.match(checkImport('apps/api/src/handler.ts', '@gto-analyzer/web') ?? '', /アプリ同士/);
  assert.match(checkImport('apps/web/src/main.tsx', '../../workers/src/job.js') ?? '', /アプリ同士/);
  assert.match(checkImport('apps/web/src/main.tsx', '@gto-analyzer/infra') ?? '', /infra/);
  assert.match(checkImport('scripts/release.ts', '../legacy/poker-spot/app.js') ?? '', /legacy/);
});
test('repository has no dependency direction violations', () => {
  assert.deepEqual(scan(process.cwd()), []);
});
