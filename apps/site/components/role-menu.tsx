'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Clapperboard, Megaphone } from 'lucide-react';

const ROLES = [
  { href: '/', title: '크리에이터', description: '영상 올리고 조회수만큼 받기', icon: <Clapperboard size={17} /> },
  { href: '/brands', title: '브랜드', description: '숏폼 캠페인을 한 번에 열기', icon: <Megaphone size={17} /> },
];

/** Landing "서비스" menu: one landing per audience, after contentrewards.com's Solutions › By role. */
export default function RoleMenu({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      className="cl-role-menu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
      onPointerEnter={(event) => event.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(event) => event.pointerType === 'mouse' && setOpen(false)}
      ref={rootRef}
    >
      <button aria-controls={panelId} aria-expanded={open} className="cl-role-menu__trigger" onClick={() => setOpen((value) => !value)} type="button">
        서비스 <ChevronDown aria-hidden size={15} />
      </button>
      <div className="cl-role-menu__panel" hidden={!open} id={panelId}>
        <p className="cl-role-menu__label">역할별</p>
        {ROLES.map((role) => (
          <Link aria-current={role.href === current ? 'page' : undefined} className="cl-role-menu__item" href={role.href} key={role.href} onClick={() => setOpen(false)}>
            <span aria-hidden className="cl-role-menu__icon">
              {role.icon}
            </span>
            <span>
              <span className="cl-role-menu__title">{role.title}</span>
              <span className="cl-role-menu__description">{role.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
