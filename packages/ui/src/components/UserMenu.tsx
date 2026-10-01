'use client';

import { useEffect, useRef, useState } from 'react';
import { CaretDownIcon, SignOutIcon } from '@phosphor-icons/react/ssr';
import { Avatar } from './Avatar';

export function UserMenu({ name, subtitle, onSignOut, signOutLabel = '로그아웃' }: { name: string; subtitle?: string; onSignOut: () => void; signOutLabel?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="cl-user-menu" ref={ref}>
      <button aria-expanded={open} aria-haspopup="menu" className="cl-user-menu__trigger" onClick={() => setOpen((value) => !value)} type="button">
        <Avatar name={name || '?'} size="sm" />
        <span className="cl-user-menu__name">{name}</span>
        <CaretDownIcon size={16} />
      </button>
      {open && (
        <div className="cl-user-menu__panel" role="menu">
          <div className="cl-user-menu__identity">
            <strong>{name}</strong>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <button className="cl-user-menu__item" onClick={onSignOut} role="menuitem" type="button">
            <SignOutIcon size={16} />
            {signOutLabel}
          </button>
        </div>
      )}
    </div>
  );
}
