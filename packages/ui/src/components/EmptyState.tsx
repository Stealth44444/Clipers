import type { ReactNode } from 'react';

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="cl-empty">
      <span className="cl-empty__icon">{icon}</span>
      <p className="cl-empty__title">{title}</p>
      {description && <p className="cl-empty__description">{description}</p>}
      {action && <div className="cl-empty__action">{action}</div>}
    </div>
  );
}
