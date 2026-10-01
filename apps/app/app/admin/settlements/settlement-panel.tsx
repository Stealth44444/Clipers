'use client';

import { useEffect, useState } from 'react';
import {
  calculateWeeklySettlementDrafts,
  campaignPricing,
  creatorPayoutCap,
  findPlatformRate,
  getCampaignsToClose,
  getPreviousWeekPeriod,
} from '@clipers/db';
import { Badge, Button, DataTable, formatKRW } from '@clipers/ui';
import { SETTLEMENT_STATUS, statusDisplay } from '@/lib/status';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type CampaignForSettlement = {
  id: string;
  title: string;
  total_budget: number | string;
  brand_cpm: number | string;
  creator_cpm: number | string;
};

type ApprovedClip = {
  id: string;
  campaign_id: string;
  creator_id: string;
  platform: string;
  reviewed_at: string | null;
  campaign: CampaignForSettlement | null;
};

type SnapshotRow = {
  clip_id: string;
  view_count: number | string;
  captured_at: string;
};

type StoredSettlement = {
  id: string;
  creator_id: string;
  campaign_id: string;
  clip_id: string;
  amount: number | string;
  verified_views: number;
  withholding_amount: number | string;
  status: 'pending' | 'requested' | 'paid';
  period: string;
  creator: { display_name: string } | null;
  campaign: { title: string } | null;
};

type PreviousSettlement = {
  clip_id: string;
  campaign_id: string;
  amount: number | string;
  period: string;
};

function splitIntoChunks<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function csvCell(value: string | number): string {
  const text = String(value);
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export default function SettlementPanel() {
  const [settlements, setSettlements] = useState<StoredSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const period = getPreviousWeekPeriod();

  async function loadSettlements() {
    setLoading(true);
    setError('');

    const { data, error: queryError } = await getSupabaseBrowserClient()
      .from('settlements')
      .select('id,creator_id,campaign_id,clip_id,amount,verified_views,withholding_amount,status,period,creator:profiles!settlements_creator_id_fkey(display_name),campaign:campaigns!settlements_campaign_id_fkey(title)')
      .eq('period', period.period)
      .order('creator_id', { ascending: true });

    if (queryError) {
      setError(queryError.message);
    } else {
      setSettlements((data ?? []) as unknown as StoredSettlement[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadSettlements();
  }, []);

  async function generateSettlements() {
    setWorking(true);
    setError('');
    setMessage('');

    try {
      const supabase = getSupabaseBrowserClient();
      const clips: ApprovedClip[] = [];
      const pageSize = 500;
      let clipOffset = 0;

      while (true) {
        const { data, error: clipsError } = await supabase
          .from('clips')
          .select('id,campaign_id,creator_id,platform,reviewed_at,campaign:campaigns!clips_campaign_id_fkey(id,title,total_budget,brand_cpm,creator_cpm)')
          .eq('status', 'approved')
          .order('id', { ascending: true })
          .range(clipOffset, clipOffset + pageSize - 1);

        if (clipsError) throw clipsError;
        const page = (data ?? []) as unknown as ApprovedClip[];
        clips.push(...page);
        clipOffset += page.length;
        if (page.length < pageSize) break;
      }

      if (clips.length === 0) {
        setMessage('정산할 승인 클립이 없습니다.');
        return;
      }

      const { data: rateRows, error: rateError } = await supabase
        .from('campaign_platform_rates')
        .select('campaign_id,platform,cpm_rate,max_payout')
        .in('campaign_id', [...new Set(clips.map((clip) => clip.campaign_id))]);
      if (rateError) throw rateError;
      const platformRatesByCampaign = new Map<string, { platform: string; cpmRate: number; minPayout: number; maxPayout: number }[]>();
      for (const row of (rateRows ?? []) as { campaign_id: string; platform: string; cpm_rate: number; max_payout: number }[]) {
        const existing = platformRatesByCampaign.get(row.campaign_id) ?? [];
        existing.push({ platform: row.platform, cpmRate: Number(row.cpm_rate), minPayout: 0, maxPayout: Number(row.max_payout) });
        platformRatesByCampaign.set(row.campaign_id, existing);
      }

      const snapshots: SnapshotRow[] = [];
      const previousSettlements: PreviousSettlement[] = [];
      const clipIds = clips.map((clip) => clip.id);

      for (const ids of splitIntoChunks(clipIds, 100)) {
        let offset = 0;
        while (true) {
          const { data, error: snapshotsError } = await supabase
            .from('view_snapshots')
            .select('clip_id,view_count,captured_at')
            .in('clip_id', ids)
            .lt('captured_at', period.endAt.toISOString())
            .order('captured_at', { ascending: true })
            .range(offset, offset + 999);

          if (snapshotsError) throw snapshotsError;
          const page = (data ?? []) as SnapshotRow[];
          snapshots.push(...page);
          offset += page.length;
          if (page.length < 1000) break;
        }

        offset = 0;
        while (true) {
          const { data, error: settlementsError } = await supabase
            .from('settlements')
            .select('clip_id,campaign_id,amount,period')
            .in('clip_id', ids)
            .order('period', { ascending: true })
            .range(offset, offset + 999);

          if (settlementsError) throw settlementsError;
          const page = (data ?? []) as PreviousSettlement[];
          previousSettlements.push(...page);
          offset += page.length;
          if (page.length < 1000) break;
        }
      }

      const existingClipIds = new Set(
        previousSettlements
          .filter((settlement) => settlement.period === period.period)
          .map((settlement) => settlement.clip_id)
      );
      const inputs = clips.flatMap((clip) => {
        const campaign = clip.campaign;
        if (!campaign || existingClipIds.has(clip.id)) return [];

        const rate = findPlatformRate(platformRatesByCampaign.get(clip.campaign_id) ?? [], clip.platform);
        if (!rate) return [];

        const previousClipRows = previousSettlements.filter(
          (settlement) => settlement.clip_id === clip.id && settlement.period < period.period
        );
        const previousCampaignRows = previousSettlements.filter(
          (settlement) =>
            settlement.campaign_id === clip.campaign_id && settlement.period < period.period
        );

        return [{
          clipId: clip.id,
          campaignId: clip.campaign_id,
          creatorId: clip.creator_id,
          reviewedAt: clip.reviewed_at,
          cpmRate: rate.cpmRate,
          perClipCap: rate.maxPayout,
          // Creators can only be paid the creator-rate share of the brand's budget.
          campaignBudget: creatorPayoutCap(Number(campaign.total_budget), campaignPricing(campaign)),
          previouslySettledClipAmount: previousClipRows.reduce(
            (total, settlement) => total + Number(settlement.amount),
            0
          ),
          previouslySettledCampaignAmount: previousCampaignRows.reduce(
            (total, settlement) => total + Number(settlement.amount),
            0
          ),
          snapshots: snapshots
            .filter((snapshot) => snapshot.clip_id === clip.id)
            .map((snapshot) => ({
              capturedAt: snapshot.captured_at,
              viewCount: Number(snapshot.view_count),
            })),
        }];
      });

      const drafts = calculateWeeklySettlementDrafts(inputs, period);
      if (drafts.length === 0) {
        setMessage('지난주 검증 조회수에 따른 정산 대상이 없습니다.');
        return;
      }

      const { error: insertError } = await supabase.from('settlements').insert(
        drafts.map((draft) => ({
          creator_id: draft.creatorId,
          campaign_id: draft.campaignId,
          clip_id: draft.clipId,
          amount: draft.amount,
          verified_views: draft.verifiedViews,
          withholding_amount: 0,
          status: 'pending' as const,
          period: draft.period,
        }))
      );

      if (insertError) throw insertError;

      const campaignBudgets = new Map<string, number>();
      const campaignPreviouslySettled = new Map<string, number>();
      for (const input of inputs) {
        campaignBudgets.set(input.campaignId, input.campaignBudget);
        campaignPreviouslySettled.set(input.campaignId, input.previouslySettledCampaignAmount);
      }
      const campaignNewlySettled = new Map<string, number>();
      for (const draft of drafts) {
        campaignNewlySettled.set(
          draft.campaignId,
          (campaignNewlySettled.get(draft.campaignId) ?? 0) + draft.amount
        );
      }

      const campaignsToClose = getCampaignsToClose(
        [...campaignBudgets.entries()].map(([campaignId, totalBudget]) => ({
          campaignId,
          totalBudget,
          totalSettledAmount:
            (campaignPreviouslySettled.get(campaignId) ?? 0) +
            (campaignNewlySettled.get(campaignId) ?? 0),
        }))
      );

      if (campaignsToClose.length > 0) {
        const { error: closeError } = await supabase
          .from('campaigns')
          .update({ status: 'closed' })
          .in('id', campaignsToClose)
          .eq('status', 'live');
        if (closeError) throw closeError;
      }

      setMessage(
        campaignsToClose.length > 0
          ? `${drafts.length}건의 정산을 생성하고, 예산을 소진한 캠페인 ${campaignsToClose.length}건을 마감했습니다.`
          : `${drafts.length}건의 정산을 생성했습니다.`
      );
      await loadSettlements();
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : '정산을 생성하지 못했습니다.');
    } finally {
      setWorking(false);
    }
  }

  function exportCreatorCsv() {
    const totals = new Map<string, {
      creatorId: string;
      creatorName: string;
      status: string;
      gross: number;
      withholding: number;
    }>();

    for (const settlement of settlements) {
      const key = `${settlement.creator_id}:${settlement.status}`;
      const current = totals.get(key) ?? {
        creatorId: settlement.creator_id,
        creatorName: settlement.creator?.display_name ?? '크리에이터',
        status: statusDisplay(SETTLEMENT_STATUS, settlement.status).label,
        gross: 0,
        withholding: 0,
      };
      current.gross += Number(settlement.amount);
      current.withholding += Number(settlement.withholding_amount);
      totals.set(key, current);
    }

    const rows = [
      ['정산 주', '크리에이터', '크리에이터 ID', '상태', '총액', '원천징수(placeholder)', '실지급액'],
      ...[...totals.values()].map((total) => [
        period.period,
        total.creatorName,
        total.creatorId,
        total.status,
        total.gross.toFixed(2),
        total.withholding.toFixed(2),
        (total.gross - total.withholding).toFixed(2),
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `clipers-settlements-${period.period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="cl-stack-tight">
      <div className="cl-toolbar">
        <div className="cl-inline">
          <Button disabled={working || loading} onClick={() => void generateSettlements()} variant="primary">
            {working ? '처리 중…' : '지난주 정산 산출'}
          </Button>
          <Button disabled={settlements.length === 0} onClick={exportCreatorCsv} variant="secondary">
            크리에이터별 CSV 내보내기
          </Button>
        </div>
        <span className="cl-meta cl-number">{period.period} 주</span>
      </div>
      {message && (
        <p className="cl-alert cl-tone-brand" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="cl-alert cl-tone-tomato" role="alert">
          {error}
        </p>
      )}
      <DataTable
        columns={[
          {
            key: 'creator',
            header: '크리에이터 / 캠페인',
            render: (settlement) => (
              <div>
                <p>{settlement.creator?.display_name ?? '크리에이터'}</p>
                <p className="cl-meta-subtle">{settlement.campaign?.title ?? '캠페인'}</p>
              </div>
            ),
          },
          { key: 'views', header: '검증 조회수', align: 'right', render: (settlement) => Number(settlement.verified_views).toLocaleString('ko-KR') },
          { key: 'amount', header: '정산액', align: 'right', render: (settlement) => formatKRW(Number(settlement.amount)) },
          { key: 'withholding', header: '원천징수', align: 'right', render: (settlement) => formatKRW(Number(settlement.withholding_amount)) },
          {
            key: 'status',
            header: '상태',
            render: (settlement) => {
              const status = statusDisplay(SETTLEMENT_STATUS, settlement.status);
              return <Badge tone={status.tone}>{status.label}</Badge>;
            },
          },
        ]}
        empty={loading ? '불러오는 중…' : '이 주에 생성된 정산이 없어요.'}
        label="주간 정산"
        rowKey={(settlement) => settlement.id}
        rows={settlements}
      />
    </div>
  );
}
