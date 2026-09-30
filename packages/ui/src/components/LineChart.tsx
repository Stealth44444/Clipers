import { useId } from 'react';
import { buildLineChart, type ChartPoint } from '../lib/chart';
import { formatCompactNumber } from '../lib/format';

const WIDTH = 720;
const HEIGHT = 240;
const LEFT = 44;
const BOTTOM = 28;

export function LineChart({ points, label }: { points: ChartPoint[]; label: string }) {
  const gradientId = useId();
  const plotWidth = WIDTH - LEFT;
  const plotHeight = HEIGHT - BOTTOM;
  const chart = buildLineChart(points, plotWidth, plotHeight);
  const last = chart.xLabels.at(-1);

  return (
    <figure aria-label={label} className="cl-chart" role="img">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-9)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--brand-9)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {chart.yTicks.map((tick) => (
          <g key={tick.value}>
            <line className="cl-chart__grid" x1={LEFT} x2={WIDTH} y1={tick.y} y2={tick.y} />
            <text className="cl-chart__axis" dominantBaseline="middle" textAnchor="end" x={LEFT - 8} y={tick.y}>
              {formatCompactNumber(tick.value)}
            </text>
          </g>
        ))}
        <g transform={`translate(${LEFT},0)`}>
          {chart.area && <path d={chart.area} fill={`url(#${gradientId})`} />}
          {chart.line && <path className="cl-chart__line" d={chart.line} />}
          {chart.xLabels.map((tick) => (
            <text className="cl-chart__axis" key={`${tick.label}-${tick.x}`} textAnchor={tick === last ? 'end' : tick.x === 0 ? 'start' : 'middle'} x={tick.x} y={HEIGHT - 6}>
              {tick.label}
            </text>
          ))}
        </g>
      </svg>
    </figure>
  );
}
