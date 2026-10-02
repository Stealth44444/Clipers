import { ScrollText } from 'lucide-react';
import { platformLabel } from '@clipers/db';
import { Card, DataTable, EmptyState, Page, PageHeader } from '@clipers/ui';
import { getSession } from '@/lib/session';
import { ViewReportActions } from '../review-actions';

type Row = {
  id: string;
  reported_view_count: number;
  evidence_url: string;
  created_at: string;
  clip: { url: string; platform: string; campaign: { title: string } | null; creator: { display_name: string } | null } | null;
};

export default async function AdminViewReportsPage() {
  const { supabase, user } = await getSession();
  const { data } = await supabase
    .from('manual_view_reports')
    .select(
      'id, reported_view_count, evidence_url, created_at, clip:clips!manual_view_reports_clip_id_fkey(url, platform, campaign:campaigns!clips_campaign_id_fkey(title), creator:profiles!clips_creator_id_fkey(display_name))'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <Page>
      <PageHeader
        description="조회수를 자동으로 가져올 수 없는 플랫폼의 신고예요. 영상과 캡처를 대조해 확인하면 정산에 반영돼요."
        title="조회수 신고"
      />
      {rows.length > 0 ? (
        <DataTable
          columns={[
            {
              key: 'clip',
              header: '캠페인 / 크리에이터',
              render: (row) => (
                <div>
                  <p>{row.clip?.campaign?.title ?? '캠페인'}</p>
                  <p className="cl-meta-subtle">
                    {row.clip?.creator?.display_name ?? '크리에이터'} · {row.clip ? platformLabel(row.clip.platform) : ''}
                  </p>
                </div>
              ),
            },
            { key: 'views', header: '신고 조회수', align: 'right', render: (row) => <span className="cl-emphasis">{row.reported_view_count.toLocaleString('ko-KR')}회</span> },
            {
              key: 'evidence',
              header: '대조',
              render: (row) => (
                <span className="cl-inline">
                  {row.clip && (
                    <a className="cl-link" href={row.clip.url} rel="noreferrer" target="_blank">
                      영상
                    </a>
                  )}
                  <a className="cl-link" href={row.evidence_url} rel="noreferrer" target="_blank">
                    캡처
                  </a>
                </span>
              ),
            },
            { key: 'actions', header: '', align: 'right', render: (row) => <ViewReportActions reportId={row.id} reviewerId={user.id} /> },
          ]}
          empty=""
          label="검토할 조회수 신고"
          rowKey={(row) => row.id}
          rows={rows}
        />
      ) : (
        <Card>
          <EmptyState description="크리에이터가 조회수를 신고하면 여기에 보여요." icon={<ScrollText size={24} />} title="검토할 신고가 없어요" />
        </Card>
      )}
    </Page>
  );
}
