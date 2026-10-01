import type { ReactNode } from 'react';

export function SectionHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="cl-section-header">
      <div>
        <h2 className="cl-section-header__title">{title}</h2>
        {description && <p className="cl-section-header__description">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stack({ children }: { children: ReactNode }) {
  return <div className="cl-stack">{children}</div>;
}

export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: number | string }) {
  return <span aria-hidden className="cl-skeleton" style={{ height, width }} />;
}
