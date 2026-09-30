export function calculateSlaDeadline(submittedAt: Date, reviewSlaHours: number): Date {
  return new Date(submittedAt.getTime() + reviewSlaHours * 60 * 60 * 1000);
}

export function isSlaBreached(
  submittedAt: Date,
  reviewSlaHours: number,
  now: Date = new Date()
): boolean {
  return now.getTime() > calculateSlaDeadline(submittedAt, reviewSlaHours).getTime();
}

export function isSlaDeadlineExceeded(deadline: Date, now: Date = new Date()): boolean {
  return now.getTime() > deadline.getTime();
}

export function getOverdueItems<T extends { status?: string; deadline?: Date | string }>(
  items: T[],
  now: Date = new Date()
): T[] {
  return items.filter((item) => {
    const status = String(item.status ?? '').trim();
    if (status !== 'pending_review') return false;

    const deadlineValue = item.deadline;
    if (deadlineValue === undefined || deadlineValue === null || deadlineValue === '') return false;

    const deadline = new Date(deadlineValue);
    if (!Number.isFinite(deadline.getTime())) return false;

    return isSlaDeadlineExceeded(deadline, now);
  });
}
