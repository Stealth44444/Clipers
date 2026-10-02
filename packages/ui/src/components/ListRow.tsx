import type { ReactNode } from 'react';

export function List({ children }: { children: ReactNode }) {
  return <div className="cl-list">{children}</div>;
}

export function ListRow({ icon, title, description, trailing }: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="cl-list__row">
      {icon && <span className="cl-list__icon">{icon}</span>}
      <div className="cl-list__text">
        <p className="cl-list__title">{title}</p>
        {description && <p className="cl-list__description">{description}</p>}
      </div>
      {trailing}
    </div>
  );
}
