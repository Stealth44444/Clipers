import { HEARD_FROM_OPTIONS, type HeardFrom } from './onboarding';

// The operator overview's "가입 경로" tables: sign-ups per self-reported channel and per utm_source, split by the
// role the account was created with. Rows come from signup_attributions (admins only).

export type SignupAttributionRow = {
  requested_role: string | null;
  utm_source: string | null;
  heard_from: string | null;
};

export type SignupSourceCount = { key: string; label: string; brand: number; creator: number; total: number };

export const UNKNOWN_SOURCE = { key: 'unknown', label: '직접 방문·기타' } as const;
const HEARD_FROM_LABELS = new Map<string, string>(HEARD_FROM_OPTIONS.map((option) => [option.id, option.label]));

function count(rows: SignupAttributionRow[], keyOf: (row: SignupAttributionRow) => string | null, labelOf: (key: string) => string): SignupSourceCount[] {
  const counts = new Map<string, SignupSourceCount>();
  for (const row of rows) {
    const key = keyOf(row) ?? UNKNOWN_SOURCE.key;
    const entry = counts.get(key) ?? { key, label: key === UNKNOWN_SOURCE.key ? UNKNOWN_SOURCE.label : labelOf(key), brand: 0, creator: 0, total: 0 };
    if (row.requested_role === 'brand') entry.brand += 1;
    else entry.creator += 1;
    entry.total += 1;
    counts.set(key, entry);
  }
  // Busiest first; the unknown bucket last at equal counts.
  return [...counts.values()].sort((a, b) => b.total - a.total || Number(a.key === UNKNOWN_SOURCE.key) - Number(b.key === UNKNOWN_SOURCE.key) || a.label.localeCompare(b.label, 'ko'));
}

/** Sign-ups per answer to "how did you hear of Clipers"; unanswered ones count as 직접 방문·기타. */
export function signupsByHeardFrom(rows: SignupAttributionRow[]): SignupSourceCount[] {
  return count(rows, (row) => (row.heard_from && HEARD_FROM_LABELS.has(row.heard_from) ? row.heard_from : null), (key) => HEARD_FROM_LABELS.get(key as HeardFrom) ?? key);
}

/** Sign-ups per utm_source (lower-cased); links without one count as 직접 방문·기타. */
export function signupsByUtmSource(rows: SignupAttributionRow[]): SignupSourceCount[] {
  return count(rows, (row) => row.utm_source?.trim().toLowerCase() || null, (key) => key);
}
