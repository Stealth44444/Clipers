'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Section title above the creator logo wall: a fixed lead and a phrase that rolls up to the next one.
// The slot's width follows the active phrase so the centred line never jumps. Reduced motion shows one
// static sentence; screen readers always get the full sentence.

const LEAD = 'Clipers에서';
const PHRASES = ['캠페인에 참여하세요', '영상을 제출하세요', '빠르게 정산받으세요'];
const STEP_MS = 2600;

export default function RotatingHeadline() {
  const rootRef = useRef<HTMLHeadingElement>(null);
  const phraseRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [width, setWidth] = useState<number>();
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true);
      return;
    }
    let timer = 0;
    const observer = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer);
      if (entry.isIntersecting) timer = window.setInterval(() => setActive((index) => (index + 1) % PHRASES.length), STEP_MS);
    });
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  useLayoutEffect(() => {
    const measure = () => setWidth(phraseRefs.current[active]?.offsetWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active]);

  if (still) {
    return (
      <h2 className="cl-rotator">
        <span className="cl-rotator__lead">{LEAD}</span> 캠페인에 참여하고, 영상을 제출하고, 빠르게 정산받으세요
      </h2>
    );
  }

  return (
    <h2 aria-label={`${LEAD} 캠페인에 참여하고, 영상을 제출하고, 빠르게 정산받으세요`} className="cl-rotator" ref={rootRef}>
      <span aria-hidden className="cl-rotator__lead">
        {LEAD}
      </span>{' '}
      <span aria-hidden className="cl-rotator__slot" style={{ width }}>
        {PHRASES.map((phrase, index) => (
          <span
            className="cl-rotator__phrase"
            data-state={index === active ? 'active' : index === (active + PHRASES.length - 1) % PHRASES.length ? 'past' : 'next'}
            key={phrase}
            ref={(element) => {
              phraseRefs.current[index] = element;
            }}
          >
            {phrase}
          </span>
        ))}
      </span>
    </h2>
  );
}
