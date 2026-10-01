export type BrandChecklistStep = { id: 'create' | 'deposit' | 'live' | 'first_clip'; done: boolean };

const DEPOSITED = new Set(['pending_escrow', 'live', 'paused', 'closed']);
const WENT_LIVE = new Set(['live', 'paused', 'closed']);

export function brandChecklist(input: { campaignStatuses: string[]; clipCount: number }): BrandChecklistStep[] {
  return [
    { id: 'create', done: input.campaignStatuses.length > 0 },
    { id: 'deposit', done: input.campaignStatuses.some((status) => DEPOSITED.has(status)) },
    { id: 'live', done: input.campaignStatuses.some((status) => WENT_LIVE.has(status)) },
    { id: 'first_clip', done: input.clipCount > 0 },
  ];
}
