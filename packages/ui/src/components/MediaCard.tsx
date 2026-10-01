import type { ReactNode } from 'react';
import { ImageIcon } from '@phosphor-icons/react/ssr';

export function MediaCard({ image, title, meta, children, footer }: {
  image?: string | null;
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <article className="cl-media-card">
      <div className="cl-media-card__media">
        {image ? <img alt="" src={image} /> : <ImageIcon aria-hidden size={28} />}
      </div>
      <div className="cl-media-card__body">
        <h3 className="cl-media-card__title">{title}</h3>
        {meta && <p className="cl-media-card__meta">{meta}</p>}
        {children}
      </div>
      {footer && <div className="cl-media-card__footer">{footer}</div>}
    </article>
  );
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="cl-card-grid">{children}</div>;
}
