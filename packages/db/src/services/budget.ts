export interface ClipViewCount {
  viewCount: number;
}

export function calculateClipAmount(
  viewCount: number,
  cpmRate: number,
  perClipCap: number
): number {
  const rawAmount = (viewCount / 1000) * cpmRate;
  return Math.min(rawAmount, perClipCap);
}

export function calculateBudgetConsumed(
  clips: ClipViewCount[],
  cpmRate: number,
  perClipCap: number
): number {
  return clips.reduce(
    (sum, clip) => sum + calculateClipAmount(clip.viewCount, cpmRate, perClipCap),
    0
  );
}
