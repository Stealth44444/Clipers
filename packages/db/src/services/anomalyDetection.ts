export type ViewSnapshotPoint = {
  capturedAt: Date | string;
  viewCount: number;
};

export type ClipSnapshotSeries = {
  clipId: string;
  snapshots: ViewSnapshotPoint[];
};

export type ViewSpikeFlag = {
  clipId: string;
  previousViewCount: number;
  currentViewCount: number;
  hoursBetween: number;
};

export type ViewSpikeOptions = {
  /** 이전 스냅샷 대비 몇 배 이상 증가하면 플래그할지. 임계값 미결정(스펙 참고) — 잠정 기본값. */
  spikeMultiplier?: number;
  /** 배율 조건과 무관하게, 이 값 이상 절대 증가하면 플래그. 저조회수 클립의 배율 왜곡 방지용. */
  minAbsoluteJump?: number;
  /** 이 시간(시) 이내에 발생한 증가만 스파이크로 본다. */
  windowHours?: number;
};

const DEFAULT_SPIKE_MULTIPLIER = 3;
const DEFAULT_MIN_ABSOLUTE_JUMP = 50_000;
const DEFAULT_WINDOW_HOURS = 1;

export function getViewSpikeFlags(
  series: ClipSnapshotSeries[],
  options: ViewSpikeOptions = {}
): ViewSpikeFlag[] {
  const spikeMultiplier = options.spikeMultiplier ?? DEFAULT_SPIKE_MULTIPLIER;
  const minAbsoluteJump = options.minAbsoluteJump ?? DEFAULT_MIN_ABSOLUTE_JUMP;
  const windowHours = options.windowHours ?? DEFAULT_WINDOW_HOURS;

  const flags: ViewSpikeFlag[] = [];

  for (const { clipId, snapshots } of series) {
    const sorted = snapshots
      .map((snapshot) => ({
        capturedAt: new Date(snapshot.capturedAt),
        viewCount: snapshot.viewCount,
      }))
      .filter(
        (snapshot) =>
          Number.isFinite(snapshot.capturedAt.getTime()) &&
          Number.isSafeInteger(snapshot.viewCount) &&
          snapshot.viewCount >= 0
      )
      .sort((left, right) => left.capturedAt.getTime() - right.capturedAt.getTime());

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const hoursBetween =
        (current.capturedAt.getTime() - previous.capturedAt.getTime()) / (60 * 60 * 1000);

      if (hoursBetween <= 0 || hoursBetween > windowHours) continue;

      const jump = current.viewCount - previous.viewCount;
      if (jump <= 0) continue;

      const exceedsMultiplier =
        previous.viewCount > 0 && current.viewCount >= previous.viewCount * spikeMultiplier;
      const exceedsAbsoluteJump = jump >= minAbsoluteJump;

      if (exceedsMultiplier || exceedsAbsoluteJump) {
        flags.push({
          clipId,
          previousViewCount: previous.viewCount,
          currentViewCount: current.viewCount,
          hoursBetween: Math.round(hoursBetween * 100) / 100,
        });
      }
    }
  }

  return flags;
}
