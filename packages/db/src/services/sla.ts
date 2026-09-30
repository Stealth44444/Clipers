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
