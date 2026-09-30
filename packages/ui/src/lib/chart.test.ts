import { describe, it, expect } from 'vitest';
import { buildLineChart, niceMax } from './chart';

describe('niceMax', () => {
  it('rounds up to a readable axis maximum', () => {
    expect(niceMax(0)).toBe(100);
    expect(niceMax(80)).toBe(100);
    expect(niceMax(100)).toBe(100);
    expect(niceMax(130)).toBe(200);
    expect(niceMax(4_100_000)).toBe(5_000_000);
  });
});

describe('buildLineChart', () => {
  it('returns an empty path but a 0..100 axis when there is no data', () => {
    const chart = buildLineChart([], 600, 200);
    expect(chart.line).toBe('');
    expect(chart.area).toBe('');
    expect(chart.yTicks.map((tick) => tick.value)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('maps points across the full width and scales to the nice max', () => {
    const chart = buildLineChart(
      [
        { label: '9/1', value: 0 },
        { label: '9/2', value: 50 },
        { label: '9/3', value: 100 },
      ],
      600,
      200
    );
    expect(chart.line).toBe('M0,200 L300,100 L600,0');
    expect(chart.area).toBe('M0,200 L300,100 L600,0 L600,200 L0,200 Z');
  });

  it('always labels the last point', () => {
    const points = Array.from({ length: 30 }, (_, index) => ({ label: `d${index}`, value: index }));
    const chart = buildLineChart(points, 600, 200);
    expect(chart.xLabels.at(-1)?.label).toBe('d29');
    expect(chart.xLabels.length).toBeLessThanOrEqual(6);
  });
});
