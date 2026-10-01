export type ChartPoint = { label: string; value: number };

export type ChartGeometry = {
  max: number;
  /** Plot coordinates of every point, for smooth paths and markers. */
  coords: { x: number; y: number }[];
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

  return { max, coords, line, area, yTicks, xLabels };
}

/**
 * Monotone cubic curve through the points (Fritsch–Carlson tangents), so cumulative series never
 * overshoot or dip between samples.
 */
export function smoothLinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${round(points[0].x)},${round(points[0].y)}`;

  const slopes = points.slice(1).map((point, index) => (point.y - points[index].y) / (point.x - points[index].x || 1));
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === points.length - 1) return slopes[slopes.length - 1];
    const before = slopes[index - 1];
    const after = slopes[index];
    if (before * after <= 0) return 0;
    const dxBefore = points[index].x - points[index - 1].x;
    const dxAfter = points[index + 1].x - points[index].x;
    return (3 * (dxBefore + dxAfter)) / ((2 * dxAfter + dxBefore) / before + (dxAfter + 2 * dxBefore) / after);
  });

  let path = `M${round(points[0].x)},${round(points[0].y)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const third = (end.x - start.x) / 3;
    path += ` C${round(start.x + third)},${round(start.y + tangents[index] * third)} ${round(end.x - third)},${round(end.y - tangents[index + 1] * third)} ${round(end.x)},${round(end.y)}`;
  }
  return path;
}
