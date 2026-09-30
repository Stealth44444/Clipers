'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type Campaign = {
  id: string;
  title: string;
  category: string;
  cpm_rate: number | string;
  review_sla_hours: number;
  allowed_platforms: string[];
};

type Application = {
  id: string;
  campaign_id: string;
  status: string;
  campaign: Pick<Campaign, 'title'> | null;
};

type Clip = {
  id: string;
  campaign_id: string;
  url: string;
  platform: string;
  status: string;
  sla_deadline: string;
  rejection_reason: string | null;
  campaign: Pick<Campaign, 'title'> | null;
};

const applicationStatus: Record<string, string> = {
  applied: '지원 검토 중',
  approved: '지원 승인',
  rejected: '지원 반려',
};

const clipStatus: Record<string, string> = {
  pending_review: '검수 대기',
  approved: '승인',
  rejected: '반려',
};

export default function CreatorWorkspace() {
  const [userId, setUserId] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [clipCampaignId, setClipCampaignId] = useState('');
  const [platform, setPlatform] = useState('');
  const [clipUrl, setClipUrl] = useState('');
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
      const [campaignResult, applicationResult, clipResult] = await Promise.all([
        supabase
          .from('campaigns')
          .select('id,title,category,cpm_rate,review_sla_hours,allowed_platforms')
          .eq('track', 'self_serve')
          .eq('status', 'live')
          .order('created_at', { ascending: false }),
        supabase
          .from('campaign_applications')
          .select('id,campaign_id,status,campaign:campaigns!campaign_applications_campaign_id_fkey(title)')
          .eq('creator_id', userData.user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('clips')
          .select('id,campaign_id,url,platform,status,sla_deadline,rejection_reason,campaign:campaigns!clips_campaign_id_fkey(title)')
          .eq('creator_id', userData.user.id)
          .order('submitted_at', { ascending: false }),
      ]);

      if (campaignResult.error) throw campaignResult.error;
      if (applicationResult.error) throw applicationResult.error;
      if (clipResult.error) throw clipResult.error;

      setCampaigns((campaignResult.data ?? []) as Campaign[]);
      setApplications((applicationResult.data ?? []) as Application[]);
      setClips((clipResult.data ?? []) as Clip[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, []);

  async function applyToCampaign(campaignId: string) {
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const { error: insertError } = await getSupabaseBrowserClient()
        .from('campaign_applications')
        .insert({ campaign_id: campaignId, creator_id: userId });
      if (insertError) throw insertError;
      setMessage('캠페인 지원서를 제출했습니다.');
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '지원서를 제출하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitClip(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const { error: insertError } = await getSupabaseBrowserClient().from('clips').insert({
        campaign_id: clipCampaignId,
        creator_id: userId,
        platform,
        url: clipUrl.trim(),
      });
      if (insertError) throw insertError;
      setClipUrl('');
      setMessage('클립 URL을 제출했습니다. 검수 결과는 이 화면에서 확인할 수 있습니다.');
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '클립을 제출하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  const approvedApplications = applications.filter((application) => application.status === 'approved');
  const selectedCampaign = campaigns.find((campaign) => campaign.id === clipCampaignId);
  const appliedCampaignIds = new Set(applications.map((application) => application.campaign_id));

  return (
    <main className="app-page">
      <div className="app-shell">
        <header className="app-topbar">
          <a className="app-wordmark" href="/">Clipers</a>
          <a href="/login">계정</a>
        </header>
        <div className="app-heading">
          <p className="app-eyebrow">CREATOR WORKSPACE</p>
          <h1>캠페인과 제출 현황</h1>
          <p className="app-muted">캠페인에 지원하고 게시한 클립 URL을 제출하세요.</p>
        </div>

        {message && <p className="app-notice" role="status">{message}</p>}
        {error && <p className="app-error" role="alert">{error}</p>}
        {!userId && !loading && <p className="app-muted">로그인이 필요합니다. <a href="/login">로그인으로 이동</a></p>}
        {loading ? <p className="app-muted">불러오는 중...</p> : null}

        <section className="app-section" aria-labelledby="campaigns-title">
          <h2 id="campaigns-title">지원 가능한 캠페인</h2>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr><th>캠페인</th><th>카테고리</th><th>CPM</th><th>검수 SLA</th><th>플랫폼</th><th>지원</th></tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>{campaign.title}</td>
                    <td>{campaign.category}</td>
                    <td>{Number(campaign.cpm_rate).toLocaleString('ko-KR')}원 / 1,000뷰</td>
                    <td>{campaign.review_sla_hours}시간</td>
                    <td>{campaign.allowed_platforms.join(', ')}</td>
                    <td>
                      <button
                        className="app-button"
                        disabled={submitting || appliedCampaignIds.has(campaign.id) || !userId}
                        onClick={() => void applyToCampaign(campaign.id)}
                        type="button"
                      >
                        {appliedCampaignIds.has(campaign.id) ? '지원 완료' : '지원하기'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && campaigns.length === 0 && <tr><td colSpan={6}>현재 지원 가능한 캠페인이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="app-section" aria-labelledby="applications-title">
          <h2 id="applications-title">내 지원</h2>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead><tr><th>캠페인</th><th>상태</th></tr></thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td>{application.campaign?.title ?? '캠페인'}</td>
                    <td className="app-status">{applicationStatus[application.status] ?? application.status}</td>
                  </tr>
                ))}
                {!loading && applications.length === 0 && <tr><td colSpan={2}>제출한 지원서가 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {approvedApplications.length > 0 && (
          <section className="app-section" aria-labelledby="submit-clip-title">
            <h2 id="submit-clip-title">클립 URL 제출</h2>
            <form className="app-form" onSubmit={submitClip}>
              <label>
                캠페인
                <select
                  onChange={(event) => {
                    setClipCampaignId(event.target.value);
                    setPlatform('');
                  }}
                  required
                  value={clipCampaignId}
                >
                  <option value="">캠페인 선택</option>
                  {approvedApplications.map((application) => (
                    <option key={application.id} value={application.campaign_id}>
                      {application.campaign?.title ?? '캠페인'}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                플랫폼
                <select onChange={(event) => setPlatform(event.target.value)} required value={platform}>
                  <option value="">플랫폼 선택</option>
                  {(selectedCampaign?.allowed_platforms ?? []).map((allowedPlatform) => (
                    <option key={allowedPlatform} value={allowedPlatform}>{allowedPlatform}</option>
                  ))}
                </select>
              </label>
              <label>
                게시된 클립 URL
                <input
                  onChange={(event) => setClipUrl(event.target.value)}
                  placeholder="https://..."
                  required
                  type="url"
                  value={clipUrl}
                />
              </label>
              <button className="app-button app-button-primary" disabled={submitting || !userId} type="submit">
                제출하기
              </button>
            </form>
          </section>
        )}

        <section className="app-section" aria-labelledby="clips-title">
          <h2 id="clips-title">내 클립</h2>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead><tr><th>캠페인</th><th>플랫폼</th><th>제출 URL</th><th>상태</th><th>검수 마감</th><th>반려 사유</th></tr></thead>
              <tbody>
                {clips.map((clip) => (
                  <tr key={clip.id}>
                    <td>{clip.campaign?.title ?? '캠페인'}</td>
                    <td>{clip.platform}</td>
                    <td><a href={clip.url} rel="noreferrer" target="_blank">열기</a></td>
                    <td className="app-status">{clipStatus[clip.status] ?? clip.status}</td>
                    <td>{new Date(clip.sla_deadline).toLocaleString('ko-KR')}</td>
                    <td>{clip.rejection_reason ?? '—'}</td>
                  </tr>
                ))}
                {!loading && clips.length === 0 && <tr><td colSpan={6}>제출한 클립이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}