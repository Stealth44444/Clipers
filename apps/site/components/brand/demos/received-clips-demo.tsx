import { platformLabel } from '@clipers/db';
import { Badge, DataTable } from '@clipers/ui';
import { RECEIVED_CLIPS } from '@/lib/brand-demos';

/** The brand campaign page's 받은 클립 table at its real size. Review status reads as the app shows it. No budget amounts. */
export default function ReceivedClipsDemo() {
  return (
    <div className="cl-app-dark cl-crop" inert>
      <p className="cl-crop__heading">받은 클립</p>
      <DataTable
        columns={[
          { key: 'creator', header: '크리에이터', render: (row) => row.creator },
          { key: 'platform', header: '플랫폼', render: (row) => platformLabel(row.platform) },
          {
            key: 'review',
            header: '검수',
            render: (row) => (row.review === 'approved' ? <Badge tone="brand">승인</Badge> : <Badge tone="amber">검수 대기</Badge>),
          },
        ]}
        empty=""
        label="받은 클립"
        rowKey={(row) => `${row.creator}-${row.platform}`}
        rows={RECEIVED_CLIPS}
      />
    </div>
  );
}
