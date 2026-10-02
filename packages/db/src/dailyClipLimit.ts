// How many clips one creator may submit to one campaign per day. The campaign owner picks the limit; the database
// enforces it on submission (prepare_clip_submission). A day runs from midnight Korea time; rejected clips don't count.

export const DAILY_CLIP_LIMIT_OPTIONS = [1, 2, 3, 5] as const;
export const DEFAULT_DAILY_CLIP_LIMIT = 3;

const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function dailyClipLimitLabel(limit: number | null): string {
  return limit === null ? '제한 없음' : `하루 ${limit}개`;
}

/** Midnight Korea time at the start of the day `now` falls in. */
export function kstDayStart(now: Date = new Date()): Date {
  const korea = now.getTime() + KOREA_OFFSET_MS;
  return new Date(korea - (korea % DAY_MS) - KOREA_OFFSET_MS);
}

/** Submissions left today, or null when the campaign has no limit. */
export function submissionsLeftToday(
  limit: number | null,
  clips: { status: string; submitted_at: string }[],
  now: Date = new Date()
): number | null {
  if (limit === null) return null;
  const start = kstDayStart(now).getTime();
  const used = clips.filter((clip) => clip.status !== 'rejected' && Date.parse(clip.submitted_at) >= start).length;
  return Math.max(0, limit - used);
}
