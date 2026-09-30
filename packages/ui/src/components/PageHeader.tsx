import type { ReactNode } from 'react';

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="cl-page-header">
      <div>
        <h1 className="cl-page-header__title">{title}</h1>
        {description && <p className="cl-page-header__description">{description}</p>}
      </div>
      {actions && <div className="cl-page-header__actions">{actions}</div>}
    </header>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="cl-page">{children}</div>;
}
