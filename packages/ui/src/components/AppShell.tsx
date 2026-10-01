'use client';

import { useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { IconButton } from './Button';

export function AppShell({ logo, topbarEnd, sidebar, children }: { logo: ReactNode; topbarEnd?: ReactNode; sidebar: ReactNode; children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="cl-shell" data-nav-open={navOpen}>
      <header className="cl-topbar">
        <IconButton className="cl-menu-toggle" label={navOpen ? '메뉴 닫기' : '메뉴 열기'} onClick={() => setNavOpen((open) => !open)}>
          {navOpen ? <X size={20} /> : <Menu size={20} />}
        </IconButton>
        {logo}
        <div className="cl-topbar__end">{topbarEnd}</div>
      </header>
      <div className="cl-shell__body">
        <div
          className="cl-shell__nav"
          onClick={(event) => {
            if ((event.target as Element).closest('a')) setNavOpen(false);
          }}
        >
          {sidebar}
        </div>
        <div aria-hidden className="cl-scrim" onClick={() => setNavOpen(false)} />
        <main className="cl-shell__main">{children}</main>
      </div>
    </div>
  );
}
