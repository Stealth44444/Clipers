import { describe, it, expect } from 'vitest';
import { avatarGradient, initials } from './avatar';

describe('initials', () => {
  it('uses the first letters of the first two words', () => {
    expect(initials('Grace Hopper')).toBe('GH');
  });

  it('uses the first two characters of a single latin word', () => {
    expect(initials('a31713080')).toBe('A3');
  });

  it('uses only the first syllable for Hangul names', () => {
    expect(initials('홍길동')).toBe('홍');
  });

  it('falls back to a question mark for blank names', () => {
    expect(initials('   ')).toBe('?');
  });
});

describe('avatarGradient', () => {
  it('is deterministic for the same seed', () => {
    expect(avatarGradient('user-1')).toBe(avatarGradient('user-1'));
  });

  it('returns a CSS linear-gradient', () => {
    expect(avatarGradient('user-1')).toMatch(/^linear-gradient\(135deg, #[0-9a-f]{6}, #[0-9a-f]{6}\)$/);
  });
});
