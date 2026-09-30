'use client';

import { useEffect, useState } from 'react';
import { calculateWeeklySettlementDrafts, getCampaignsToClose, getPreviousWeekPeriod } from '@clipers/db';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type CampaignForSettlement = {
  id: string;
  title: string;
  cpm_rate: number | string;
  per_clip_cap: number | string;
  total_budget: number | string;
};

type ApprovedClip = {
  id: string;
  campaign_id: string;
  creator_id: string;
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

const SETTLEMENT_STATUS: Record<StoredSettlement['status'], string> = {
  pending: '대기',
  requested: '지급 요청',
  paid: '지급 완료',
};

function statusClass(status: StoredSettlement['status']): string {
  if (status === 'paid') return 'app-status app-status-positive';
  if (status === 'requested') return 'app-status app-status-requested';
  return 'app-status app-status-neutral';
}

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

export default function SettlementPanel({ userId }: { userId: string }) {
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
    if (userId) void loadSettlements();
  }, [userId]);

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
          .select('id,campaign_id,creator_id,reviewed_at,campaign:campaigns!clips_campaign_id_fkey(id,title,cpm_rate,per_clip_cap,total_budget)')
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
          cpmRate: Number(campaign.cpm_rate),
          perClipCap: Number(campaign.per_clip_cap),
          campaignBudget: Number(campaign.total_budget),
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

  async function markPaid(settlement: StoredSettlement) {
    if (!window.confirm('계좌 이체를 완료한 건만 지급 완료 처리하세요.')) return;

    setWorking(true);
    setError('');
    setMessage('');
    const { data, error: updateError } = await getSupabaseBrowserClient()
      .from('settlements')
      .update({ status: 'paid' })
      .eq('id', settlement.id)
      .eq('status', 'requested')
      .select('id')
      .maybeSingle();

    if (updateError) {
      setError(updateError.message);
    } else if (!data) {
      setError('상태가 변경되어 지급 완료 처리를 하지 못했습니다. 새로고침 후 확인하세요.');
    } else {
      setMessage('지급 완료로 처리했습니다.');
      await loadSettlements();
    }
    setWorking(false);
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
        status: SETTLEMENT_STATUS[settlement.status],
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
    <section className="app-section" aria-labelledby="settlements-title">
      <h2 id="settlements-title">주간 정산 <span className="app-muted">{period.period} 주간</span></h2>
      <p className="app-muted">지난 완료 주의 조회수 증가분으로 산출합니다. 이체는 엑셀 내보내기 후 수동 처리합니다.</p>
      {message && <p className="app-notice" role="status">{message}</p>}
      {error && <p className="app-error" role="alert">{error}</p>}
      <div className="app-action-row">
        <button className="app-button app-button-primary" disabled={working || loading} onClick={() => void generateSettlements()} type="button">
          {working ? '처리 중...' : '지난주 정산 산출'}
        </button>
        <button className="app-button" disabled={settlements.length === 0} onClick={exportCreatorCsv} type="button">
          크리에이터별 CSV 내보내기
        </button>
      </div>
      <div className="app-table-wrap" style={{ marginTop: 18 }}>
        <table className="app-table">
          <thead>
            <tr><th>크리에이터</th><th>캠페인</th><th>검증 조회수</th><th>총액</th><th>원천징수</th><th>상태</th><th>처리</th></tr>
          </thead>
          <tbody>
            {settlements.map((settlement) => (
              <tr key={settlement.id}>
                <td>{settlement.creator?.display_name ?? '크리에이터'}</td>
                <td>{settlement.campaign?.title ?? '캠페인'}</td>
                <td>{Number(settlement.verified_views).toLocaleString('ko-KR')}</td>
                <td>{Number(settlement.amount).toLocaleString('ko-KR')}원</td>
                <td>{Number(settlement.withholding_amount).toLocaleString('ko-KR')}원</td>
                <td className={statusClass(settlement.status)}>{SETTLEMENT_STATUS[settlement.status]}</td>
                <td>
                  {settlement.status === 'requested' ? (
                    <button className="app-button" disabled={working} onClick={() => void markPaid(settlement)} type="button">지급 완료 처리</button>
                  ) : '—'}
                </td>
              </tr>
            ))}
            {!loading && settlements.length === 0 && <tr><td colSpan={7}>이 주에 생성된 정산이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
