'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * The macOS pointer of a product demo. It glides to the element marked `data-demo={target}` inside the stage
 * (or rests near the bottom-right corner when there is no target) and dips when `click` is true.
 */
export default function DemoCursor({ stage, target, click }: { stage: RefObject<HTMLElement | null>; target: string | null; click: boolean }) {
  const [point, setPoint] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const root = stage.current;
    if (!root) return;
    const place = () => {
      const box = root.getBoundingClientRect();
      const element = target ? root.querySelector<HTMLElement>(`[data-demo="${target}"]`) : null;
      if (!element) {
        setPoint({ x: box.width * 0.82, y: box.height * 0.88 });
        return;
      }
      const rect = element.getBoundingClientRect();
      setPoint({ x: rect.left - box.left + rect.width * 0.5, y: rect.top - box.top + rect.height * 0.6 });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    return () => observer.disconnect();
  }, [stage, target]);

  return (
    <svg
      aria-hidden
      className="cl-demo-cursor"
      data-click={click}
      height="24"
      style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
      viewBox="0 0 16 22"
      width="18"
    >
      <path d="M1 1v17.5l4.6-4.4 3.1 7 2.9-1.3-3-6.8h6.2z" fill="#000" stroke="#fff" strokeLinejoin="round" strokeWidth="1.4" />
    </svg>
  );
}
