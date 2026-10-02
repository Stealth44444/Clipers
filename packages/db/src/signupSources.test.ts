import { describe, expect, it } from 'vitest';
import { UNKNOWN_SOURCE, signupsByHeardFrom, signupsByUtmSource, type SignupAttributionRow } from './signupSources';

const rows: SignupAttributionRow[] = [
  { requested_role: 'brand', utm_source: 'Instagram', heard_from: 'search' },
  { requested_role: 'creator', utm_source: 'instagram', heard_from: 'youtube_shortform' },
  { requested_role: 'creator', utm_source: null, heard_from: 'youtube_shortform' },
  { requested_role: null, utm_source: '  ', heard_from: null },
  { requested_role: 'creator', utm_source: 'naver', heard_from: 'bogus' },
];

describe('signupsByHeardFrom', () => {
  it('labels each answer, counts roles, and puts unanswered or unknown answers in the unknown bucket', () => {
    expect(signupsByHeardFrom(rows)).toEqual([
      { key: 'youtube_shortform', label: '유튜브·숏폼에서 봤어요', brand: 0, creator: 2, total: 2 },
      { key: UNKNOWN_SOURCE.key, label: UNKNOWN_SOURCE.label, brand: 0, creator: 2, total: 2 },
      { key: 'search', label: '검색 (네이버·구글)', brand: 1, creator: 0, total: 1 },
    ]);
  });
});

describe('signupsByUtmSource', () => {
  it('merges case, treats blanks as direct, and sorts busiest first', () => {
    expect(signupsByUtmSource(rows)).toEqual([
      { key: 'instagram', label: 'instagram', brand: 1, creator: 1, total: 2 },
      { key: UNKNOWN_SOURCE.key, label: UNKNOWN_SOURCE.label, brand: 0, creator: 2, total: 2 },
      { key: 'naver', label: 'naver', brand: 0, creator: 1, total: 1 },
    ]);
  });

  it('is empty without rows', () => {
    expect(signupsByUtmSource([])).toEqual([]);
  });
});
