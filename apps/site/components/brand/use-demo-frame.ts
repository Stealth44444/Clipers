'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Frame } from '@/lib/brand-demos';

/**
 * Plays a demo's frames in a loop while its element is on screen. Under reduced motion it shows the last frame
 * (the finished state) and never moves. `go` jumps to a frame and restarts the timing from there.
 * Pass a module-level frames array: a new array on every render would restart the loop.
 */
export function useDemoFrame<S, E extends Element = HTMLDivElement>(frames: readonly Frame<S>[]) {
  const ref = useRef<E>(null);
  const [index, setIndex] = useState(0);
  const [moving, setMoving] = useState(false);
  const current = useRef(0);
  const timer = useRef(0);
  const visible = useRef(false);

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    if (!visible.current) return;
    timer.current = window.setTimeout(() => {
      current.current = (current.current + 1) % frames.length;
      setIndex(current.current);
      schedule();
    }, frames[current.current].ms);
  }, [frames]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = frames.length - 1;
      setIndex(current.current);
      return;
    }
    setMoving(true);
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      schedule();
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer.current);
    };
  }, [frames, schedule]);

  const go = useCallback(
    (next: number) => {
      current.current = next;
      setIndex(next);
      schedule();
    },
    [schedule]
  );

  return { ref, frame: frames[index].state, index, moving, go };
}
