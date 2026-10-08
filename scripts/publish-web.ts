import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createManifest, verifyManifest } from './release.js';
// No shell interpolation: all AWS arguments are passed as separate argv items.
const args = process.argv.slice(2);
function option(name: string) { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; }
const outputsPath = option('--outputs'), release = option('--release'), profile = option('--profile');
if (!outputsPath || !release || !/^[a-f0-9]{40}$/.test(release)) throw new Error('Usage: npm run deploy:web -- --outputs infra/cdk-outputs.json --release <40-char SHA> [--profile default] [--rollback]');
const outputs = JSON.parse(readFileSync(resolve(outputsPath), 'utf8')) as Record<string, { BucketName?: string; DistributionId?: string }>;
const stack = outputs.GtoAnalyzerSpotDev;
if (!stack?.BucketName || !stack.DistributionId || !/^[a-z0-9.-]+$/.test(stack.BucketName) || !/^[A-Z0-9]+$/.test(stack.DistributionId)) throw new Error('CDK outputsが不正です。');
const bucket = stack.BucketName;
const aws = (...argv: string[]) => execFileSync('aws', [...argv, '--region', 'ap-northeast-1', ...(profile ? ['--profile', profile] : [])], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const temp = mkdtempSync(join(tmpdir(), 'gto-web-release-'));
try {
  let directory = resolve('apps/web/dist');
  const archive = `s3://${bucket}/releases/${release}`;
  if (args.includes('--rollback')) {
    directory = join(temp, 'dist');
    aws('s3', 'cp', `${archive}/dist/`, directory, '--recursive', '--only-show-errors');
    aws('s3', 'cp', `${archive}/manifest.json`, join(temp, 'manifest.json'), '--only-show-errors');
    verifyManifest(directory, JSON.parse(readFileSync(join(temp, 'manifest.json'), 'utf8')), release);
  } else {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (commit !== release || execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()) throw new Error('配信は指定SHAのclean checkoutから行ってください。');
    const manifest = createManifest(directory, release);
    writeFileSync(join(temp, 'manifest.json'), JSON.stringify(manifest, null, 2));
    // Refuse reuse of a release prefix, including a partially uploaded release.
    const listing = JSON.parse(aws('s3api', 'list-objects-v2', '--bucket', bucket, '--prefix', `releases/${release}/`, '--max-keys', '1')) as { KeyCount?: number };
    if (listing.KeyCount) throw new Error('releaseは既に存在します。再配信は--rollbackを指定してください。');
    aws('s3', 'cp', `${directory}/`, `${archive}/dist/`, '--recursive', '--only-show-errors');
    aws('s3', 'cp', join(temp, 'manifest.json'), `${archive}/manifest.json`, '--content-type', 'application/json', '--only-show-errors');
  }
  // Hashed assets first, HTML last. Keep old assets for active tabs and rollback.
  aws('s3', 'cp', `${directory}/assets/`, `s3://${bucket}/assets/`, '--recursive', '--cache-control', 'public,max-age=31536000,immutable', '--only-show-errors');
  aws('s3', 'cp', join(directory, 'index.html'), `s3://${bucket}/index.html`, '--content-type', 'text/html; charset=utf-8', '--cache-control', 'public,max-age=0,s-maxage=60,must-revalidate', '--only-show-errors');
  const invalidation = JSON.parse(aws('cloudfront', 'create-invalidation', '--distribution-id', stack.DistributionId, '--paths', '/', '/index.html')) as { Invalidation: { Id: string } };
  aws('cloudfront', 'wait', 'invalidation-completed', '--distribution-id', stack.DistributionId, '--id', invalidation.Invalidation.Id);
  console.log(`Published release ${release}. Run AWS smoke and browser checks.`);
} finally { rmSync(temp, { recursive: true, force: true }); }
