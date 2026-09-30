import { getOverdueItems } from './sla';

export type EscalationCandidate = {
  id: string;
  status: string;
  deadline: Date | string;
  escalationSentAt?: Date | string | null;
};

export function getEscalationCandidates(
  items: EscalationCandidate[],
  now: Date = new Date()
): EscalationCandidate[] {
  return getOverdueItems(items, now).filter((item) => !item.escalationSentAt);
}

export function buildEscalationSummary(
  items: EscalationCandidate[],
  now: Date = new Date()
): { total: number; ids: string[] } {
  const candidates = getEscalationCandidates(items, now);
  return {
    total: candidates.length,
    ids: candidates.map((item) => item.id),
  };
}
