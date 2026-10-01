import { describe, it, expect } from 'vitest';
import { formatCompactKRW, formatCompactNumber, formatKRW, greetingFor, relativeTimeKo } from './format';

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

describe('formatCompactKRW', () => {
  it('abbreviates won amounts with Korean units', () => {
    expect(formatCompactKRW(1_500_000)).toBe('150만원');
    expect(formatCompactKRW(950)).toBe('950원');
  });
});

describe('relativeTimeKo', () => {
  const now = new Date('2026-10-01T12:00:00Z');
  it('describes how long ago something happened', () => {
    expect(relativeTimeKo(new Date('2026-10-01T11:59:40Z'), now)).toBe('방금');
    expect(relativeTimeKo(new Date('2026-10-01T11:15:00Z'), now)).toBe('45분 전');
    expect(relativeTimeKo(new Date('2026-10-01T03:00:00Z'), now)).toBe('9시간 전');
    expect(relativeTimeKo(new Date('2026-09-24T12:00:00Z'), now)).toBe('7일 전');
    expect(relativeTimeKo(new Date('2026-08-01T12:00:00Z'), now)).toBe('2개월 전');
    expect(relativeTimeKo(new Date('2024-09-01T12:00:00Z'), now)).toBe('2년 전');
  });
});
