'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { XIcon } from '@phosphor-icons/react/ssr';
import { IconButton } from './Button';

export function Dialog({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      className="cl-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      ref={ref}
    >
      <div className="cl-dialog__header">
        <h2 className="cl-dialog__title">{title}</h2>
        <IconButton label="닫기" onClick={onClose}>
          <XIcon size={18} />
        </IconButton>
      </div>
      <div className="cl-dialog__body">{children}</div>
      {footer && <div className="cl-dialog__footer">{footer}</div>}
    </dialog>
  );
}
