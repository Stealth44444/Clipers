'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

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
  submitted_at: string;
  sla_deadline: string;
  campaign: { title: string } | null;
  creator: { display_name: string } | null;
};

export default function AdminWorkspace() {
  const [userId, setUserId] = useState('');
  const [applications, setApplications] = useState<ReviewApplication[]>([]);
  const [clips, setClips] = useState<ReviewClip[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
      const [applicationResult, clipResult] = await Promise.all([
        supabase
          .from('campaign_applications')
          .select('id,created_at,campaign:campaigns!campaign_applications_campaign_id_fkey(title),creator:profiles!campaign_applications_creator_id_fkey(display_name)')
          .eq('status', 'applied')
          .order('created_at', { ascending: true }),
        supabase
          .from('clips')
          .select('id,url,platform,submitted_at,sla_deadline,campaign:campaigns!clips_campaign_id_fkey(title),creator:profiles!clips_creator_id_fkey(display_name)')
          .eq('status', 'pending_review')
          .order('sla_deadline', { ascending: true }),
      ]);

      if (applicationResult.error) throw applicationResult.error;
      if (clipResult.error) throw clipResult.error;
      setApplications((applicationResult.data ?? []) as ReviewApplication[]);
      setClips((clipResult.data ?? []) as ReviewClip[]);
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
    const rejectionReason = rejectionReasons[clipId]?.trim() ?? '';
    if (status === 'rejected' && !rejectionReason) {
      setError('클립을 반려하려면 사유를 입력해야 합니다.');
      return;
    }

    setUpdatingId(clipId);
    setError('');
    setMessage('');
    const { error: updateError } = await getSupabaseBrowserClient()
      .from('clips')
      .update({
        status,
        rejection_reason: status === 'rejected' ? rejectionReason : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      })
      .eq('id', clipId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage(status === 'approved' ? '클립을 승인했습니다.' : '사유와 함께 클립을 반려했습니다.');
      await loadQueue();
    }
    setUpdatingId('');
  }

  return (
    <main className="app-page">
      <div className="app-shell">
        <header className="app-topbar">
          <a className="app-wordmark" href="/">Clipers</a>
          <a href="/login">계정</a>
        </header>
        <div className="app-heading">
          <p className="app-eyebrow">PILOT OPERATIONS</p>
          <h1>검수 대기열</h1>
          <p className="app-muted">지원서를 검토하고 제출된 클립의 SLA와 검수 결과를 관리합니다.</p>
        </div>

        {message && <p className="app-notice" role="status">{message}</p>}
        {error && <p className="app-error" role="alert">{error}</p>}
        {!userId && !loading && <p className="app-muted">로그인이 필요합니다. <a href="/login">로그인으로 이동</a></p>}
        {loading && <p className="app-muted">대기열을 불러오는 중...</p>}

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
                      <td>{clip.platform}</td>
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
      </div>
    </main>
  );
}