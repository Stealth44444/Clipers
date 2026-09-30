import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

type CardProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  flush?: boolean;
};

export function Card({ title, description, actions, flush, className, children, ...rest }: CardProps) {
  const hasHeader = title || description || actions;
  return (
    <section className={cx('cl-card', flush && 'cl-card--flush', className)} {...rest}>
      {hasHeader && (
        <div className="cl-card__header">
          <div>
            {title && <h2 className="cl-card__title">{title}</h2>}
            {description && <p className="cl-card__description">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
