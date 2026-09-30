export type ChartPoint = { label: string; value: number };

export type ChartGeometry = {
  max: number;
  line: string;
  area: string;
  yTicks: { value: number; y: number }[];
  xLabels: { label: string; x: number }[];
};

const MULTIPLIERS = [1, 2, 2.5, 5, 10];

export function niceMax(value: number): number {
  if (value <= 0) return 100;
  const base = 10 ** Math.floor(Math.log10(value));
  const multiplier = MULTIPLIERS.find((candidate) => candidate * base >= value) ?? 10;
  return Math.max(100, multiplier * base);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildLineChart(points: ChartPoint[], width: number, height: number, tickCount = 5): ChartGeometry {
  const max = niceMax(Math.max(0, ...points.map((point) => point.value)));
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;
  const coords = points.map((point, index) => ({
    x: round(points.length > 1 ? index * stepX : width / 2),
    y: round(height - (Math.max(0, point.value) / max) * height),
  }));

  const line = coords.map((coord, index) => `${index === 0 ? 'M' : 'L'}${coord.x},${coord.y}`).join(' ');
  const area = coords.length > 0 ? `${line} L${coords[coords.length - 1].x},${height} L${coords[0].x},${height} Z` : '';

  const yTicks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const value = (max / tickCount) * index;
    return { value, y: round(height - (value / max) * height) };
  });

  const labelCount = Math.min(6, points.length);
  const labelIndexes = new Set<number>();
  for (let slot = 0; slot < labelCount; slot += 1) {
    labelIndexes.add(labelCount === 1 ? points.length - 1 : Math.round((slot * (points.length - 1)) / (labelCount - 1)));
  }
  const xLabels = [...labelIndexes]
    .sort((left, right) => left - right)
    .map((index) => ({ label: points[index].label, x: coords[index].x }));

  return { max, line, area, yTicks, xLabels };
}
