'use client';

import { useMemo, useState } from 'react';
import { ArrowSquareOutIcon, FilmStripIcon } from '@phosphor-icons/react/ssr';
import { countByStatus, extractYouTubeVideoId, platformLabel } from '@clipers/db';
import { Badge, Card, DataTable, EmptyState, Tabs, formatCompactNumber, type Column } from '@clipers/ui';
import { CLIP_STATUS, statusDisplay } from '@/lib/status';
import { DisputeDialog, ViewReportDialog } from './clip-actions';

export type SubmissionRow = {
  id: string;
  url: string;
  platform: string;
  status: string;
  submitted_at: string;
  sla_deadline: string;
  rejection_reason: string | null;
  campaign: { title: string } | null;
  dispute: { status: string; resolution_note: string | null } | null;
  viewReport: { status: string; reported_view_count: number } | null;
};

const STATUSES = ['pending_review', 'approved', 'rejected'] as const;
type Filter = 'all' | (typeof STATUSES)[number];

const dateLabel = (value: string) => new Date(value).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

export default function SubmissionsView({ rows, creatorId }: { rows: SubmissionRow[]; creatorId: string }) {
  const [filter, setFilter] = useState<Filter>('all');
  const counts = useMemo(() => countByStatus(rows, STATUSES), [rows]);
  const visible = filter === 'all' ? rows : rows.filter((row) => row.status === filter);

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          description="승인된 캠페인에서 영상 링크를 제출하면 여기에서 검수 상태를 볼 수 있어요."
          icon={<FilmStripIcon size={24} />}
          title="아직 제출한 클립이 없어요"
        />
      </Card>
    );
  }

  const columns: Column<SubmissionRow>[] = [
    {
      key: 'campaign',
      header: '캠페인',
      render: (row) => (
        <div>
          <p>{row.campaign?.title ?? '캠페인'}</p>
          <p className="cl-meta-subtle">
            {platformLabel(row.platform)} · {dateLabel(row.submitted_at)} 제출
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      render: (row) => {
        const status = statusDisplay(CLIP_STATUS, row.status);
        return (
          <div>
            <Badge tone={status.tone}>{status.label}</Badge>
            {row.status === 'pending_review' && <p className="cl-meta-subtle">{dateLabel(row.sla_deadline)}까지 검수</p>}
            {row.rejection_reason && <p className="cl-meta-subtle">{row.rejection_reason}</p>}
          </div>
        );
      },
    },
    { key: 'follow-up', header: '후속 조치', render: (row) => <FollowUp creatorId={creatorId} row={row} /> },
    {
      key: 'link',
      header: '',
      align: 'right',
      render: (row) => (
        <a aria-label="영상 열기" className="cl-icon-button" href={row.url} rel="noreferrer" target="_blank">
          <ArrowSquareOutIcon size={16} />
        </a>
      ),
    },
  ];

  return (
    <div className="cl-stack-tight">
      <Tabs
        items={[
          { value: 'all', label: '전체', count: rows.length },
          { value: 'pending_review', label: '검수 대기', count: counts.pending_review },
          { value: 'approved', label: '승인', count: counts.approved },
          { value: 'rejected', label: '반려', count: counts.rejected },
        ]}
        label="상태별 보기"
        onChange={setFilter}
        value={filter}
      />
      <DataTable columns={columns} empty="이 상태의 클립이 없어요." label="제출한 클립" rowKey={(row) => row.id} rows={visible} />
    </div>
  );
}

function FollowUp({ row, creatorId }: { row: SubmissionRow; creatorId: string }) {
  if (row.dispute) {
    return row.dispute.status === 'resolved' ? (
      <div>
        <Badge tone="brand">이의제기 처리됨</Badge>
        {row.dispute.resolution_note && <p className="cl-meta-subtle">{row.dispute.resolution_note}</p>}
      </div>
    ) : (
      <Badge tone="amber">이의제기 검토 중</Badge>
    );
  }
  if (row.status === 'rejected') return <DisputeDialog clipId={row.id} creatorId={creatorId} />;

  if (row.status === 'approved' && extractYouTubeVideoId(row.url) === null) {
    if (row.viewReport) {
      const verified = row.viewReport.status === 'verified';
      return (
        <Badge tone={verified ? 'brand' : 'amber'}>
          {verified ? '조회수 확인됨' : '조회수 확인 중'} · {formatCompactNumber(row.viewReport.reported_view_count)}회
        </Badge>
      );
    }
    return <ViewReportDialog clipId={row.id} creatorId={creatorId} />;
  }

  return <span className="cl-meta-subtle">{row.status === 'approved' ? '조회수 자동 수집' : '—'}</span>;
}
