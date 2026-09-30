'use client';

import { useEffect, useState } from 'react';
import { getOverdueItems, getViewSpikeFlags, platformLabel, rejectClip, resolveDispute, reviewManualViewReport } from '@clipers/db';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import SettlementPanel from './settlement-panel';
import WorkspaceShell from '../workspace-shell';

type ReviewApplication = {
  id: string;
  created_at: string;
  campaign: { title: string } | null;
  creator: { display_name: string } | null;
};

type ReviewClip = {
  id: string;
  url: string;
  platform: string;
  status: string;
  submitted_at: string;
  sla_deadline: string;
  campaign: { title: string } | null;
  creator: { display_name: string } | null;
};

type OpenDispute = {
  id: string;
  clip_id: string;
  reason: string;
  created_at: string;
  clip: { url: string; campaign: { title: string } | null; creator: { display_name: string } | null } | null;
};

type ApprovedClipForAnomaly = {
  id: string;
  url: string;
  campaign: { title: string } | null;
  creator: { display_name: string } | null;
};

type CampaignForOverview = {
  id: string;
  title: string;
  status: string;
  total_budget: number | string;
  brand: { display_name: string } | null;
};

type CampaignOverview = {
  id: string;
  title: string;
  status: string;
  totalBudget: number;
  consumedAmount: number;
  brandName: string;
};

type PendingManualViewReport = {
  id: string;
  clip_id: string;
  reported_view_count: number;
  evidence_url: string;
  created_at: string;
  clip: { url: string; platform: string; campaign: { title: string } | null; creator: { display_name: string } | null } | null;
};

export default function AdminWorkspace() {
  const [userId, setUserId] = useState('');
  const [applications, setApplications] = useState<ReviewApplication[]>([]);
  const [clips, setClips] = useState<ReviewClip[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [disputes, setDisputes] = useState<OpenDispute[]>([]);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [manualViewReports, setManualViewReports] = useState<PendingManualViewReport[]>([]);
  const [campaignOverviews, setCampaignOverviews] = useState<CampaignOverview[]>([]);
  const [anomalies, setAnomalies] = useState<{ clipId: string; previousViewCount: number; currentViewCount: number }[]>([]);
  const [anomalyClips, setAnomalyClips] = useState<Map<string, ApprovedClipForAnomaly>>(new Map());
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const overduePendingClips = getOverdueItems(
    clips.map((clip) => ({
      status: clip.status,
      deadline: clip.sla_deadline,
    })),
    new Date()
  );

  async function loadQueue() {
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
      const [applicationResult, clipResult, disputeResult, manualViewReportResult, approvedClipResult, campaignResult] = await Promise.all([
        supabase
          .from('campaign_applications')
          .select('id,created_at,campaign:campaigns!campaign_applications_campaign_id_fkey(title),creator:profiles!campaign_applications_creator_id_fkey(display_name)')
          .eq('status', 'applied')
          .order('created_at', { ascending: true }),
        supabase
          .from('clips')
          .select('id,url,platform,status,submitted_at,sla_deadline,campaign:campaigns!clips_campaign_id_fkey(title),creator:profiles!clips_creator_id_fkey(display_name)')
          .eq('status', 'pending_review')
          .order('sla_deadline', { ascending: true }),
        supabase
          .from('clip_disputes')
          .select('id,clip_id,reason,created_at,clip:clips!clip_disputes_clip_id_fkey(url,campaign:campaigns!clips_campaign_id_fkey(title),creator:profiles!clips_creator_id_fkey(display_name))')
          .eq('status', 'open')
          .order('created_at', { ascending: true }),
        supabase
          .from('manual_view_reports')
          .select('id,clip_id,reported_view_count,evidence_url,created_at,clip:clips!manual_view_reports_clip_id_fkey(url,platform,campaign:campaigns!clips_campaign_id_fkey(title),creator:profiles!clips_creator_id_fkey(display_name))')
          .eq('status', 'pending')
          .order('created_at', { ascending: true }),
        supabase
          .from('clips')
          .select('id,url,campaign:campaigns!clips_campaign_id_fkey(title),creator:profiles!clips_creator_id_fkey(display_name)')
          .eq('status', 'approved'),
        supabase
          .from('campaigns')
          .select('id,title,status,total_budget,brand:profiles!campaigns_brand_id_fkey(display_name)')
          .in('status', ['pending_escrow', 'live', 'closed'])
          .order('created_at', { ascending: false }),
      ]);

      if (applicationResult.error) throw applicationResult.error;
      if (clipResult.error) throw clipResult.error;
      if (disputeResult.error) throw disputeResult.error;
      if (manualViewReportResult.error) throw manualViewReportResult.error;
      if (approvedClipResult.error) throw approvedClipResult.error;
      if (campaignResult.error) throw campaignResult.error;
      setApplications((applicationResult.data ?? []) as ReviewApplication[]);
      setClips((clipResult.data ?? []) as ReviewClip[]);
      setDisputes((disputeResult.data ?? []) as unknown as OpenDispute[]);
      setManualViewReports((manualViewReportResult.data ?? []) as unknown as PendingManualViewReport[]);

      const campaignsForOverview = (campaignResult.data ?? []) as CampaignForOverview[];
      if (campaignsForOverview.length > 0) {
        const campaignIds = campaignsForOverview.map((campaign) => campaign.id);
        const consumedByCampaign = new Map<string, number>();
        let settlementOffset = 0;
        while (true) {
          const { data: settlementRows, error: settlementError } = await supabase
            .from('settlements')
            .select('campaign_id,amount')
            .in('campaign_id', campaignIds)
            .range(settlementOffset, settlementOffset + 999);

          if (settlementError) throw settlementError;
          const page = (settlementRows ?? []) as { campaign_id: string; amount: number | string }[];
          for (const row of page) {
            consumedByCampaign.set(row.campaign_id, (consumedByCampaign.get(row.campaign_id) ?? 0) + Number(row.amount));
          }
          settlementOffset += page.length;
          if (page.length < 1000) break;
        }

        setCampaignOverviews(
          campaignsForOverview.map((campaign) => ({
            id: campaign.id,
            title: campaign.title,
            status: campaign.status,
            totalBudget: Number(campaign.total_budget),
            consumedAmount: consumedByCampaign.get(campaign.id) ?? 0,
            brandName: campaign.brand?.display_name ?? '브랜드',
          }))
        );
      } else {
        setCampaignOverviews([]);
      }

      const approvedClips = (approvedClipResult.data ?? []) as ApprovedClipForAnomaly[];
      setAnomalyClips(new Map(approvedClips.map((clip) => [clip.id, clip])));

      if (approvedClips.length > 0) {
        const lookbackStart = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const approvedClipIds = approvedClips.map((clip) => clip.id);
        const snapshotsByClip = new Map<string, { capturedAt: string; viewCount: number }[]>();

        let offset = 0;
        while (true) {
          const { data, error: snapshotsError } = await supabase
            .from('view_snapshots')
            .select('clip_id,view_count,captured_at')
            .in('clip_id', approvedClipIds)
            .gte('captured_at', lookbackStart)
            .order('captured_at', { ascending: true })
            .range(offset, offset + 999);

          if (snapshotsError) throw snapshotsError;
          const page = (data ?? []) as { clip_id: string; view_count: number; captured_at: string }[];
          for (const row of page) {
            const existing = snapshotsByClip.get(row.clip_id) ?? [];
            existing.push({ capturedAt: row.captured_at, viewCount: Number(row.view_count) });
            snapshotsByClip.set(row.clip_id, existing);
          }
          offset += page.length;
          if (page.length < 1000) break;
        }

        const flags = getViewSpikeFlags(
          [...snapshotsByClip.entries()].map(([clipId, snapshots]) => ({ clipId, snapshots }))
        );
        setAnomalies(flags);
      } else {
        setAnomalies([]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '검수 대기열을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  async function updateApplication(applicationId: string, status: 'approved' | 'rejected') {
    setUpdatingId(applicationId);
    setError('');
    setMessage('');

    const { error: updateError } = await getSupabaseBrowserClient()
      .from('campaign_applications')
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: userId })
      .eq('id', applicationId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage(status === 'approved' ? '지원서를 승인했습니다.' : '지원서를 반려했습니다.');
      await loadQueue();
    }
    setUpdatingId('');
  }

  async function reviewClip(clipId: string, status: 'approved' | 'rejected') {
    setUpdatingId(clipId);
    setError('');
    setMessage('');

    const supabase = getSupabaseBrowserClient();
    let failure: string | null = null;
    if (status === 'rejected') {
      const result = await rejectClip(supabase, clipId, rejectionReasons[clipId] ?? '', userId);
      if (!result.ok) failure = result.message;
    } else {
      const { error: updateError } = await supabase
        .from('clips')
        .update({ status: 'approved', rejection_reason: null, reviewed_at: new Date().toISOString(), reviewed_by: userId })
        .eq('id', clipId);
      if (updateError) failure = updateError.message;
    }

    if (failure) {
      setError(failure);
    } else {
      setMessage(status === 'approved' ? '클립을 승인했습니다.' : '사유와 함께 클립을 반려했습니다.');
      await loadQueue();
    }
    setUpdatingId('');
  }

  async function resolveDisputeAction(disputeId: string) {
    const note = resolutionNotes[disputeId]?.trim() ?? '';
    setUpdatingId(disputeId);
    setError('');
    setMessage('');

    const result = await resolveDispute(getSupabaseBrowserClient(), disputeId, note);
    if (!result.ok) {
      setError(result.message);
    } else {
      setMessage('이의제기 처리 결과를 기록했습니다.');
      await loadQueue();
    }
    setUpdatingId('');
  }

  async function confirmEscrow(campaignId: string) {
    setUpdatingId(campaignId);
    setError('');
    setMessage('');

    const { data, error: updateError } = await getSupabaseBrowserClient()
      .from('campaign_escrow')
      .update({ escrow_status: 'confirmed', confirmed_by: userId, confirmed_at: new Date().toISOString() })
      .eq('campaign_id', campaignId)
      .eq('escrow_status', 'awaiting_manual_confirm')
      .select('campaign_id')
      .maybeSingle();

    if (updateError) {
      setError(updateError.message);
    } else if (!data) {
      setError('이미 처리되었거나 대기 중인 입금이 아닙니다.');
    } else {
      setMessage('입금을 확인하고 캠페인을 라이브로 전환했습니다.');
      await loadQueue();
    }
    setUpdatingId('');
  }

  async function reviewManualViewReportAction(reportId: string, decision: 'verified' | 'rejected') {
    setUpdatingId(reportId);
    setError('');
    setMessage('');

    const result = await reviewManualViewReport(getSupabaseBrowserClient(), reportId, userId, decision);
    if (!result.ok) {
      setError(result.message);
    } else {
      setMessage(decision === 'verified' ? '조회수 신고를 확인 처리하고 정산 대상에 반영했습니다.' : '조회수 신고를 반려했습니다.');
      await loadQueue();
    }
    setUpdatingId('');
  }

  return (
    <WorkspaceShell role="admin">
      <div className="app-shell">
        <div className="app-heading">
          <h1>검수 대기열</h1>
          <p className="app-muted">지원서를 검토하고 제출된 클립의 SLA와 검수 결과를 관리합니다.</p>
        </div>

        {message && <p className="app-notice" role="status">{message}</p>}
        {error && <p className="app-error" role="alert">{error}</p>}
        {!userId && !loading && <p className="app-muted">로그인이 필요합니다. <a href="/login">로그인으로 이동</a></p>}
        {loading && <p className="app-muted">대기열을 불러오는 중...</p>}
        {!loading && overduePendingClips.length > 0 && (
          <p className="app-notice" role="status">
            SLA 경고: {overduePendingClips.length}건의 검수 요청이 마감 시간을 초과했습니다.
          </p>
        )}
        {!loading && anomalies.length > 0 && (
          <p className="app-error" role="alert">
            이상 트래픽 경고: {anomalies.length}건의 승인 클립에서 급격한 조회수 증가가 감지되었습니다 (임계값 잠정 기준, 실제 정지/이의제기 처리는 사람이 검토).
          </p>
        )}

        <section className="app-section" aria-labelledby="campaign-overview-title">
          <h2 id="campaign-overview-title">캠페인 현황 <span className="app-muted">{campaignOverviews.length}</span></h2>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead><tr><th>캠페인</th><th>브랜드</th><th>상태</th><th>예산 소진</th><th>소진율</th><th>처리</th></tr></thead>
              <tbody>
                {campaignOverviews.map((campaign) => {
                  const rate = campaign.totalBudget > 0 ? Math.min(1, campaign.consumedAmount / campaign.totalBudget) : 0;
                  return (
                    <tr key={campaign.id}>
                      <td>{campaign.title}</td>
                      <td>{campaign.brandName}</td>
                      <td className={
                        campaign.status === 'closed' ? 'app-status app-status-neutral'
                        : campaign.status === 'pending_escrow' ? 'app-status app-status-requested'
                        : 'app-status app-status-positive'
                      }>
                        {campaign.status === 'closed' ? '마감' : campaign.status === 'pending_escrow' ? '입금 확인 대기' : '진행 중'}
                      </td>
                      <td>{campaign.consumedAmount.toLocaleString('ko-KR')}원 / {campaign.totalBudget.toLocaleString('ko-KR')}원</td>
                      <td>
                        {campaign.status === 'pending_escrow' ? '—' : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 120, height: 6, borderRadius: 3, background: '#333', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.round(rate * 100)}%`, height: '100%', background: 'var(--brand-primary)' }} />
                            </div>
                            <span className="app-muted">{Math.round(rate * 100)}%</span>
                          </div>
                        )}
                      </td>
                      <td>
                        {campaign.status === 'pending_escrow' ? (
                          <button className="app-button app-button-primary" disabled={updatingId === campaign.id} onClick={() => void confirmEscrow(campaign.id)} type="button">
                            입금 확인
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
                {!loading && campaignOverviews.length === 0 && <tr><td colSpan={6}>진행 중이거나 마감된 캠페인이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="app-section" aria-labelledby="application-queue-title">
          <h2 id="application-queue-title">크리에이터 지원서 <span className="app-muted">{applications.length}</span></h2>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead><tr><th>접수 시각</th><th>캠페인</th><th>크리에이터</th><th>처리</th></tr></thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td>{new Date(application.created_at).toLocaleString('ko-KR')}</td>
                    <td>{application.campaign?.title ?? '캠페인'}</td>
                    <td>{application.creator?.display_name ?? '크리에이터'}</td>
                    <td>
                      <div className="app-action-row">
                        <button className="app-button app-button-primary" disabled={updatingId === application.id} onClick={() => void updateApplication(application.id, 'approved')} type="button">승인</button>
                        <button className="app-button" disabled={updatingId === application.id} onClick={() => void updateApplication(application.id, 'rejected')} type="button">반려</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && applications.length === 0 && <tr><td colSpan={4}>검토할 지원서가 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="app-section" aria-labelledby="clip-queue-title">
          <h2 id="clip-queue-title">제출 클립 <span className="app-muted">{clips.length}</span></h2>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead><tr><th>마감</th><th>캠페인 / 크리에이터</th><th>플랫폼</th><th>클립</th><th>반려 사유</th><th>처리</th></tr></thead>
              <tbody>
                {clips.map((clip) => {
                  const overdue = new Date(clip.sla_deadline).getTime() < Date.now();
                  return (
                    <tr key={clip.id}>
                      <td className={overdue ? 'app-status app-status-overdue' : ''}>
                        {overdue ? 'SLA 초과 · ' : ''}{new Date(clip.sla_deadline).toLocaleString('ko-KR')}
                      </td>
                      <td>{clip.campaign?.title ?? '캠페인'}<br /><span className="app-muted">{clip.creator?.display_name ?? '크리에이터'}</span></td>
                      <td>{platformLabel(clip.platform)}</td>
                      <td><a href={clip.url} rel="noreferrer" target="_blank">클립 열기</a></td>
                      <td>
                        <textarea
                          aria-label={`${clip.campaign?.title ?? '캠페인'} 반려 사유`}
                          onChange={(event) => setRejectionReasons((current) => ({ ...current, [clip.id]: event.target.value }))}
                          placeholder="반려할 때 사유 필수"
                          value={rejectionReasons[clip.id] ?? ''}
                        />
                      </td>
                      <td>
                        <div className="app-action-row">
                          <button className="app-button app-button-primary" disabled={updatingId === clip.id} onClick={() => void reviewClip(clip.id, 'approved')} type="button">승인</button>
                          <button className="app-button" disabled={updatingId === clip.id} onClick={() => void reviewClip(clip.id, 'rejected')} type="button">반려</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && clips.length === 0 && <tr><td colSpan={6}>검수할 클립이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        {anomalies.length > 0 && (
          <section className="app-section" aria-labelledby="anomaly-queue-title">
            <h2 id="anomaly-queue-title">이상 트래픽 플래그 <span className="app-muted">{anomalies.length}</span></h2>
            <p className="app-muted">최근 48시간 스냅샷 기준, 1시간 내 3배 이상 또는 50,000회 이상 급증한 승인 클립입니다. 기준값은 잠정치이며 실사용 데이터로 재조정이 필요합니다.</p>
            <div className="app-table-wrap">
              <table className="app-table">
                <thead><tr><th>캠페인 / 크리에이터</th><th>클립</th><th>변화</th></tr></thead>
                <tbody>
                  {anomalies.map((flag) => {
                    const clip = anomalyClips.get(flag.clipId);
                    return (
                      <tr key={flag.clipId}>
                        <td>{clip?.campaign?.title ?? '캠페인'}<br /><span className="app-muted">{clip?.creator?.display_name ?? '크리에이터'}</span></td>
                        <td>{clip ? <a href={clip.url} rel="noreferrer" target="_blank">클립 열기</a> : flag.clipId}</td>
                        <td>{flag.previousViewCount.toLocaleString('ko-KR')} → {flag.currentViewCount.toLocaleString('ko-KR')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="app-section" aria-labelledby="manual-view-report-queue-title">
          <h2 id="manual-view-report-queue-title">조회수 신고 검토 <span className="app-muted">{manualViewReports.length}</span></h2>
          <p className="app-muted">틱톡·릴스 등 자동 수집이 안 되는 플랫폼은 크리에이터가 신고한 조회수를 증빙과 대조해 확인합니다. 확인 처리하면 정산 대상 스냅샷으로 반영됩니다.</p>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead><tr><th>접수 시각</th><th>캠페인 / 크리에이터</th><th>클립</th><th>신고 조회수</th><th>증빙</th><th>처리</th></tr></thead>
              <tbody>
                {manualViewReports.map((report) => (
                  <tr key={report.id}>
                    <td>{new Date(report.created_at).toLocaleString('ko-KR')}</td>
                    <td>{report.clip?.campaign?.title ?? '캠페인'}<br /><span className="app-muted">{report.clip?.creator?.display_name ?? '크리에이터'}</span></td>
                    <td>{report.clip ? <a href={report.clip.url} rel="noreferrer" target="_blank">클립 열기</a> : '—'}</td>
                    <td>{report.reported_view_count.toLocaleString('ko-KR')}</td>
                    <td><a href={report.evidence_url} rel="noreferrer" target="_blank">증빙 열기</a></td>
                    <td>
                      <div className="app-action-row">
                        <button className="app-button app-button-primary" disabled={updatingId === report.id} onClick={() => void reviewManualViewReportAction(report.id, 'verified')} type="button">확인</button>
                        <button className="app-button" disabled={updatingId === report.id} onClick={() => void reviewManualViewReportAction(report.id, 'rejected')} type="button">반려</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && manualViewReports.length === 0 && <tr><td colSpan={6}>검토할 조회수 신고가 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="app-section" aria-labelledby="dispute-queue-title">
          <h2 id="dispute-queue-title">이의제기 <span className="app-muted">{disputes.length}</span></h2>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead><tr><th>접수 시각</th><th>캠페인 / 크리에이터</th><th>클립</th><th>사유</th><th>처리 결과</th></tr></thead>
              <tbody>
                {disputes.map((dispute) => (
                  <tr key={dispute.id}>
                    <td>{new Date(dispute.created_at).toLocaleString('ko-KR')}</td>
                    <td>{dispute.clip?.campaign?.title ?? '캠페인'}<br /><span className="app-muted">{dispute.clip?.creator?.display_name ?? '크리에이터'}</span></td>
                    <td>{dispute.clip ? <a href={dispute.clip.url} rel="noreferrer" target="_blank">클립 열기</a> : '—'}</td>
                    <td>{dispute.reason}</td>
                    <td>
                      <div className="app-action-row">
                        <textarea
                          aria-label="이의제기 처리 결과"
                          onChange={(event) => setResolutionNotes((current) => ({ ...current, [dispute.id]: event.target.value }))}
                          placeholder="처리 결과 입력 (필수)"
                          value={resolutionNotes[dispute.id] ?? ''}
                        />
                        <button
                          className="app-button app-button-primary"
                          disabled={updatingId === dispute.id || !(resolutionNotes[dispute.id] ?? '').trim()}
                          onClick={() => void resolveDisputeAction(dispute.id)}
                          type="button"
                        >
                          처리 완료
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && disputes.length === 0 && <tr><td colSpan={5}>대기 중인 이의제기가 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {userId && <SettlementPanel userId={userId} />}
      </div>
    </WorkspaceShell>
  );
}