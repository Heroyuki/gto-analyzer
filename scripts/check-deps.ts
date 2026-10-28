import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
export interface Violation { file: string; specifier: string; rule: string }
const APPS = ['web', 'api', 'workers'];
const PACKAGE_DEPS: Record<string, string[]> = { contracts: [], domain: ['contracts'], parser: ['contracts', 'domain'] };
const PURE_FORBIDDEN = /^(react|react-dom|aws-cdk-lib|constructs|@aws-sdk\/.+|aws-lambda)$/;
const SCAN_DIRS = ['apps', 'packages', 'infra', 'scripts', 'tests'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'cdk.out', 'test-results', 'playwright-report']);
export function unitOf(path: string): string {
  const [top, name] = path.split('/');
  if ((top === 'apps' || top === 'packages') && name) return `${top}/${name}`;
  return top === 'infra' || top === 'scripts' || top === 'tests' || top === 'legacy' ? top : 'root';
}
function targetOf(file: string, specifier: string): string {
  if (specifier.startsWith('.')) return unitOf(posix.normalize(posix.join(posix.dirname(file), specifier)));
  const workspace = /^@gto-analyzer\/([^/]+)/.exec(specifier)?.[1];
  if (workspace) return workspace === 'infra' ? 'infra' : APPS.includes(workspace) ? `apps/${workspace}` : `packages/${workspace}`;
  return `npm:${specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]}`;
}
export function importsOf(source: string): string[] {
  const pattern = /\b(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
  return [...source.matchAll(pattern)].map(m => m[1] ?? m[2] ?? m[3] ?? '').filter(Boolean);
}
export function checkImport(file: string, specifier: string): string | null {
  const from = unitOf(file), target = targetOf(file, specifier);
  if (target === from) return null;
  if (target === 'legacy') return 'legacy/は参照用です。新規コードからimportしないでください。';
  if (from.startsWith('apps/')) {
    if (target.startsWith('apps/')) return 'アプリ同士を直接importしないでください。共通処理はpackages/へ移します。';
    if (target === 'infra' || target === 'scripts' || target === 'tests') return 'アプリからinfra・scripts・testsをimportしないでください。';
  }
  if (from.startsWith('packages/')) {
    const name = from.slice('packages/'.length), allowed = PACKAGE_DEPS[name] ?? [];
    if (target.startsWith('packages/') && !allowed.includes(target.slice('packages/'.length))) return `packages/${name}${allowed.length ? `が依存できるのは${allowed.join('・')}だけです` : 'は他のworkspaceに依存できません'}。依存方向を変える場合はCONTRIBUTING.mdとscripts/check-deps.tsを先に更新します。`;
    if (!target.startsWith('packages/') && !target.startsWith('npm:')) return 'packages/からapps・infra・scripts・testsをimportしないでください。';
    if (target.startsWith('npm:') && PURE_FORBIDDEN.test(target.slice(4))) return `packages/${name}はUI・AWSに依存させないでください。`;
  }
  return null;
}
export function scan(root: string): Violation[] {
  const violations: Violation[] = [];
  const walk = (path: string) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const absolute = join(path, entry.name);
      if (entry.isDirectory()) { if (!SKIP_DIRS.has(entry.name)) walk(absolute); continue; }
      if (!/\.(ts|tsx|mts|js|mjs)$/.test(entry.name)) continue;
      const file = relative(root, absolute).split('\\').join('/');
      for (const specifier of importsOf(readFileSync(absolute, 'utf8'))) {
        const rule = checkImport(file, specifier);
        if (rule) violations.push({ file, specifier, rule });
      }
    }
  };
  for (const dir of SCAN_DIRS) walk(join(root, dir));
  return violations;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const violations = scan(process.cwd());
  for (const v of violations) console.error(`${v.file}: '${v.specifier}' — ${v.rule}`);
  if (violations.length) { console.error(`依存方向の違反が${violations.length}件あります。`); process.exit(1); }
  console.log('依存方向の検査に成功しました。');
}
