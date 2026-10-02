'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown } from 'lucide-react';
import { PLATFORMS } from '@clipers/db';
import { PlatformIcon } from '@clipers/ui';

/** The discover URL with the given filters; empty values drop out. */
function discoverUrl(filters: { q?: string; group?: string | null; platform?: string | null }): string {
  const params = new URLSearchParams();
  if (filters.group) params.set('group', filters.group);
  if (filters.platform) params.set('platform', filters.platform);
  if (filters.q) params.set('q', filters.q);
  const query = params.toString();
  return query ? `/discover?${query}` : '/discover';
}

/**
 * The discover search bar's platform filter, drawn by the page (a native select opens the operating system's own list).
 * Each option is a link that keeps the search and the 분야 filter; Escape or a click outside closes it.
 */
export default function PlatformSelect({ value, group, q }: { value: string | null; group: string | null; q: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const current = PLATFORMS.find((platform) => platform.value === value) ?? null;

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

  const options = [{ value: null, label: '모든 플랫폼' }, ...PLATFORMS.map((platform) => ({ value: platform.value as string | null, label: platform.label as string }))];

  return (
    <div
      className="cl-pmenu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
      ref={rootRef}
    >
      <button aria-controls={panelId} aria-expanded={open} aria-label="플랫폼" className="cl-pmenu__trigger" onClick={() => setOpen((shown) => !shown)} type="button">
        {current && <PlatformIcon platform={current.value} size={16} />}
        {current?.label ?? '모든 플랫폼'}
        <ChevronDown aria-hidden size={15} />
      </button>
      <div className="cl-pmenu__panel" hidden={!open} id={panelId}>
        {options.map((option) => {
          const selected = option.value === (current?.value ?? null);
          return (
            <Link
              aria-current={selected ? 'true' : undefined}
              className="cl-pmenu__item"
              href={discoverUrl({ q, group, platform: option.value })}
              key={option.value ?? 'all'}
              onClick={() => setOpen(false)}
            >
              <span aria-hidden className="cl-pmenu__icon">
                {option.value && <PlatformIcon platform={option.value} size={16} />}
              </span>
              {option.label}
              {selected && <Check aria-hidden className="cl-pmenu__check" size={15} />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
