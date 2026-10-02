import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

// Turbo's strict env mode hands a build only the variables listed in turbo.json. On 2026-10-02 PRELAUNCH_PASSWORD
// was dropped that way and robots.txt opened under the lock. Every server variable either app reads must be listed.

const repo = path.resolve(__dirname, '../../..');
const SKIP_DIRS = new Set(['node_modules', '.next', '.turbo', '.vercel']);
const FRAMEWORK = /^(NEXT_PUBLIC_|NODE_ENV$|VERCEL)/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP_DIRS.has(name)) return [];
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|mjs)$/.test(name) && !name.endsWith('.test.ts') ? [full] : [];
  });
}

it('lists every server env var the apps read in the turbo build env', () => {
  const turbo = JSON.parse(readFileSync(path.join(repo, 'turbo.json'), 'utf8'));
  const declared = new Set<string>(turbo.tasks.build.env ?? []);
  const read = new Set(
    ['apps/site', 'apps/app'].flatMap((app) =>
      sourceFiles(path.join(repo, app)).flatMap((file) =>
        [...readFileSync(file, 'utf8').matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((match) => match[1])
      )
    )
  );
  const missing = [...read].filter((name) => !FRAMEWORK.test(name) && !declared.has(name)).sort();
  expect(missing).toEqual([]);
});
