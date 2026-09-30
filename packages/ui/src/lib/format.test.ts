import { describe, it, expect } from 'vitest';
import { formatCompactNumber, formatKRW } from './format';

describe('formatKRW', () => {
  it('rounds and groups won amounts', () => {
    expect(formatKRW(1234.4)).toBe('1,234원');
  });
});

describe('formatCompactNumber', () => {
  it('uses Korean compact units', () => {
    expect(formatCompactNumber(4_100_000)).toBe('410만');
    expect(formatCompactNumber(950)).toBe('950');
  });
});
