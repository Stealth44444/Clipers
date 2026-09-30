export function isSlaDeadlineExceeded(deadline: Date, now: Date = new Date()): boolean {
  return now.getTime() > deadline.getTime();
}

export function getOverdueItems<T extends { status?: string; deadline?: Date | string | null }>(
  items: T[],
  now: Date = new Date()
): T[] {
  return items.filter((item) => {
    if (String(item.status ?? '').trim() !== 'pending_review') return false;
    if (item.deadline === undefined || item.deadline === null || item.deadline === '') return false;

    const deadline = new Date(item.deadline);
    if (!Number.isFinite(deadline.getTime())) return false;

    return isSlaDeadlineExceeded(deadline, now);
  });
}
