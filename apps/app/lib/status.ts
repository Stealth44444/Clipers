import type { Tone } from '@clipers/ui';

type StatusDisplay = { label: string; tone: Tone };

export const APPLICATION_STATUS: Record<string, StatusDisplay> = {
  applied: { label: '검토 중', tone: 'amber' },
  approved: { label: '승인됨', tone: 'brand' },
  rejected: { label: '반려됨', tone: 'tomato' },
};

export const CLIP_STATUS: Record<string, StatusDisplay> = {
  pending_review: { label: '검수 대기', tone: 'amber' },
  approved: { label: '승인', tone: 'brand' },
  rejected: { label: '반려', tone: 'tomato' },
};

export const SETTLEMENT_STATUS: Record<string, StatusDisplay> = {
  pending: { label: '정산 대기', tone: 'neutral' },
  requested: { label: '지급 요청', tone: 'amber' },
  paid: { label: '지급 완료', tone: 'brand' },
};

export const CONTENT_TYPE_LABEL: Record<string, string> = { clipping: '클리핑', ugc: 'UGC' };

export function statusDisplay(map: Record<string, StatusDisplay>, status: string): StatusDisplay {
  return map[status] ?? { label: status, tone: 'neutral' };
}
