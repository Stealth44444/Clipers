'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import WorkspaceShell from '../workspace-shell';

type Campaign = {
  id: string;
  title: string;
  content_type: 'clipping' | 'ugc';
  category: string;
  total_budget: number | string;
  cpm_rate: number | string;
  per_clip_cap: number | string;
  review_sla_hours: number;
  allowed_platforms: string[];
  status: string;
};

type Settlement = {
  campaign_id: string;
  amount: number | string;
};

const PLATFORM_OPTIONS = [
  { value: 'youtube_shorts', label: '유튜브 쇼츠' },
  { value: 'tiktok', label: '틱톡' },
  { value: 'instagram_reels', label: '릴스' },
];

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  draft: '입금 대기',
  pending_escrow: '입금 확인 중',
  live: '라이브',
  paused: '일시중지',
  closed: '마감',
};

function statusClass(status: string): string {
  if (status === 'live') return 'app-status app-status-positive';
  if (status === 'pending_escrow') return 'app-status app-status-requested';
  return 'app-status app-status-neutral';
}

export default function BrandWorkspace() {
  const [userId, setUserId] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<'clipping' | 'ugc'>('clipping');
  const [category, setCategory] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [cpmRate, setCpmRate] = useState('');
  const [perClipCap, setPerClipCap] = useState('');
  const [reviewSlaHours, setReviewSlaHours] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadWorkspace() {
    setLoading(true);
    setError('');

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        setUserId('');
        return;
      }

      setUserId(userData.user.id);
      const [campaignResult, settlementResult] = await Promise.all([
        supabase
          .from('campaigns')
          .select('id,title,content_type,category,total_budget,cpm_rate,per_clip_cap,review_sla_hours,allowed_platforms,status')
          .eq('brand_id', userData.user.id)
          .order('created_at', { ascending: false }),
        supabase.from('settlements').select('campaign_id,amount'),
      ]);

      if (campaignResult.error) throw campaignResult.error;
      if (settlementResult.error) throw settlementResult.error;

      setCampaigns((campaignResult.data ?? []) as Campaign[]);
      setSettlements((settlementResult.data ?? []) as Settlement[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '캠페인 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, []);

  function togglePlatform(value: string) {
    setPlatforms((current) =>
      current.includes(value) ? current.filter((platform) => platform !== value) : [...current, value]
    );
  }

  async function createCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (platforms.length === 0) throw new Error('허용 플랫폼을 하나 이상 선택해야 합니다.');

      const { error: insertError } = await getSupabaseBrowserClient().from('campaigns').insert({
        brand_id: userId,
        track: 'self_serve',
        title: title.trim(),
        content_type: contentType,
        category: category.trim(),
        total_budget: Number(totalBudget),
        cpm_rate: Number(cpmRate),
        per_clip_cap: Number(perClipCap),
        review_sla_hours: Number(reviewSlaHours),
        allowed_platforms: platforms,
        status: 'draft',
      });
      if (insertError) throw insertError;

      setTitle('');
      setCategory('');
      setTotalBudget('');
      setCpmRate('');
      setPerClipCap('');
      setReviewSlaHours('');
      setPlatforms([]);
      setMessage('캠페인을 생성했습니다. 아래 계좌이체 안내에 따라 입금 후 "입금 완료" 버튼을 눌러주세요.');
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '캠페인을 생성하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function markDeposited(campaignId: string) {
    setSubmitting(true);
    setError('');
    setMessage('');

    const { data, error: updateError } = await getSupabaseBrowserClient()
      .from('campaigns')
      .update({ status: 'pending_escrow' })
      .eq('id', campaignId)
      .eq('status', 'draft')
      .select('id')
      .maybeSingle();

    if (updateError) {
      setError(updateError.message);
    } else if (!data) {
      setError('상태가 변경되었습니다. 새로고침 후 확인하세요.');
    } else {
      setMessage('입금 확인 요청을 등록했습니다. 운영팀 확인 후 캠페인이 라이브로 전환됩니다.');
      await loadWorkspace();
    }
    setSubmitting(false);
  }

  const bankTransferInfo = process.env.NEXT_PUBLIC_BANK_TRANSFER_INFO ?? '계좌 정보 미설정 — 운영팀에 문의하세요.';

  return (
    <WorkspaceShell role="brand">
      <div className="app-shell">
        <div className="app-heading">
          <p className="app-eyebrow">BRAND WORKSPACE</p>
          <h1>캠페인 만들기</h1>
          <p className="app-muted">캠페인을 만들고 예산을 입금하면 운영팀 확인 후 라이브로 전환됩니다.</p>
        </div>

        {message && <p className="app-notice" role="status">{message}</p>}
        {error && <p className="app-error" role="alert">{error}</p>}
        {!userId && !loading && <p className="app-muted">로그인이 필요합니다. <a href="/login">로그인으로 이동</a></p>}

        <section className="app-section" aria-labelledby="create-campaign-title">
          <h2 id="create-campaign-title">새 캠페인</h2>
          <form className="app-form" onSubmit={createCampaign}>
            <label>
              제목
              <input onChange={(event) => setTitle(event.target.value)} required value={title} />
            </label>
            <label>
              콘텐츠 타입
              <select onChange={(event) => setContentType(event.target.value as 'clipping' | 'ugc')} value={contentType}>
                <option value="clipping">클리핑</option>
                <option value="ugc">UGC</option>
              </select>
            </label>
            <label>
              카테고리
              <input onChange={(event) => setCategory(event.target.value)} placeholder="예: 음악, 게임" required value={category} />
            </label>
            <label>
              총예산 (원)
              <input min={1} onChange={(event) => setTotalBudget(event.target.value)} required type="number" value={totalBudget} />
            </label>
            <label>
              CPM (1,000뷰당 원)
              <input min={1} onChange={(event) => setCpmRate(event.target.value)} required type="number" value={cpmRate} />
            </label>
            <label>
              클립당 지급 상한 (원)
              <input min={1} onChange={(event) => setPerClipCap(event.target.value)} required type="number" value={perClipCap} />
            </label>
            <label>
              검수 SLA (시간)
              <input min={1} onChange={(event) => setReviewSlaHours(event.target.value)} required type="number" value={reviewSlaHours} />
            </label>
            <div>
              <p className="app-muted" style={{ marginBottom: 8 }}>허용 플랫폼</p>
              <div className="app-action-row">
                {PLATFORM_OPTIONS.map((option) => (
                  <label key={option.value}>
                    <input
                      checked={platforms.includes(option.value)}
                      onChange={() => togglePlatform(option.value)}
                      type="checkbox"
                    />
                    {' '}{option.label}
                  </label>
                ))}
              </div>
            </div>
            <button className="app-button app-button-primary" disabled={submitting || !userId} type="submit">
              캠페인 만들기
            </button>
          </form>
        </section>

        <section className="app-section" aria-labelledby="my-campaigns-title">
          <h2 id="my-campaigns-title">내 캠페인 <span className="app-muted">{campaigns.length}</span></h2>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead><tr><th>제목</th><th>예산</th><th>상태</th><th>처리</th></tr></thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const consumed = settlements
                    .filter((settlement) => settlement.campaign_id === campaign.id)
                    .reduce((sum, settlement) => sum + Number(settlement.amount), 0);
                  return (
                    <tr key={campaign.id}>
                      <td>{campaign.title}</td>
                      <td>
                        {campaign.status === 'live' || campaign.status === 'closed'
                          ? `${consumed.toLocaleString('ko-KR')}원 / ${Number(campaign.total_budget).toLocaleString('ko-KR')}원`
                          : `${Number(campaign.total_budget).toLocaleString('ko-KR')}원`}
                      </td>
                      <td className={statusClass(campaign.status)}>{CAMPAIGN_STATUS_LABEL[campaign.status] ?? campaign.status}</td>
                      <td>
                        {campaign.status === 'draft' ? (
                          <div className="app-action-row">
                            <span className="app-muted">{bankTransferInfo}</span>
                            <button className="app-button" disabled={submitting} onClick={() => void markDeposited(campaign.id)} type="button">
                              입금 완료했습니다
                            </button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!loading && campaigns.length === 0 && <tr><td colSpan={4}>아직 만든 캠페인이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
