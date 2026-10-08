import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
export interface ReleaseManifest { schemaVersion: 1; commit: string; files: Record<string, string> }
export function sha256(data: Uint8Array): string { return createHash('sha256').update(data).digest('hex'); }
export function createManifest(directory: string, commit: string): ReleaseManifest {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('releaseには40桁のGit commit SHAを指定してください。');
  const files: Record<string, string> = {};
  const walk = (path: string) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const absolute = join(path, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) files[relative(directory, absolute).split('\\').join('/')] = sha256(readFileSync(absolute));
      else throw new Error('成果物にsymlink等を含めないでください。');
    }
  };
  walk(directory);
  if (!files['index.html'] || !Object.keys(files).some(f => f.startsWith('assets/'))) throw new Error('webビルド成果物が必要です。');
  return { schemaVersion: 1, commit, files };
}
export function verifyManifest(directory: string, input: unknown, commit: string): ReleaseManifest {
  const actual = createManifest(directory, commit);
  const expected = input as Partial<ReleaseManifest> | null;
  if (expected?.schemaVersion !== 1 || expected.commit !== commit || !expected.files || typeof expected.files !== 'object' || Array.isArray(expected.files)) throw new Error('release manifestが不正です。');
  const entries = Object.entries(expected.files);
  if (entries.length !== Object.keys(actual.files).length || entries.some(([path, hash]) => actual.files[path] !== hash)) throw new Error('release成果物のSHA-256が一致しません。');
  return actual;
}
