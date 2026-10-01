'use client';

import { useEffect, useState } from 'react';
import { getPreviousWeekPeriod, runPendingSettlements } from '@clipers/db';
import { Badge, Button, DataTable, formatKRW } from '@clipers/ui';
import { SETTLEMENT_STATUS, statusDisplay } from '@/lib/status';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

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

  // The weekly cron does this every Monday; the button is for a week it missed or before it is set up.
  async function generateSettlements() {
    setWorking(true);
    setError('');
    setMessage('');
    const result = await runPendingSettlements(getSupabaseBrowserClient(), 'admin');
    setWorking(false);
    if (!result.ok) return setError(result.message);

    const ran = result.data.filter((summary) => !summary.alreadyRun);
    setMessage(
      ran.length === 0
        ? '정산할 주가 없어요. 지난주까지 모두 정산됐어요.'
        : ran
            .map((summary) => `${summary.period} 주: 정산 ${summary.settlements}건${summary.closedCampaigns > 0 ? `, 예산 소진으로 캠페인 ${summary.closedCampaigns}건 마감` : ''}`)
            .join(' · ')
    );
    await loadSettlements();
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
            {working ? '처리 중…' : '밀린 정산 산출'}
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
