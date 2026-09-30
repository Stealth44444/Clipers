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
  return items.filter((item) => {
    const status = String(item.status ?? '').trim();
    if (status !== 'pending_review') return false;
    if (item.escalationSentAt !== undefined && item.escalationSentAt !== null && item.escalationSentAt !== '') {
      return false;
    }

    const deadline = new Date(item.deadline);
    if (!Number.isFinite(deadline.getTime())) return false;
    return now.getTime() > deadline.getTime();
  });
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
