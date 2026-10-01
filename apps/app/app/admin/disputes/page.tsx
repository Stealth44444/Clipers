import { MessageSquareWarning } from 'lucide-react';
import { Card, DataTable, EmptyState, Page, PageHeader } from '@clipers/ui';
import { getSession } from '@/lib/session';
import { DisputeResolveAction } from '../review-actions';

type Row = {
  id: string;
  reason: string;
  created_at: string;
  clip: { url: string; rejection_reason: string | null; campaign: { title: string } | null; creator: { display_name: string } | null } | null;
};

export default async function AdminDisputesPage() {
  const { supabase } = await getSession();
  const { data } = await supabase
    .from('clip_disputes')
    .select(
      'id, reason, created_at, clip:clips!clip_disputes_clip_id_fkey(url, rejection_reason, campaign:campaigns!clips_campaign_id_fkey(title), creator:profiles!clips_creator_id_fkey(display_name))'
    )
    .eq('status', 'open')
    .order('created_at', { ascending: true });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <Page>
      <PageHeader description="반려된 클립에 대한 크리에이터의 이의제기예요. 처리 결과는 크리에이터에게 그대로 보여요." title="이의제기" />
      {rows.length > 0 ? (
        <DataTable
          columns={[
            {
              key: 'clip',
              header: '캠페인 / 크리에이터',
              render: (row) => (
                <div>
                  <p>{row.clip?.campaign?.title ?? '캠페인'}</p>
                  <p className="cl-meta-subtle">{row.clip?.creator?.display_name ?? '크리에이터'}</p>
                </div>
              ),
            },
            {
              key: 'reasons',
              header: '반려 사유 → 이의',
              render: (row) => (
                <div>
                  <p className="cl-meta-subtle">반려: {row.clip?.rejection_reason ?? '—'}</p>
                  <p className="cl-clamp">{row.reason}</p>
                </div>
              ),
            },
            {
              key: 'link',
              header: '',
              render: (row) =>
                row.clip ? (
                  <a className="cl-link" href={row.clip.url} rel="noreferrer" target="_blank">
                    영상 열기
                  </a>
                ) : null,
            },
            { key: 'actions', header: '', align: 'right', render: (row) => <DisputeResolveAction disputeId={row.id} /> },
          ]}
          empty=""
          label="처리할 이의제기"
          rowKey={(row) => row.id}
          rows={rows}
        />
      ) : (
        <Card>
          <EmptyState
            description="반려된 클립에 이의제기가 들어오면 여기에 보여요."
            icon={<MessageSquareWarning size={24} />}
            title="처리할 이의제기가 없어요"
            tone="neutral"
          />
        </Card>
      )}
    </Page>
  );
}
