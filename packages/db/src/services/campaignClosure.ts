export type CampaignBudgetStatus = {
  campaignId: string;
  totalBudget: number;
  totalSettledAmount: number;
};

export function getCampaignsToClose(campaigns: CampaignBudgetStatus[]): string[] {
  return campaigns
    .filter(
      (campaign) =>
        Number.isFinite(campaign.totalBudget) &&
        campaign.totalBudget > 0 &&
        campaign.totalSettledAmount >= campaign.totalBudget
    )
    .map((campaign) => campaign.campaignId);
}
