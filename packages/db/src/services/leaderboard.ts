export type SettlementEarning = {
  creatorId: string;
  creatorName: string;
  amount: number;
};

export type RankedCreatorEarning = {
  rank: number;
  creatorId: string;
  creatorName: string;
  totalAmount: number;
};

export function rankCreatorEarnings(settlements: SettlementEarning[]): RankedCreatorEarning[] {
  const totals = new Map<string, { creatorName: string; totalAmount: number }>();
  for (const settlement of settlements) {
    const existing = totals.get(settlement.creatorId);
    totals.set(settlement.creatorId, {
      creatorName: settlement.creatorName,
      totalAmount: (existing?.totalAmount ?? 0) + settlement.amount,
    });
  }

  return [...totals.entries()]
    .map(([creatorId, { creatorName, totalAmount }]) => ({ creatorId, creatorName, totalAmount }))
    .sort((left, right) => right.totalAmount - left.totalAmount)
    .map((entry, index) => ({ rank: index + 1, ...entry }));
}
