import { useId } from 'react';
import { buildLineChart, smoothLinePath, type ChartPoint } from '../lib/chart';
import { cx } from '../lib/cx';
import { formatCompactNumber } from '../lib/format';

const WIDTH = 720;
const HEIGHT = 240;

/**
 * `axes`: value labels on the left and horizontal grid (dashboards).
 * `minimal`: dates along the top, a vertical rule per day and no value axis (showcase pages, after Whop).
 */
export function LineChart({ points, label, variant = 'axes' }: { points: ChartPoint[]; label: string; variant?: 'axes' | 'minimal' }) {
  const gradientId = useId();
  const minimal = variant === 'minimal';
  const left = minimal ? 8 : 44;
  const right = minimal ? 8 : 0;
  const top = minimal ? 28 : 0;
  const bottom = minimal ? 8 : 28;
  const plotWidth = WIDTH - left - right;
  const plotHeight = HEIGHT - top - bottom;
  const chart = buildLineChart(points, plotWidth, plotHeight);
  const line = smoothLinePath(chart.coords);
  const first = chart.coords[0];
  const last = chart.coords.at(-1);
  const area = line && first && last ? `${line} L${last.x},${plotHeight} L${first.x},${plotHeight} Z` : '';
  const lastLabel = chart.xLabels.at(-1);

  return (
    <figure aria-label={label} className={cx('cl-chart', minimal && 'cl-chart--minimal')} role="img">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-9)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--brand-9)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {!minimal &&
          chart.yTicks.map((tick) => (
            <g key={tick.value}>
              <line className="cl-chart__grid" x1={left} x2={WIDTH} y1={tick.y} y2={tick.y} />
              <text className="cl-chart__axis" dominantBaseline="middle" textAnchor="end" x={left - 8} y={tick.y}>
                {formatCompactNumber(tick.value)}
              </text>
            </g>
          ))}

        <g transform={`translate(${left},${top})`}>
          {minimal &&
            chart.coords.length <= 92 &&
            chart.coords.map((coord, index) => (
              <line className="cl-chart__grid" key={index} x1={coord.x} x2={coord.x} y1={0} y2={plotHeight} />
            ))}
          {area && <path d={area} fill={`url(#${gradientId})`} />}
          {line && <path className="cl-chart__line" d={line} />}
          {last && <circle className="cl-chart__last" cx={last.x} cy={last.y} r={4.5} />}
          {chart.xLabels.map((tick) => (
            <text
              className="cl-chart__axis"
              key={`${tick.label}-${tick.x}`}
              textAnchor={tick === lastLabel ? 'end' : tick.x === 0 ? 'start' : 'middle'}
              x={tick.x}
              y={minimal ? -12 : plotHeight + 20}
            >
              {tick.label}
            </text>
          ))}
        </g>
      </svg>
    </figure>
  );
}
