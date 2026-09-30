'use client';

export function ViewsChart({ points }: { points: { date: string; totalViews: number }[] }) {
  if (points.length === 0) return <p className="app-muted">아직 조회수 데이터가 없습니다.</p>;

  const width = 640;
  const height = 160;
  const maxViews = Math.max(...points.map((point) => point.totalViews), 1);
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;
  const pathPoints = points
    .map((point, index) => `${index * stepX},${height - (point.totalViews / maxViews) * height}`)
    .join(' ');

  return (
    <svg height={height} role="img" style={{ width: '100%', maxWidth: width }} viewBox={`0 0 ${width} ${height}`}>
      <polyline fill="none" points={pathPoints} stroke="var(--brand-primary)" strokeWidth={2} />
    </svg>
  );
}
