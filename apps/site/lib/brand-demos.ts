// Frames for the brand page's product demos. Each demo loops through its frames and its component only renders the
// current frame's state, so timing and content live here where they can be tested.
// No demo shows a budget amount next to views: together they would reveal the brand rate.

export type Frame<S> = { ms: number; state: S };

/** Every prefix of `text`, one character longer each time: '3', '30', '300', … */
export function typingSteps(text: string): string[] {
  const chars = [...text];
  return chars.map((_, index) => chars.slice(0, index + 1).join(''));
}

/** Gives the last frame a longer hold, so a finished demo rests before it loops. */
function hold<S>(frames: Frame<S>[], ms: number): Frame<S>[] {
  const last = frames[frames.length - 1];
  return [...frames.slice(0, -1), { ...last, ms }];
}

// ---------- new-campaign editor (brand app) ----------

export type EditorState = { clipping: boolean; chips: number; budget: string; cursor: string | null; click: boolean };

export const EDITOR_CHIPS = ['유튜브 쇼츠', '틱톡', '인스타그램 릴스'] as const;
export const EDITOR_TOTAL_STEPS = 7;
export const EDITOR_BUDGET = '3000000';

/** The editor's "n/7 완료": name and description are already filled; then content type, platforms and budget. */
export function editorDone(state: EditorState): number {
  return 2 + Number(state.clipping) + Number(state.chips > 0) + Number(state.budget !== '');
}

export function editorFrames(): Frame<EditorState>[] {
  const base: EditorState = { clipping: false, chips: 0, budget: '', cursor: null, click: false };
  const frames: Frame<EditorState>[] = [
    { ms: 900, state: base },
    { ms: 800, state: { ...base, cursor: 'clipping' } },
    { ms: 500, state: { ...base, clipping: true, cursor: 'clipping', click: true } },
  ];
  EDITOR_CHIPS.forEach((_, index) => {
    const cursor = `chip-${index}`;
    frames.push({ ms: 650, state: { ...base, clipping: true, chips: index, cursor } });
    frames.push({ ms: 300, state: { ...base, clipping: true, chips: index + 1, cursor, click: true } });
  });
  const ready: EditorState = { ...base, clipping: true, chips: EDITOR_CHIPS.length, cursor: 'budget' };
  frames.push({ ms: 750, state: ready }, { ms: 250, state: { ...ready, click: true } });
  for (const budget of typingSteps(EDITOR_BUDGET)) frames.push({ ms: 110, state: { ...ready, budget } });
  return hold(frames, 2400);
}

// ---------- clip-submit dialog (creator app) ----------

export type SubmitState = { platform: boolean; url: string; sending: boolean; sent: boolean; cursor: string | null; click: boolean };

export const SUBMIT_URL = 'https://youtube.com/shorts/x8Kq2';

export function submitFrames(): Frame<SubmitState>[] {
  const base: SubmitState = { platform: false, url: '', sending: false, sent: false, cursor: null, click: false };
  const picked: SubmitState = { ...base, platform: true };
  const frames: Frame<SubmitState>[] = [
    { ms: 900, state: base },
    { ms: 800, state: { ...base, cursor: 'platform' } },
    { ms: 450, state: { ...picked, cursor: 'platform', click: true } },
    { ms: 700, state: { ...picked, cursor: 'url' } },
    { ms: 300, state: { ...picked, cursor: 'url', click: true } },
  ];
  for (const url of typingSteps(SUBMIT_URL)) frames.push({ ms: 45, state: { ...picked, url, cursor: 'url' } });
  const filled: SubmitState = { ...picked, url: SUBMIT_URL };
  frames.push(
    { ms: 800, state: { ...filled, cursor: 'submit' } },
    { ms: 900, state: { ...filled, sending: true, cursor: 'submit', click: true } },
    { ms: 2600, state: { ...filled, sent: true, cursor: 'submit' } }
  );
  return frames;
}

// ---------- received clips (brand campaign page) ----------

export type ClipRow = { id: number; creator: string; platform: string; approved: boolean };
export type ReceivedState = { views: number; clips: number; rows: ClipRow[] };

const RECEIVED_ROWS = 4;
const ARRIVALS: [string, string][] = [
  ['도윤', 'tiktok'],
  ['서아', 'naver_clip'],
  ['지호', 'youtube_shorts'],
  ['유나', 'kakao_shorts'],
  ['하루', 'youtube_shorts'],
  ['민지', 'instagram_reels'],
];
const FIRST_ROWS: ClipRow[] = [
  { id: -1, creator: '지호', platform: 'naver_clip', approved: true },
  { id: -2, creator: '서아', platform: 'tiktok', approved: true },
  { id: -3, creator: '민지', platform: 'instagram_reels', approved: true },
  { id: -4, creator: '하루', platform: 'youtube_shorts', approved: true },
];

/** New clips arrive waiting for review and pass it; verified views and the clip count only go up. */
export function receivedFrames(): Frame<ReceivedState>[] {
  let rows = FIRST_ROWS;
  let views = 482_000;
  let clips = 37;
  const frames: Frame<ReceivedState>[] = [{ ms: 1600, state: { views, clips, rows } }];
  ARRIVALS.forEach(([creator, platform], id) => {
    views += 4_300;
    clips += 1;
    rows = [{ id, creator, platform, approved: false }, ...rows].slice(0, RECEIVED_ROWS);
    frames.push({ ms: 1600, state: { views, clips, rows } });
    views += 4_100;
    rows = rows.map((row) => (row.id === id ? { ...row, approved: true } : row));
    frames.push({ ms: 1600, state: { views, clips, rows } });
  });
  return frames;
}

// ---------- controls bento ----------

export const REQUIREMENTS_TEXT = '음원 후렴을 15초 이상 사용\n영상 설명에 #여름밤챌린지 포함';

export function requirementsFrames(): Frame<string>[] {
  return hold([{ ms: 600, state: '' }, ...typingSteps(REQUIREMENTS_TEXT).map((state) => ({ ms: 60, state }))], 3500);
}

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

export type DepositStatus = 'draft' | 'pending_escrow' | 'live';
export type DepositState = { status: DepositStatus; sending: boolean; cursor: string | null; click: boolean };

/** Same labels and tones as the brand app's CAMPAIGN_STATUS (apps/app/lib/status.ts); leads as the app words them. */
export const DEPOSIT_STATUS: Record<DepositStatus, { label: string; tone: 'neutral' | 'amber' | 'brand'; lead: string }> = {
  draft: { label: '입금 전', tone: 'neutral', lead: '입금을 마치고 아래 버튼을 누르면 운영팀이 확인한 뒤 캠페인을 공개해요.' },
  pending_escrow: { label: '입금 확인 중', tone: 'amber', lead: '운영팀이 입금을 확인하고 있어요. 확인되면 캠페인이 공개돼요.' },
  live: { label: '진행 중', tone: 'brand', lead: '캠페인이 공개됐어요. 크리에이터 지원을 받기 시작해요.' },
};

export const DEPOSIT_FRAMES: Frame<DepositState>[] = [
  { ms: 1000, state: { status: 'draft', sending: false, cursor: null, click: false } },
  { ms: 900, state: { status: 'draft', sending: false, cursor: 'deposit', click: false } },
  { ms: 700, state: { status: 'draft', sending: true, cursor: 'deposit', click: true } },
  { ms: 2200, state: { status: 'pending_escrow', sending: false, cursor: 'deposit', click: false } },
  { ms: 3000, state: { status: 'live', sending: false, cursor: null, click: false } },
];
