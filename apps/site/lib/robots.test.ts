import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import { WELCOMED_CRAWLERS } from './crawlers';

describe('robots', () => {
  beforeEach(() => {
    delete process.env.PRELAUNCH_PASSWORD;
  });
  afterEach(() => {
    delete process.env.PRELAUNCH_PASSWORD;
  });

  it('shuts every crawler out while the pre-launch lock is on', () => {
    process.env.PRELAUNCH_PASSWORD = 'locked';
    expect(robots()).toEqual({ rules: [{ userAgent: '*', disallow: '/' }] });
  });

  it('welcomes search, answer and training crawlers by name once open', () => {
    const result = robots();
    expect(result.rules).toEqual([
      { userAgent: '*', allow: '/' },
      { userAgent: WELCOMED_CRAWLERS, allow: '/' },
    ]);
    expect(String(result.sitemap)).toMatch(/\/sitemap\.xml$/);
    for (const bot of ['Yeti', 'GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended']) {
      expect(WELCOMED_CRAWLERS).toContain(bot);
    }
  });
});
