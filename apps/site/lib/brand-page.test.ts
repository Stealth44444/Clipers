import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICING } from '@clipers/db';
import { formatKRW } from '@clipers/ui';

// The brand page and its components must never state the brand rate (spec §2).

const root = path.resolve(__dirname, '..');
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
const sources = [
  path.join(root, 'app/brands/page.tsx'),
  ...files(path.join(root, 'components/brand')),
  path.join(root, 'lib/brand-demos.ts'),
  path.join(root, 'lib/brand-cases.ts'),
  path.join(root, 'lib/views-math.ts'),
  path.join(root, 'lib/horizon-shader.ts'),
];

describe('brand page sources', () => {
  it('exist', () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it.each(sources)('%s never states the brand rate', (file) => {
    const text = readFileSync(file, 'utf8');
    expect(text).not.toContain('brandCpm');
    // The data section quotes the sponsor basis ("1천 회당 2만 원"); only our own rate is off limits.
    expect(text).not.toContain(`1천 회당 ${formatKRW(DEFAULT_PRICING.brandCpm)}`);
    expect(text).not.toContain(formatKRW(DEFAULT_PRICING.brandCpm));
  });

  it('uses the new sections', () => {
    const page = readFileSync(path.join(root, 'app/brands/page.tsx'), 'utf8');
    for (const name of ['HorizonHero', 'ViewsStory', 'CompareTable', 'SolutionCards', 'UseCases', 'ControlsBento', 'VerifyFlow', 'StartCard', 'ADVERTISER_FAQ']) {
      expect(page).toContain(name);
    }
  });
});
