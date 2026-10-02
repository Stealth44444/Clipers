'use client';

import { useEffect, useRef, useState } from 'react';

// A sticky stage that steps through `count` scenes as the page scrolls (the creator page's campaign kinds, the brand
// page's reach section): progress follows native scroll, one wheel gesture moves exactly one step while the stage is
// pinned, and jumpTo scrolls to a step's middle. Phones (≤ 860px) get no wheel handling; their CSS stacks the steps.

export function useStickySteps(count: number) {
  const rootRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const active = Math.min(count - 1, Math.floor(progress * count));

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = root.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) return;
      setProgress(Math.min(0.999, Math.max(0, -rect.top / travel)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    // One wheel gesture = one step. While the stage is pinned, a wheel step moves to the next (or previous) step and
    // a short lock swallows the rest of a trackpad's burst; past the first or last step it leaves the section.
    let locked = false;
    const go = (top: number) => {
      locked = true;
      window.scrollTo({ top, behavior: 'smooth' });
      window.setTimeout(() => (locked = false), 700);
    };
    // When the last wheel event scrolled the page freely (arriving at the section), a burst still in flight
    // shouldn't also skip the first step: it only settles the stage.
    let lastFree = 0;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 2 || event.ctrlKey || window.innerWidth <= 860) return;
      const rect = root.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      const down = event.deltaY > 0;
      // Only while the stage is pinned, and only in the direction that still has steps ahead.
      if (travel <= 0 || (down ? scrolled < -1 || scrolled >= travel - 1 : scrolled <= 1 || scrolled > travel + 1)) {
        lastFree = event.timeStamp;
        return;
      }
      event.preventDefault();
      if (locked) return;
      const top = rect.top + window.scrollY;
      const center = (index: number) => top + travel * ((index + 0.5) / count);
      // The step on screen now; one gesture always moves exactly one step (or leaves past either end).
      const current = Math.min(count - 1, Math.max(0, Math.floor((scrolled / travel) * count)));
      if (event.timeStamp - lastFree < 250) {
        lastFree = event.timeStamp;
        go(center(current));
        return;
      }
      const target = current + (down ? 1 : -1);
      if (target >= 0 && target < count) go(center(target));
      else go(down ? top + travel + window.innerHeight * 0.6 : top - window.innerHeight * 0.6);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('wheel', onWheel);
    };
  }, [count]);

  // Scroll to the middle of a step's stretch of the pinned section.
  const jumpTo = (index: number) => {
    const root = rootRef.current;
    if (!root) return;
    const top = root.getBoundingClientRect().top + window.scrollY;
    const travel = root.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + travel * ((index + 0.5) / count), behavior: 'smooth' });
  };

  return { rootRef, progress, active, jumpTo };
}
