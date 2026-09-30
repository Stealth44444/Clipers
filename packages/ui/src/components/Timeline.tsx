import type { ReactNode } from 'react';

export type TimelineItem = { id: string; label: ReactNode; count?: number; valueLabel: ReactNode; value: ReactNode; action?: ReactNode };

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="cl-timeline">
      {items.map((item) => (
        <li className="cl-timeline__item" key={item.id}>
          <span className="cl-timeline__label">
            {item.label} {item.count !== undefined && <span className="cl-timeline__count">({item.count})</span>}
          </span>
          <span className="cl-timeline__value">
            {item.valueLabel}: <strong>{item.value}</strong>
          </span>
        </li>
      ))}
    </ol>
  );
}
