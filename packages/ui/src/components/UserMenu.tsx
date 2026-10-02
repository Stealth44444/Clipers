'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { Avatar } from './Avatar';

export type UserMenuLink = { href: string; label: string; icon?: ReactNode };

export function UserMenu({ name, subtitle, links = [], onSignOut, signOutLabel = '로그아웃' }: {
  name: string;
  subtitle?: string;
  /** Plain links shown above sign-out; they may leave the app, so they render as anchors. */
  links?: UserMenuLink[];
  onSignOut: () => void;
  signOutLabel?: string;
}) {
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
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="cl-user-menu__panel" role="menu">
          <div className="cl-user-menu__identity">
            <strong>{name}</strong>
            {subtitle && <span>{subtitle}</span>}
          </div>
          {links.map((link) => (
            <a className="cl-user-menu__item" href={link.href} key={link.href} role="menuitem">
              {link.icon}
              {link.label}
            </a>
          ))}
          <button className="cl-user-menu__item" onClick={onSignOut} role="menuitem" type="button">
            <LogOut size={16} />
            {signOutLabel}
          </button>
        </div>
      )}
    </div>
  );
}
