'use client';

import { Eye, Film } from 'lucide-react';
import { platformLabel } from '@clipers/db';
import { Badge, DataTable, StatCard, StatGrid, formatCompactNumber } from '@clipers/ui';
import { useDemoFrame } from '@/components/brand/use-demo-frame';
import { receivedFrames } from '@/lib/brand-demos';

const FRAMES = receivedFrames();

/** The brand campaign page: verified views and received clips, with new clips passing review. No budget amounts. */
export default function ReceivedClipsDemo() {
  const { ref, frame } = useDemoFrame(FRAMES);

  return (
    <div className="cl-app-dark cl-bdemo cl-bdemo--clips" inert ref={ref}>
      <StatGrid>
        <StatCard icon={<Eye size={16} />} label="검증 조회수" tone="sky" value={formatCompactNumber(frame.views)} />
        <StatCard icon={<Film size={16} />} label="받은 클립" tone="amber" value={frame.clips} />
      </StatGrid>
      <p className="cl-bdemo__label">받은 클립</p>
      <DataTable
        columns={[
          { key: 'creator', header: '크리에이터', render: (row) => row.creator },
          { key: 'platform', header: '플랫폼', render: (row) => platformLabel(row.platform) },
          {
            key: 'review',
            header: '검수',
            align: 'right',
            render: (row) => (row.approved ? <Badge tone="brand">승인</Badge> : <Badge tone="amber">검수 대기</Badge>),
          },
        ]}
        empty=""
        label="받은 클립"
        rowKey={(row) => String(row.id)}
        rows={frame.rows}
      />
    </div>
  );
}
