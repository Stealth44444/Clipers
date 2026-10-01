import { UserCheckIcon } from '@phosphor-icons/react/ssr';
import { INTERESTS } from '@clipers/db';
import { Card, DataTable, EmptyState, Page, PageHeader } from '@clipers/ui';
import { getSession } from '@/lib/session';
import { ApplicationActions } from '../review-actions';

type Row = {
  id: string;
  created_at: string;
  campaign: { title: string; category: string } | null;
  creator: { display_name: string; interests: string[]; experience_level: string | null } | null;
};

const INTEREST_LABEL = new Map<string, string>(INTERESTS.map((interest) => [interest.id, interest.label]));

export default async function AdminApplicationsPage() {
  const { supabase, user } = await getSession();
  const { data } = await supabase
    .from('campaign_applications')
    .select(
      'id, created_at, campaign:campaigns!campaign_applications_campaign_id_fkey(title, category), creator:profiles!campaign_applications_creator_id_fkey(display_name, interests, experience_level)'
    )
    .eq('status', 'applied')
    .order('created_at', { ascending: true });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <Page>
      <PageHeader description="먼저 들어온 지원서부터 보여요. 승인하면 크리에이터가 클립을 제출할 수 있어요." title="지원서" />
      {rows.length > 0 ? (
        <DataTable
          columns={[
            {
              key: 'creator',
              header: '크리에이터',
              render: (row) => (
                <div>
                  <p>{row.creator?.display_name ?? '크리에이터'}</p>
                  <p className="cl-meta-subtle">
                    {(row.creator?.interests ?? []).map((id) => INTEREST_LABEL.get(id) ?? id).join(', ') || '관심 분야 없음'}
                  </p>
                </div>
              ),
            },
            {
              key: 'campaign',
              header: '캠페인',
              render: (row) => (
                <div>
                  <p>{row.campaign?.title ?? '캠페인'}</p>
                  <p className="cl-meta-subtle">{row.campaign?.category}</p>
                </div>
              ),
            },
            {
              key: 'created',
              header: '접수',
              render: (row) => new Date(row.created_at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
            },
            { key: 'actions', header: '', align: 'right', render: (row) => <ApplicationActions applicationId={row.id} reviewerId={user.id} /> },
          ]}
          empty=""
          label="검토할 지원서"
          rowKey={(row) => row.id}
          rows={rows}
        />
      ) : (
        <Card>
          <EmptyState description="새 지원서가 들어오면 여기에 보여요." icon={<UserCheckIcon size={24} />} title="검토할 지원서가 없어요" tone="neutral" />
        </Card>
      )}
    </Page>
  );
}
