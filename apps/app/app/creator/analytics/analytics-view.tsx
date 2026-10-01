'use client';

import { useMemo, useState } from 'react';
import { CircleCheck, Eye, Film, TrendingUp } from 'lucide-react';
import { platformLabel, viewTrend } from '@clipers/db';
import { Card, LineChart, Select, StatCard, StatGrid, Tabs, formatCompactNumber } from '@clipers/ui';

export type AnalyticsClip = {
  id: string;
  platform: string;
  status: string;
  snapshots: { capturedAt: string; viewCount: number }[];
};

type Range = '7' | '30' | '90';
type Mode = 'cumulative' | 'daily';

const ICON = { size: 18 };

export default function AnalyticsView({ clips }: { clips: AnalyticsClip[] }) {
  const [range, setRange] = useState<Range>('30');
  const [mode, setMode] = useState<Mode>('cumulative');
  const [platform, setPlatform] = useState('all');

  const platforms = useMemo(() => [...new Set(clips.map((clip) => clip.platform))], [clips]);
  const selected = platform === 'all' ? clips : clips.filter((clip) => clip.platform === platform);
  const trend = useMemo(
    () => viewTrend(selected.map((clip) => ({ clipId: clip.id, snapshots: clip.snapshots })), Number(range)),
    [selected, range]
  );

  const periodViews = trend.reduce((sum, point) => sum + point.daily, 0);
  const totalViews = trend.at(-1)?.cumulative ?? 0;
  const points = trend.map((point) => {
    const [, month, day] = point.date.split('-').map(Number);
    return { label: `${month}/${day}`, value: mode === 'cumulative' ? point.cumulative : point.daily };
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
        <Select aria-label="플랫폼" className="cl-toolbar__select" onChange={(event) => setPlatform(event.target.value)} value={platform}>
          <option value="all">모든 플랫폼</option>
          {platforms.map((value) => (
            <option key={value} value={value}>
              {platformLabel(value)}
            </option>
          ))}
        </Select>
      </div>

      <StatGrid>
        <StatCard highlight icon={<TrendingUp {...ICON} />} label={`최근 ${range}일 조회수`} tone="brand" value={formatCompactNumber(periodViews)} />
        <StatCard icon={<Eye {...ICON} />} label="누적 조회수" tone="sky" value={formatCompactNumber(totalViews)} />
        <StatCard icon={<Film {...ICON} />} label="제출한 클립" tone="violet" value={selected.length} />
        <StatCard
          icon={<CircleCheck {...ICON} />}
          label="승인된 클립"
          tone="amber"
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
        <LineChart label={`최근 ${range}일 ${mode === 'cumulative' ? '누적' : '일별'} 조회수`} points={points} />
      </Card>
    </div>
  );
}
