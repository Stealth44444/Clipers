'use client';

import { cx } from '../lib/cx';

export type TabItem<T extends string> = { value: T; label: string; count?: number };

/** Segmented tabs. `block` spans the container with equal segments instead of sizing to the labels. */
export function Tabs<T extends string>({ items, value, onChange, label, block }: { items: TabItem<T>[]; value: T; onChange: (value: T) => void; label: string; block?: boolean }) {
  return (
    <div aria-label={label} className={cx('cl-tabs', block && 'cl-tabs--block')} role="tablist">
      {items.map((item) => (
        <button
          aria-selected={item.value === value}
          className="cl-tab"
          key={item.value}
          onClick={() => onChange(item.value)}
          role="tab"
          type="button"
        >
          {item.label}
          {item.count !== undefined && <span className="cl-tab__count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
