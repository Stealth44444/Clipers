import type { ReactNode } from 'react';
import { WarningCircleIcon } from '@phosphor-icons/react/ssr';

export function StickyFooter({ message, children }: { message?: string | null; children: ReactNode }) {
  return (
    <div className="cl-sticky-footer">
      {message && (
        <span className="cl-sticky-footer__message" role="status">
          <WarningCircleIcon size={16} />
          {message}
        </span>
      )}
      <div className="cl-sticky-footer__actions">{children}</div>
    </div>
  );
}
