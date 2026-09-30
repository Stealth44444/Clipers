'use client';

import { useEffect, useState } from 'react';
import { extractYouTubeVideoId, fileDispute, fileManualViewReport, platformLabel, platformLabels } from '@clipers/db';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import WorkspaceShell from '../workspace-shell';

type Campaign = {
  id: string;
  title: string;
  category: string;
  review_sla_hours: number;
  allowed_platforms: string[];
};

type PlatformRateRow = {
  campaign_id: string;
  platform: string;
  cpm_rate: number | string;
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

type Dispute = {
  id: string;
  clip_id: string;
  reason: string;
  status: 'open' | 'resolved';
  resolution_note: string | null;
};

type ManualViewReport = {
  id: string;
  clip_id: string;
  reported_view_count: number;
  status: 'pending' | 'verified' | 'rejected';
};

type Settlement = {
  id: string;
  period: string;
  amount: number | string;
  verified_views: number;
  withholding_amount: number | string;
  status: string;
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

const settlementStatus: Record<string, string> = {
  pending: '정산 대기',
  requested: '지급 요청',
  paid: '지급 완료',
};

function statusClass(status: string): string {
  if (status === 'approved' || status === 'paid') return 'app-status app-status-positive';
  if (status === 'rejected') return 'app-status app-status-negative';
  if (status === 'requested') return 'app-status app-status-requested';
  return 'app-status app-status-neutral';
}

export default function CreatorWorkspace() {
  const [userId, setUserId] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [platformRates, setPlatformRates] = useState<PlatformRateRow[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [disputeReasons, setDisputeReasons] = useState<Record<string, string>>({});
  const [manualViewReports, setManualViewReports] = useState<ManualViewReport[]>([]);
  const [manualReportDrafts, setManualReportDrafts] = useState<Record<string, { viewCount: string; evidenceUrl: string }>>({});
  const [settlements, setSettlements] = useState<Settlement[]>([]);
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
      const [campaignResult, platformRateResult, applicationResult, clipResult, disputeResult, manualViewReportResult, settlementResult] = await Promise.all([
        supabase
          .from('campaigns')
          .select('id,title,category,review_sla_hours,allowed_platforms')
          .eq('track', 'self_serve')
          .eq('status', 'live')
          .order('created_at', { ascending: false }),
        supabase
          .from('campaign_platform_rates')
          .select('campaign_id,platform,cpm_rate'),
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
        supabase
          .from('clip_disputes')
          .select('id,clip_id,reason,status,resolution_note')
          .eq('creator_id', userData.user.id),
        supabase
          .from('manual_view_reports')
          .select('id,clip_id,reported_view_count,status')
          .eq('creator_id', userData.user.id),
        supabase
          .from('settlements')
          .select('id,period,amount,verified_views,withholding_amount,status,campaign:campaigns!settlements_campaign_id_fkey(title)')
          .eq('creator_id', userData.user.id)
          .order('period', { ascending: false }),
      ]);

      if (campaignResult.error) throw campaignResult.error;
      if (platformRateResult.error) throw platformRateResult.error;
      if (applicationResult.error) throw applicationResult.error;
      if (clipResult.error) throw clipResult.error;
      if (disputeResult.error) throw disputeResult.error;
      if (manualViewReportResult.error) throw manualViewReportResult.error;
      if (settlementResult.error) throw settlementResult.error;

      setCampaigns((campaignResult.data ?? []) as Campaign[]);
      setPlatformRates((platformRateResult.data ?? []) as PlatformRateRow[]);
      setApplications((applicationResult.data ?? []) as Application[]);
      setClips((clipResult.data ?? []) as Clip[]);
      setDisputes((disputeResult.data ?? []) as Dispute[]);
      setManualViewReports((manualViewReportResult.data ?? []) as ManualViewReport[]);
      setSettlements((settlementResult.data ?? []) as unknown as Settlement[]);
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

  async function submitDispute(clipId: string) {
    const reason = disputeReasons[clipId]?.trim() ?? '';
    setSubmitting(true);
    setError('');
    setMessage('');

    const result = await fileDispute(getSupabaseBrowserClient(), clipId, userId, reason);
    if (!result.ok) {
      setError(result.message);
    } else {
      setMessage('이의제기를 접수했습니다. 운영팀이 검토 후 결과를 알려드립니다.');
      setDisputeReasons((current) => ({ ...current, [clipId]: '' }));
      await loadWorkspace();
    }
    setSubmitting(false);
  }

  async function submitManualViewReport(clipId: string) {
    const draft = manualReportDrafts[clipId] ?? { viewCount: '', evidenceUrl: '' };
    const viewCount = Number(draft.viewCount);
    setSubmitting(true);
    setError('');
    setMessage('');

    const result = await fileManualViewReport(getSupabaseBrowserClient(), clipId, userId, viewCount, draft.evidenceUrl);
    if (!result.ok) {
      setError(result.message);
    } else {
      setMessage('조회수 신고를 접수했습니다. 운영팀 확인 후 정산에 반영됩니다.');
      setManualReportDrafts((current) => ({ ...current, [clipId]: { viewCount: '', evidenceUrl: '' } }));
      await loadWorkspace();
    }
    setSubmitting(false);
  }

  async function requestSettlement(settlementId: string) {
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const { data, error: updateError } = await getSupabaseBrowserClient()
        .from('settlements')
        .update({ status: 'requested' })
        .eq('id', settlementId)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error('정산 상태가 변경되었습니다. 새로고침 후 확인하세요.');
      setMessage('지급 요청을 등록했습니다.');
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '지급 요청을 등록하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  const approvedApplications = applications.filter((application) => application.status === 'approved');
  const selectedCampaign = campaigns.find((campaign) => campaign.id === clipCampaignId);
  const appliedCampaignIds = new Set(applications.map((application) => application.campaign_id));
  const disputeByClipId = new Map(disputes.map((dispute) => [dispute.clip_id, dispute]));
  const totalVerifiedViews = settlements.reduce((sum, settlement) => sum + Number(settlement.verified_views), 0);
  const pendingSettlementAmount = settlements
    .filter((settlement) => settlement.status === 'pending' || settlement.status === 'requested')
    .reduce((sum, settlement) => sum + Number(settlement.amount), 0);
  const paidSettlementAmount = settlements
    .filter((settlement) => settlement.status === 'paid')
    .reduce((sum, settlement) => sum + Number(settlement.amount), 0);
  const manualReportsByClipId = new Map<string, ManualViewReport[]>();
  for (const report of manualViewReports) {
    const existing = manualReportsByClipId.get(report.clip_id) ?? [];
    existing.push(report);
    manualReportsByClipId.set(report.clip_id, existing);
  }

  return (
    <WorkspaceShell role="creator">
      <div className="app-shell">
        <div className="app-heading">
          <p className="app-eyebrow">CREATOR WORKSPACE</p>
          <h1>캠페인과 제출 현황</h1>
          <p className="app-muted">캠페인에 지원하고 게시한 클립 URL을 제출하세요.</p>
        </div>

        {message && <p className="app-notice" role="status">{message}</p>}
        {error && <p className="app-error" role="alert">{error}</p>}
        {!userId && !loading && <p className="app-muted">로그인이 필요합니다. <a href="/login">로그인으로 이동</a></p>}
        {loading ? <p className="app-muted">불러오는 중...</p> : null}

        {userId && !loading && (
          <div className="app-stat-row">
            <div className="app-stat-tile">
              <p className="app-stat-label">누적 검증 조회수</p>
              <p className="app-stat-value">{totalVerifiedViews.toLocaleString('ko-KR')}</p>
            </div>
            <div className="app-stat-tile">
              <p className="app-stat-label">정산대기금</p>
              <p className="app-stat-value">{pendingSettlementAmount.toLocaleString('ko-KR')}원</p>
            </div>
            <div className="app-stat-tile">
              <p className="app-stat-label">누적 수익 (지급완료)</p>
              <p className="app-stat-value">{paidSettlementAmount.toLocaleString('ko-KR')}원</p>
            </div>
          </div>
        )}

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
                    <td>
                      {platformRates
                        .filter((rate) => rate.campaign_id === campaign.id)
                        .map((rate) => `${platformLabel(rate.platform)}: ${Number(rate.cpm_rate).toLocaleString('ko-KR')}원`)
                        .join(', ') || '—'}
                    </td>
                    <td>{campaign.review_sla_hours}시간</td>
                    <td>{platformLabels(campaign.allowed_platforms)}</td>
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
                    <td className={statusClass(application.status)}>{applicationStatus[application.status] ?? application.status}</td>
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
                    <option key={allowedPlatform} value={allowedPlatform}>{platformLabel(allowedPlatform)}</option>
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
              <thead><tr><th>캠페인</th><th>플랫폼</th><th>제출 URL</th><th>상태</th><th>검수 마감</th><th>반려 사유</th><th>조회수 신고</th><th>이의제기</th></tr></thead>
              <tbody>
                {clips.map((clip) => {
                  const dispute = disputeByClipId.get(clip.id);
                  const isAutoTracked = extractYouTubeVideoId(clip.url) !== null;
                  const reportsForClip = manualReportsByClipId.get(clip.id) ?? [];
                  const verifiedReport = reportsForClip.find((report) => report.status === 'verified');
                  const pendingReport = reportsForClip.find((report) => report.status === 'pending');
                  const draft = manualReportDrafts[clip.id] ?? { viewCount: '', evidenceUrl: '' };
                  return (
                    <tr key={clip.id}>
                      <td>{clip.campaign?.title ?? '캠페인'}</td>
                      <td>{platformLabel(clip.platform)}</td>
                      <td><a href={clip.url} rel="noreferrer" target="_blank">열기</a></td>
                      <td className={statusClass(clip.status)}>{clipStatus[clip.status] ?? clip.status}</td>
                      <td>{new Date(clip.sla_deadline).toLocaleString('ko-KR')}</td>
                      <td>{clip.rejection_reason ?? '—'}</td>
                      <td>
                        {isAutoTracked ? (
                          <span className="app-muted">자동 수집</span>
                        ) : clip.status !== 'approved' ? (
                          '—'
                        ) : verifiedReport ? (
                          <span className="app-status app-status-positive">확인됨: {verifiedReport.reported_view_count.toLocaleString('ko-KR')}회</span>
                        ) : pendingReport ? (
                          <span className="app-status app-status-requested">검토 중: {pendingReport.reported_view_count.toLocaleString('ko-KR')}회</span>
                        ) : (
                          <div className="app-action-row">
                            <input
                              aria-label="신고 조회수"
                              onChange={(event) =>
                                setManualReportDrafts((current) => ({
                                  ...current,
                                  [clip.id]: { ...draft, viewCount: event.target.value },
                                }))
                              }
                              placeholder="조회수"
                              type="number"
                              value={draft.viewCount}
                            />
                            <input
                              aria-label="증빙 스크린샷 URL"
                              onChange={(event) =>
                                setManualReportDrafts((current) => ({
                                  ...current,
                                  [clip.id]: { ...draft, evidenceUrl: event.target.value },
                                }))
                              }
                              placeholder="스크린샷 URL"
                              type="url"
                              value={draft.evidenceUrl}
                            />
                            <button
                              className="app-button"
                              disabled={submitting || !draft.viewCount || !draft.evidenceUrl}
                              onClick={() => void submitManualViewReport(clip.id)}
                              type="button"
                            >
                              신고
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        {dispute ? (
                          <span className={dispute.status === 'resolved' ? 'app-status app-status-positive' : 'app-status app-status-requested'}>
                            {dispute.status === 'resolved' ? `처리 완료: ${dispute.resolution_note ?? ''}` : '검토 중'}
                          </span>
                        ) : clip.status === 'rejected' ? (
                          <div className="app-action-row">
                            <textarea
                              aria-label={`${clip.campaign?.title ?? '캠페인'} 이의제기 사유`}
                              onChange={(event) => setDisputeReasons((current) => ({ ...current, [clip.id]: event.target.value }))}
                              placeholder="검수 결과에 이의가 있다면 사유를 입력하세요"
                              value={disputeReasons[clip.id] ?? ''}
                            />
                            <button
                              className="app-button"
                              disabled={submitting || !(disputeReasons[clip.id] ?? '').trim()}
                              onClick={() => void submitDispute(clip.id)}
                              type="button"
                            >
                              이의제기
                            </button>
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
                {!loading && clips.length === 0 && <tr><td colSpan={8}>제출한 클립이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="app-section" aria-labelledby="settlements-title">
          <h2 id="settlements-title">내 정산</h2>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead><tr><th>정산 주</th><th>캠페인</th><th>검증 조회수</th><th>총액</th><th>원천징수</th><th>상태</th><th>요청</th></tr></thead>
              <tbody>
                {settlements.map((settlement) => (
                  <tr key={settlement.id}>
                    <td>{settlement.period}</td>
                    <td>{settlement.campaign?.title ?? '캠페인'}</td>
                    <td>{Number(settlement.verified_views).toLocaleString('ko-KR')}</td>
                    <td>{Number(settlement.amount).toLocaleString('ko-KR')}원</td>
                    <td>{Number(settlement.withholding_amount).toLocaleString('ko-KR')}원</td>
                    <td className={statusClass(settlement.status)}>{settlementStatus[settlement.status] ?? settlement.status}</td>
                    <td>
                      {settlement.status === 'pending' ? (
                        <button className="app-button" disabled={submitting || !userId} onClick={() => void requestSettlement(settlement.id)} type="button">지급 요청</button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {!loading && settlements.length === 0 && <tr><td colSpan={7}>정산 내역이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}