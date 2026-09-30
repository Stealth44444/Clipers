import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import type { Tone } from './Badge';

export function List({ children }: { children: ReactNode }) {
  return <div className="cl-list">{children}</div>;
}

export function ListRow({ icon, tone, title, description, trailing }: {
  icon?: ReactNode;
  tone?: Tone;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="cl-list__row">
      {icon && <span className={cx('cl-list__icon', tone && `cl-tone-${tone}`)}>{icon}</span>}
      <div className="cl-list__text">
        <p className="cl-list__title">{title}</p>
        {description && <p className="cl-list__description">{description}</p>}
      </div>
      {trailing}
    </div>
  );
}
