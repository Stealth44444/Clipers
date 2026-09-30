'use client';

export type TabItem<T extends string> = { value: T; label: string; count?: number };

export function Tabs<T extends string>({ items, value, onChange, label }: { items: TabItem<T>[]; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div aria-label={label} className="cl-tabs" role="tablist">
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
