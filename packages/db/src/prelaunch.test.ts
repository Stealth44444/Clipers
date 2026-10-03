import { describe, expect, it } from 'vitest';
import { prelaunchGate } from './prelaunch';

const basic = (user: string, password: string) => `Basic ${btoa(String.fromCharCode(...new TextEncoder().encode(`${user}:${password}`)))}`;

describe('prelaunchGate', () => {
  it('lets everything through when no password is set', () => {
    expect(prelaunchGate('/', null, undefined)).toBeNull();
    expect(prelaunchGate('/', null, '')).toBeNull();
  });

  it('asks for the password with a 401 and Basic challenge', async () => {
    const response = prelaunchGate('/brands', null, 'secret');
    expect(response?.status).toBe(401);
    expect(response?.headers.get('WWW-Authenticate')).toMatch(/^Basic realm=/);
    expect(response?.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(await response?.text()).toContain('비밀번호');
  });

  it('accepts the password with any user name', () => {
    expect(prelaunchGate('/', basic('anyone', 'secret'), 'secret')).toBeNull();
    expect(prelaunchGate('/', basic('', 'secret'), 'secret')).toBeNull();
  });

  it('accepts a password with colons and non-ASCII characters', () => {
    expect(prelaunchGate('/', basic('team', 'a:b:클리퍼스'), 'a:b:클리퍼스')).toBeNull();
  });

  it('refuses a wrong password, a bearer token and a malformed header', () => {
    expect(prelaunchGate('/', basic('team', 'secre'), 'secret')?.status).toBe(401);
    expect(prelaunchGate('/', basic('team', 'secrets'), 'secret')?.status).toBe(401);
    expect(prelaunchGate('/', 'Bearer secret', 'secret')?.status).toBe(401);
    expect(prelaunchGate('/', 'Basic !!!not-base64', 'secret')?.status).toBe(401);
    expect(prelaunchGate('/', `Basic ${btoa('no-colon')}`, 'no-colon')?.status).toBe(401);
  });

  it('leaves cron routes and robots.txt open', () => {
    expect(prelaunchGate('/api/cron/youtube-views', 'Bearer cron-secret', 'secret')).toBeNull();
    expect(prelaunchGate('/robots.txt', null, 'secret')).toBeNull();
    expect(prelaunchGate('/api/cronjob', null, 'secret')?.status).toBe(401);
    expect(prelaunchGate('/robots.txt.bak', null, 'secret')?.status).toBe(401);
  });

  it('leaves only the email logo open among public files', () => {
    expect(prelaunchGate('/logo/clipers-wordmark-email.png', null, 'secret')).toBeNull();
    expect(prelaunchGate('/logo/clipers-wordmark-email-dark.png', null, 'secret')).toBeNull();
    expect(prelaunchGate('/logo/clipers-wordmark.svg', null, 'secret')?.status).toBe(401);
    expect(prelaunchGate('/logo/clipers-wordmark-email.png/x', null, 'secret')?.status).toBe(401);
  });
});
