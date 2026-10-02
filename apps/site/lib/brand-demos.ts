// Frames for the brand page's product demos. Each demo loops through its frames and its component only renders the
// current frame's state, so timing and content live here where they can be tested.
// No demo shows a budget amount next to views: together they would reveal the brand rate.

export type Frame<S> = { ms: number; state: S };

/** Gives the last frame a longer hold, so a finished demo rests before it loops. */
function hold<S>(frames: Frame<S>[], ms: number): Frame<S>[] {
  const last = frames[frames.length - 1];
  return [...frames.slice(0, -1), { ...last, ms }];
}

// ---------- controls bento ----------

export const REQUIREMENTS_TEXT = '음원 후렴을 15초 이상 사용\n영상 설명에 #여름밤챌린지 포함';

export type CapState = { filled: boolean; capped: boolean };

export const CAP_FRAMES: Frame<CapState>[] = [
  { ms: 600, state: { filled: false, capped: false } },
  { ms: 1300, state: { filled: true, capped: false } },
  { ms: 4100, state: { filled: true, capped: true } },
];

/** The waiting applicant's review: false = 검토 중, true = 승인. */
export const APPLICANT_FRAMES: Frame<boolean>[] = [
  { ms: 2600, state: false },
  { ms: 2600, state: true },
];

export const BUDGET_TOTAL = 3_000_000;

/** Remaining budget ticking down (no views beside it). */
export function budgetFrames(): Frame<number>[] {
  return hold(
    Array.from({ length: 28 }, (_, step) => ({ ms: 700, state: 2_850_000 - step * 9_000 })),
    2000
  );
}

// ---------- verification ----------

export function verifiedFrames(): Frame<number>[] {
  return Array.from({ length: 40 }, (_, step) => ({ ms: 300, state: 48_200 + step * 37 }));
}

// ---------- deposit (brand campaign page) ----------

/** The deposit card's lead, worded as the brand app words it before the brand reports the transfer. */
export const DEPOSIT_LEAD = '입금을 마치고 아래 버튼을 누르면 운영팀이 확인한 뒤 캠페인을 공개하고, 세금계산서를 발행해요.';
