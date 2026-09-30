import { notFound } from 'next/navigation';
import Link from 'next/link';
import { platformLabel, platformLabels, rankCreatorEarnings, rollupDailyViews } from '@clipers/db';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { creatorLoginUrl } from '@/lib/urls';
import { ViewsChart } from './views-chart';

export const revalidate = 60;

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id,title,category,total_budget,content_requirements,reference_url,cover_image_url,allowed_platforms,brand:profiles!campaigns_brand_id_fkey(display_name)')
    .eq('id', id)
    .eq('track', 'self_serve')
    .eq('status', 'live')
    .maybeSingle();

  if (!campaign) notFound();
  const brandName = (campaign as unknown as { brand: { display_name: string } | null }).brand?.display_name ?? '브랜드';

  const [{ data: rates }, { data: applications }, { data: settlements }, { data: approvedClips }] = await Promise.all([
    supabase.from('campaign_platform_rates').select('platform,cpm_rate,min_payout,max_payout').eq('campaign_id', id),
    supabase.from('campaign_applications').select('id').eq('campaign_id', id),
    supabase
      .from('settlements')
      .select('creator_id,amount,creator:profiles!settlements_creator_id_fkey(display_name)')
      .eq('campaign_id', id),
    supabase.from('clips').select('id').eq('campaign_id', id).eq('status', 'approved'),
  ]);

  const clipIds = (approvedClips ?? []).map((clip) => (clip as { id: string }).id);
  let dailyViews: { date: string; totalViews: number }[] = [];
  if (clipIds.length > 0) {
    const { data: snapshotRows } = await supabase
      .from('view_snapshots')
      .select('clip_id,view_count,captured_at')
      .in('clip_id', clipIds);
    const byClip = new Map<string, { capturedAt: string; viewCount: number }[]>();
    for (const row of (snapshotRows ?? []) as { clip_id: string; view_count: number; captured_at: string }[]) {
      const existing = byClip.get(row.clip_id) ?? [];
      existing.push({ capturedAt: row.captured_at, viewCount: Number(row.view_count) });
      byClip.set(row.clip_id, existing);
    }
    dailyViews = rollupDailyViews([...byClip.entries()].map(([clipId, snapshots]) => ({ clipId, snapshots })));
  }

  const settlementRows = (settlements ?? []) as unknown as { creator_id: string; amount: number; creator: { display_name: string } | null }[];
  const rankedCreators = rankCreatorEarnings(
    settlementRows.map((row) => ({ creatorId: row.creator_id, creatorName: row.creator?.display_name ?? '크리에이터', amount: Number(row.amount) }))
  );
  const leaderboard = rankedCreators.slice(0, 3);
  const consumedBudget = settlementRows.reduce((sum, row) => sum + Number(row.amount), 0);
  const averageEarning = rankedCreators.length > 0 ? Math.round(consumedBudget / rankedCreators.length) : 0;
  const totalBudget = Number((campaign as { total_budget: number }).total_budget);
  const latestTotalViews = dailyViews.at(-1)?.totalViews ?? 0;
  const medal = ['🥇', '🥈', '🥉'];

  return (
    <main className="app-page">
      <header className="app-global-header">
        <Link className="app-wordmark" href="/"><img alt="Clipers" src="/brand/clipers-wordmark.svg" /></Link>
        <nav className="app-global-nav" aria-label="서비스">
          <Link href="/discover">Discover</Link>
        </nav>
        <a href={creatorLoginUrl}>지원하기</a>
      </header>
      <div className="app-shell">
        <div
          style={{
            height: 240,
            borderRadius: 12,
            background: (campaign as { cover_image_url: string | null }).cover_image_url
              ? `url(${(campaign as { cover_image_url: string | null }).cover_image_url}) center/cover`
              : '#222',
          }}
        />
        <div className="app-heading">
          <p className="app-eyebrow">{brandName}</p>
          <h1>{(campaign as { title: string }).title}</h1>
          <p className="app-muted">
            {(campaign as { category: string }).category} · 참여자 {(applications ?? []).length}명 ·{' '}
            {platformLabels((campaign as { allowed_platforms: string[] }).allowed_platforms)}
          </p>
          <a className="app-button app-button-primary" href={creatorLoginUrl} style={{ display: 'inline-flex', marginTop: 12 }}>
            지원하기
          </a>
        </div>

        <section className="app-section" aria-labelledby="rates-title">
          <h2 id="rates-title">플랫폼별 정산표</h2>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead><tr><th>플랫폼</th><th>1,000뷰당</th><th>최소 지급</th><th>최대 지급</th></tr></thead>
              <tbody>
                {(rates ?? []).map((rate) => {
                  const row = rate as { platform: string; cpm_rate: number; min_payout: number; max_payout: number };
                  return (
                    <tr key={row.platform}>
                      <td>{platformLabel(row.platform)}</td>
                      <td>{Number(row.cpm_rate).toLocaleString('ko-KR')}원</td>
                      <td>{Number(row.min_payout).toLocaleString('ko-KR')}원</td>
                      <td>{Number(row.max_payout).toLocaleString('ko-KR')}원</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="app-section" aria-labelledby="budget-title">
          <h2 id="budget-title">예산</h2>
          <p style={{ fontSize: 28, fontFamily: 'var(--font-heading)' }}>
            {consumedBudget.toLocaleString('ko-KR')}원 <span className="app-muted" style={{ fontSize: 16 }}>/ {totalBudget.toLocaleString('ko-KR')}원</span>
          </p>
          <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#333', overflow: 'hidden' }}>
            <div style={{ width: `${totalBudget > 0 ? Math.min(100, Math.round((consumedBudget / totalBudget) * 100)) : 0}%`, height: '100%', background: 'var(--brand-primary)' }} />
          </div>
          {(campaign as { content_requirements: string | null }).content_requirements && (
            <p className="app-muted" style={{ marginTop: 16 }}>
              콘텐츠 요구사항: {(campaign as { content_requirements: string | null }).content_requirements}
            </p>
          )}
          {(campaign as { reference_url: string | null }).reference_url && (
            <p className="app-muted">
              참고 자료: <a href={(campaign as { reference_url: string }).reference_url} rel="noreferrer" target="_blank">링크 열기</a>
            </p>
          )}
        </section>

        {leaderboard.length > 0 && (
          <section className="app-section" aria-labelledby="leaderboard-title">
            <h2 id="leaderboard-title">Top clippers</h2>
            <p className="app-muted">참여 크리에이터 평균 수익 {averageEarning.toLocaleString('ko-KR')}원</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {leaderboard.map((entry) => (
                <div key={entry.creatorId} style={{ border: '1px solid #333', borderRadius: 12, padding: 16 }}>
                  <p style={{ fontSize: 24 }}>{medal[entry.rank - 1] ?? `#${entry.rank}`}</p>
                  <p>{entry.creatorName}</p>
                  <p className="app-muted">{entry.totalAmount.toLocaleString('ko-KR')}원</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="app-section" aria-labelledby="views-title">
          <h2 id="views-title">{latestTotalViews.toLocaleString('ko-KR')} views</h2>
          <p className="app-muted">승인된 모든 클립의 조회수 누적 합계, 일별 추이.</p>
          <ViewsChart points={dailyViews} />
        </section>
      </div>
    </main>
  );
}
