import { ClipboardCheck } from 'lucide-react';
import { platformLabel } from '@clipers/db';
import { Badge, Card, DataTable, EmptyState, Page, PageHeader } from '@clipers/ui';
import { getSession } from '@/lib/session';
import { ClipReviewActions } from '../review-actions';

type Row = {
  id: string;
  url: string;
  platform: string;
  sla_deadline: string;
  campaign: { title: string; content_requirements: string | null } | null;
  creator: { display_name: string } | null;
};

const deadlineLabel = (value: string) =>
  new Date(value).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default async function AdminClipsPage() {
  const { supabase, user } = await getSession();
  const { data } = await supabase
    .from('clips')
    .select(
      'id, url, platform, sla_deadline, campaign:campaigns!clips_campaign_id_fkey(title, content_requirements), creator:profiles!clips_creator_id_fkey(display_name)'
    )
    .eq('status', 'pending_review')
    .order('sla_deadline', { ascending: true });
  const rows = (data ?? []) as unknown as Row[];
  const now = Date.now();

  return (
    <Page>
      <PageHeader description="검수 기한이 빠른 순서예요. 반려할 때 적은 사유는 크리에이터에게 그대로 보여요." title="클립 검수" />
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
            { key: 'actions', header: '', align: 'right', render: (row) => <ClipReviewActions clipId={row.id} reviewerId={user.id} /> },
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
    </Page>
  );
}
