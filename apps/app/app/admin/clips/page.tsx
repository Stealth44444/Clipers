import { ClipboardCheck } from 'lucide-react';
import { platformLabel, UNAVAILABLE_REASON_LABEL } from '@clipers/db';
import { Badge, Card, DataTable, EmptyState, Page, PageHeader, Stack } from '@clipers/ui';
import { getSession } from '@/lib/session';
import { ClipAvailabilityAction, ClipReviewActions, type ClipManualChecks } from '../review-actions';

type Row = {
  id: string;
  url: string;
  platform: string;
  creator_id: string;
  sla_deadline: string;
  video_published_at: string | null;
  campaign: { title: string; content_requirements: string | null; live_at: string | null } | null;
  creator: { display_name: string } | null;
};

type StoppedRow = {
  id: string;
  url: string;
  platform: string;
  unavailable_at: string;
  unavailable_reason: 'missing' | 'unlisted' | 'manual';
  campaign: { title: string } | null;
  creator: { display_name: string } | null;
};

const deadlineLabel = (value: string) =>
  new Date(value).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default async function AdminClipsPage() {
  const { supabase, user } = await getSession();
  const [{ data }, { data: stoppedData }] = await Promise.all([
    supabase
      .from('clips')
      .select(
        'id, url, platform, creator_id, sla_deadline, video_published_at, campaign:campaigns!clips_campaign_id_fkey(title, content_requirements, live_at), creator:profiles!clips_creator_id_fkey(display_name)'
      )
      .eq('status', 'pending_review')
      .order('sla_deadline', { ascending: true }),
    supabase
      .from('clips')
      .select('id, url, platform, unavailable_at, unavailable_reason, campaign:campaigns!clips_campaign_id_fkey(title), creator:profiles!clips_creator_id_fkey(display_name)')
      .eq('status', 'approved')
      .not('unavailable_at', 'is', null)
      .order('unavailable_at', { ascending: false }),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const stopped = (stoppedData ?? []) as unknown as StoppedRow[];

  const creatorIds = [...new Set(rows.map((row) => row.creator_id))];
  const { data: channelRows } = creatorIds.length
    ? await supabase.from('creator_channels').select('creator_id, platform, url').in('creator_id', creatorIds).not('verified_at', 'is', null)
    : { data: [] as { creator_id: string; platform: string; url: string }[] };
  const accountsOf = (creatorId: string, platform: string) =>
    (channelRows ?? []).filter((channel) => channel.creator_id === creatorId && channel.platform === platform).map((channel) => channel.url);
  // The server checked YouTube clips submitted since the fraud guards (video_published_at is set); the rest are checked by hand.
  const manualChecks = (row: Row): ClipManualChecks | null =>
    row.video_published_at ? null : { liveAt: row.campaign?.live_at ?? null, accounts: accountsOf(row.creator_id, row.platform) };
  const now = Date.now();

  return (
    <Page>
      <PageHeader description="검수 기한이 빠른 순서예요. 반려할 때 적은 사유는 크리에이터에게 그대로 보여요." title="클립 검수" />
      <Stack>
        {rows.length > 0 ? (
          <DataTable
            columns={[
              {
                key: 'deadline',
                header: '검수 기한',
                render: (row) =>
                  Date.parse(row.sla_deadline) < now ? (
                    <Badge tone="tomato">기한 초과 · {deadlineLabel(row.sla_deadline)}</Badge>
                  ) : (
                    <span className="cl-number">{deadlineLabel(row.sla_deadline)}</span>
                  ),
              },
              {
                key: 'clip',
                header: '캠페인 / 크리에이터',
                render: (row) => (
                  <div>
                    <p>{row.campaign?.title ?? '캠페인'}</p>
                    <p className="cl-meta-subtle">
                      {row.creator?.display_name ?? '크리에이터'} · {platformLabel(row.platform)}
                    </p>
                    {row.video_published_at && (
                      <p className="cl-meta-subtle">자동 확인 · 인증 채널 · {deadlineLabel(row.video_published_at)} 게시</p>
                    )}
                  </div>
                ),
              },
              {
                key: 'requirements',
                header: '요구사항',
                render: (row) => <p className="cl-meta cl-clamp">{row.campaign?.content_requirements || '—'}</p>,
              },
              {
                key: 'link',
                header: '',
                render: (row) => (
                  <a className="cl-link" href={row.url} rel="noreferrer" target="_blank">
                    영상 열기
                  </a>
                ),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) => <ClipReviewActions clipId={row.id} manualChecks={manualChecks(row)} reviewerId={user.id} />,
              },
            ]}
            empty=""
            label="검수할 클립"
            rowKey={(row) => row.id}
            rows={rows}
          />
        ) : (
          <Card>
            <EmptyState description="크리에이터가 클립을 제출하면 여기에 보여요." icon={<ClipboardCheck size={24} />} title="검수할 클립이 없어요" />
          </Card>
        )}
        {stopped.length > 0 && (
          <Card description="영상이 삭제·비공개로 바뀌어 정산이 멈춘 클립이에요. 다시 공개된 것을 확인했을 때만 표시를 지워 주세요." title="정산이 멈춘 클립">
            <DataTable
              columns={[
                {
                  key: 'stopped',
                  header: '멈춘 날',
                  render: (row) => (
                    <div>
                      <Badge tone="amber">{UNAVAILABLE_REASON_LABEL[row.unavailable_reason]}</Badge>
                      <p className="cl-meta-subtle">{deadlineLabel(row.unavailable_at)}</p>
                    </div>
                  ),
                },
                {
                  key: 'clip',
                  header: '캠페인 / 크리에이터',
                  render: (row) => (
                    <div>
                      <p>{row.campaign?.title ?? '캠페인'}</p>
                      <p className="cl-meta-subtle">
                        {row.creator?.display_name ?? '크리에이터'} · {platformLabel(row.platform)}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'link',
                  header: '',
                  render: (row) => (
                    <a className="cl-link" href={row.url} rel="noreferrer" target="_blank">
                      영상 열기
                    </a>
                  ),
                },
                { key: 'actions', header: '', align: 'right', render: (row) => <ClipAvailabilityAction clipId={row.id} unavailable /> },
              ]}
              empty=""
              label="정산이 멈춘 클립"
              rowKey={(row) => row.id}
              rows={stopped}
            />
          </Card>
        )}
      </Stack>
    </Page>
  );
}
