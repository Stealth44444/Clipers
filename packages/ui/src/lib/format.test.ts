import { describe, it, expect } from 'vitest';
import { formatCompactNumber, formatKRW, greetingFor } from './format';

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

describe('greetingFor', () => {
  it('greets by the hour in Korea', () => {
    expect(greetingFor(new Date('2026-10-01T00:00:00Z'))).toBe('좋은 아침이에요'); // 09:00 KST
    expect(greetingFor(new Date('2026-10-01T05:00:00Z'))).toBe('좋은 오후예요'); // 14:00 KST
    expect(greetingFor(new Date('2026-10-01T10:00:00Z'))).toBe('좋은 저녁이에요'); // 19:00 KST
    expect(greetingFor(new Date('2026-10-01T15:00:00Z'))).toBe('편안한 밤이에요'); // 00:00 KST
  });
});
