import type { ReactNode } from 'react';

export function SummaryList({ rows }: { rows: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="cl-summary">
      {rows.map((row, index) => (
        <div className="cl-summary__row" key={index}>
          <dt className="cl-summary__label">{row.label}</dt>
          <dd className="cl-summary__value">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
