'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react/ssr';
import { cx } from '../lib/cx';

/**
 * Horizontal row of cards without a visible scrollbar; arrow buttons in the header page through it.
 * Arrows disable at either end (both when everything already fits).
 */
export function Rail({ title, description, variant = 'cards', children }: {
  title: ReactNode;
  description?: ReactNode;
  variant?: 'cards' | 'clips';
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setEdges({
      start: track.scrollLeft <= 1,
      end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    track.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener('scroll', measure);
    };
  }, [measure]);

  const page = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: 'smooth' });
  };

  return (
    <section className="cl-rail-section">
      <div className="cl-section-header">
        <div>
          <h2 className="cl-section-header__title">{title}</h2>
          {description && <p className="cl-section-header__description">{description}</p>}
        </div>
        {/* Always shown so the control doesn't pop in; disabled while there is nothing to page to. */}
        <div className="cl-rail__arrows">
          <button aria-label="이전" className="cl-rail__arrow" disabled={edges.start} onClick={() => page(-1)} type="button">
            <CaretLeftIcon size={18} />
          </button>
          <button aria-label="다음" className="cl-rail__arrow" disabled={edges.end} onClick={() => page(1)} type="button">
            <CaretRightIcon size={18} />
          </button>
        </div>
      </div>
      <div className={cx('cl-rail', variant === 'clips' && 'cl-rail--clips')} ref={trackRef}>
        {children}
      </div>
    </section>
  );
}
