'use client';

import { useMemo, useState } from 'react';
import { viewTrend } from '@clipers/db';
import { Card, LineChart, Select, StatCard, StatGrid, Tabs, formatCompactNumber } from '@clipers/ui';

export type AnalyticsClip = {
  id: string;
  /** Value the filter select groups by (platform for creators, campaign for brands). */
  group: string;
  status: string;
  snapshots: { capturedAt: string; viewCount: number }[];
};

type Props = {
  clips: AnalyticsClip[];
  filter: { label: string; allLabel: string; options: { value: string; label: string }[] };
  clipLabel: string;
};

type Range = '7' | '30' | '90';
type Mode = 'cumulative' | 'daily';

export default function ViewsAnalytics({ clips, filter, clipLabel }: Props) {
  const [range, setRange] = useState<Range>('30');
  const [mode, setMode] = useState<Mode>('cumulative');
  const [group, setGroup] = useState('all');
  const selected = group === 'all' ? clips : clips.filter((clip) => clip.group === group);
  const trend = useMemo(
    () => viewTrend(selected.map((clip) => ({ clipId: clip.id, snapshots: clip.snapshots })), Number(range)),
    [selected, range]
  );

  const periodViews = trend.reduce((sum, point) => sum + point.daily, 0);
  const totalViews = trend.at(-1)?.cumulative ?? 0;
  const points = trend.map((point) => {
    const [, month, day] = point.date.split('-').map(Number);
    return { label: `${month}/${day}`, detail: `${month}월 ${day}일`, value: mode === 'cumulative' ? point.cumulative : point.daily };
  });

  return (
    <div className="cl-stack">
      <div className="cl-toolbar">
        <Tabs
          items={[
            { value: '7', label: '7일' },
            { value: '30', label: '30일' },
            { value: '90', label: '90일' },
          ]}
          label="기간"
          onChange={setRange}
          value={range}
        />
        <Select aria-label={filter.label} className="cl-toolbar__select" onChange={(event) => setGroup(event.target.value)} value={group}>
          <option value="all">{filter.allLabel}</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <StatGrid>
        <StatCard highlight label={`최근 ${range}일 조회수`} value={formatCompactNumber(periodViews)} />
        <StatCard label="누적 조회수" value={formatCompactNumber(totalViews)} />
        <StatCard label={clipLabel} value={selected.length} />
        <StatCard
          label="승인된 클립"
          value={selected.filter((clip) => clip.status === 'approved').length}
        />
      </StatGrid>

      <Card
        actions={
          <Tabs
            items={[
              { value: 'cumulative', label: '누적' },
              { value: 'daily', label: '일별' },
            ]}
            label="그래프 보기"
            onChange={setMode}
            value={mode}
          />
        }
        description={totalViews === 0 ? '조회수가 수집되면 그래프가 채워져요. 유튜브는 자동으로, 다른 플랫폼은 조회수 신고로 반영돼요.' : undefined}
        title="조회수"
      >
        <LineChart label={`최근 ${range}일 ${mode === 'cumulative' ? '누적' : '일별'} 조회수`} points={points} unit="회" />
      </Card>
    </div>
  );
}
