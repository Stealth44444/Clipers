export type ViewSnapshotPoint = {
  capturedAt: Date | string;
  viewCount: number;
};

export type ClipSnapshotSeries = {
  clipId: string;
  snapshots: ViewSnapshotPoint[];
};

export type DailyViewsPoint = {
  date: string;
  totalViews: number;
};

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function rollupDailyViews(series: ClipSnapshotSeries[]): DailyViewsPoint[] {
  const perClip = series.map(({ clipId, snapshots }) => ({
    clipId,
    sorted: snapshots
      .map((snapshot) => ({ capturedAt: new Date(snapshot.capturedAt), viewCount: snapshot.viewCount }))
      .filter(
        (snapshot) =>
          Number.isFinite(snapshot.capturedAt.getTime()) &&
          Number.isSafeInteger(snapshot.viewCount) &&
          snapshot.viewCount >= 0
      )
      .sort((left, right) => left.capturedAt.getTime() - right.capturedAt.getTime()),
  }));

  const allDates = new Set<string>();
  for (const clip of perClip) {
    for (const snapshot of clip.sorted) {
      allDates.add(toDateKey(snapshot.capturedAt));
    }
  }
  const sortedDates = [...allDates].sort();
  if (sortedDates.length === 0) return [];

  const lastKnownByClip = new Map<string, number>();
  return sortedDates.map((date) => {
    const dayEnd = new Date(`${date}T23:59:59.999Z`).getTime();
    for (const clip of perClip) {
      const latestForDay = [...clip.sorted].reverse().find((snapshot) => snapshot.capturedAt.getTime() <= dayEnd);
      if (latestForDay) {
        lastKnownByClip.set(clip.clipId, latestForDay.viewCount);
      }
    }
    const totalViews = [...lastKnownByClip.values()].reduce((sum, count) => sum + count, 0);
    return { date, totalViews };
  });
}
