'use client';

import { useState } from 'react';
import { LineChart, Tabs, formatCompactNumber } from '@clipers/ui';

type Point = { date: string; views: number; submissions: number };
type Metric = 'views' | 'submissions';

/** Cumulative views or submissions per day, switchable like Whop's campaign chart. */
export default function ActivityChart({ activity }: { activity: Point[] }) {
  const [metric, setMetric] = useState<Metric>('views');
  const latest = activity.at(-1) ?? { views: 0, submissions: 0 };
  const points = activity.map((point) => {
    const [, month, day] = point.date.split('-').map(Number);
    return { label: `${month}월 ${day}일`, value: point[metric] };
  });

  return (
    <section className="cl-activity">
      <div className="cl-activity__head">
        <div>
          <p className="cl-activity__figure">
            {formatCompactNumber(metric === 'views' ? latest.views : latest.submissions)}
            <span>{metric === 'views' ? ' 조회수' : ' 제출'}</span>
          </p>
          <p className="cl-meta">
            {metric === 'views' ? '승인된 모든 클립의 누적 조회수예요.' : '승인된 클립 수의 누적 추이예요.'}
          </p>
        </div>
        <Tabs
          items={[
            { value: 'views', label: '조회수' },
            { value: 'submissions', label: '제출' },
          ]}
          label="그래프 지표"
          onChange={setMetric}
          value={metric}
        />
      </div>
      <LineChart label={metric === 'views' ? '누적 조회수' : '누적 제출 수'} points={points} variant="minimal" />
    </section>
  );
}
