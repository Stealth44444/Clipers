'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { buildLineChart, smoothLinePath, type ChartPoint } from '../lib/chart';
import { cx } from '../lib/cx';
import { formatCompactNumber } from '../lib/format';

const DEFAULT_WIDTH = 720;
const HEIGHT = 240;

export type LineChartPoint = ChartPoint & {
  /** Longer label for the hover tooltip (e.g. "9월 28일" while the axis shows "9/28"). */
  detail?: string;
};

/**
 * `axes`: value labels on the left and horizontal grid (dashboards).
 * `minimal`: dates along the top, a vertical rule per day and no value axis (showcase pages, after Whop).
 * Hovering (or arrow keys while focused) shows a crosshair and a tooltip with the exact value.
 */
export function LineChart({ points, label, variant = 'axes', unit = '' }: {
  points: LineChartPoint[];
  label: string;
  variant?: 'axes' | 'minimal';
  /** Suffix for tooltip values, e.g. "회". */
  unit?: string;
}) {
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const figureRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<number | null>(null);
  // The viewBox follows the rendered width (1 unit = 1px), so axis labels never shrink with narrow containers.
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    const figure = figureRef.current;
    if (!figure) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(figure);
    return () => observer.disconnect();
  }, []);

  const minimal = variant === 'minimal';
  const left = minimal ? 8 : 44;
  const right = minimal ? 8 : 0;
  const top = minimal ? 28 : 0;
  const bottom = minimal ? 8 : 28;
  const plotWidth = width - left - right;
  const plotHeight = HEIGHT - top - bottom;
  const chart = buildLineChart(points, plotWidth, plotHeight);
  const line = smoothLinePath(chart.coords);
  const first = chart.coords[0];
  const last = chart.coords.at(-1);
  const area = line && first && last ? `${line} L${last.x},${plotHeight} L${first.x},${plotHeight} Z` : '';
  const lastLabel = chart.xLabels.at(-1);

  const hovered = active === null ? null : { point: points[active], coord: chart.coords[active] };

  function nearestIndex(event: PointerEvent<SVGSVGElement>): number | null {
    const svg = svgRef.current;
    if (!svg || chart.coords.length === 0) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width - left;
    let best = 0;
    chart.coords.forEach((coord, index) => {
      if (Math.abs(coord.x - x) < Math.abs(chart.coords[best].x - x)) best = index;
    });
    return best;
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (chart.coords.length === 0) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      setActive((current) => Math.min(chart.coords.length - 1, Math.max(0, (current ?? chart.coords.length - 1) + step)));
    }
  }

  return (
    <figure
      aria-label={label}
      className={cx('cl-chart', minimal && 'cl-chart--minimal')}
      onBlur={() => setActive(null)}
      onKeyDown={onKeyDown}
      ref={figureRef}
      role="img"
      tabIndex={chart.coords.length > 0 ? 0 : undefined}
    >
      <svg
        onPointerLeave={() => setActive(null)}
        onPointerMove={(event) => setActive(nearestIndex(event))}
        ref={svgRef}
        viewBox={`0 0 ${width} ${HEIGHT}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-9)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--brand-9)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {!minimal &&
          chart.yTicks.map((tick) => (
            <g key={tick.value}>
              <line className="cl-chart__grid" x1={left} x2={width} y1={tick.y} y2={tick.y} />
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
          {line && <path className={cx('cl-chart__line', hovered && 'cl-chart__line--dimmed')} d={line} />}
          {last && !hovered && <circle className="cl-chart__last" cx={last.x} cy={last.y} r={4.5} />}
          {hovered && (
            <g className="cl-chart__hover">
              <line className="cl-chart__crosshair" x1={hovered.coord.x} x2={hovered.coord.x} y1={minimal ? -top + 20 : 0} y2={plotHeight} />
              <circle className="cl-chart__last" cx={hovered.coord.x} cy={hovered.coord.y} r={5} />
            </g>
          )}
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

      {hovered && (
        <div
          className={cx('cl-chart__tooltip', (left + hovered.coord.x) / width > 0.7 && 'cl-chart__tooltip--left')}
          style={{ left: `${((left + hovered.coord.x) / width) * 100}%`, top: `${((top + hovered.coord.y) / HEIGHT) * 100}%` }}
        >
          <span className="cl-chart__tooltip-label">{hovered.point.detail ?? hovered.point.label}</span>
          <span className="cl-chart__tooltip-value">
            {hovered.point.value.toLocaleString('ko-KR')}
            {unit}
          </span>
        </div>
      )}
    </figure>
  );
}
