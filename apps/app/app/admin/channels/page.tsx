import { BadgeCheck } from 'lucide-react';
import { fetchAllRows, platformLabel } from '@clipers/db';
import { Card, DataTable, EmptyState, Page, PageHeader, Stack } from '@clipers/ui';
import { getSession } from '@/lib/session';
import { ChannelRevokeAction, ChannelVerifyActions } from '../review-actions';

type Row = {
  id: string;
  platform: string;
  url: string;
  verification_code: string;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  creator: { display_name: string } | null;
};

const dateLabel = (value: string) => new Date(value).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function AccountCell({ row }: { row: Row }) {
  return (
    <div>
      <p>
        {row.creator?.display_name ?? '크리에이터'} · {platformLabel(row.platform)}
      </p>
      <a className="cl-link" href={row.url} rel="noreferrer" target="_blank">
        {row.url.replace(/^https:\/\//, '')}
      </a>
    </div>
  );
}

export default async function AdminChannelsPage() {
  const { supabase } = await getSession();
  const rows = (await fetchAllRows((from, to) =>
    supabase
      .from('creator_channels')
      .select('id, platform, url, verification_code, verified_at, verified_by, created_at, creator:profiles!creator_channels_creator_id_fkey(display_name)')
      .order('created_at', { ascending: true })
      .range(from, to)
  )) as unknown as Row[];
  // YouTube channels verify themselves (the creator presses "인증 확인"); the rest wait for an operator.
  const pending = rows.filter((row) => !row.verified_at && row.platform !== 'youtube_shorts');
  const verified = rows.filter((row) => row.verified_at).reverse();

  return (
    <Page>
      <PageHeader description="계정을 열어 프로필 소개에 인증 코드가 있는지 확인해 주세요. 유튜브는 자동으로 인증돼요." title="계정 인증" />
      <Stack>
        {pending.length > 0 ? (
          <DataTable
            columns={[
              { key: 'account', header: '계정', render: (row) => <AccountCell row={row} /> },
              { key: 'code', header: '인증 코드', render: (row) => <code>{row.verification_code}</code> },
              { key: 'created', header: '등록', render: (row) => <span className="cl-number">{dateLabel(row.created_at)}</span> },
              { key: 'actions', header: '', align: 'right', render: (row) => <ChannelVerifyActions channelId={row.id} /> },
            ]}
            empty=""
            label="확인할 계정"
            rowKey={(row) => row.id}
            rows={pending}
          />
        ) : (
          <Card>
            <EmptyState description="크리에이터가 유튜브 외 계정을 등록하면 여기에 보여요." icon={<BadgeCheck size={24} />} title="확인할 계정이 없어요" />
          </Card>
        )}
        {verified.length > 0 && (
          <Card title="인증된 계정">
            <DataTable
              columns={[
                { key: 'account', header: '계정', render: (row) => <AccountCell row={row} /> },
                {
                  key: 'verified',
                  header: '인증',
                  render: (row) => (
                    <span className="cl-meta">
                      {row.verified_by === 'auto' ? '자동' : '운영팀'} · {row.verified_at ? dateLabel(row.verified_at) : ''}
                    </span>
                  ),
                },
                { key: 'actions', header: '', align: 'right', render: (row) => <ChannelRevokeAction channelId={row.id} /> },
              ]}
              empty=""
              label="인증된 계정"
              rowKey={(row) => row.id}
              rows={verified}
            />
          </Card>
        )}
      </Stack>
    </Page>
  );
}
