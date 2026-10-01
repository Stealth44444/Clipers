'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Section title above the creator logo wall: a phrase that rolls up to the next one, then a fixed tail.
// The slot's width follows the active phrase so the centred line never jumps.
// Reduced motion shows one static sentence; screen readers always get the full sentence.

const PHRASES = ['새 채널이어도', '수익창출 전이어도', '숏폼이 처음이어도'];
const TAIL = '바로 시작할 수 있어요';
const SENTENCE = `${PHRASES.join(', ')} ${TAIL}`;
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

  if (still) return <h2 className="cl-rotator">{SENTENCE}</h2>;

  return (
    <h2 aria-label={SENTENCE} className="cl-rotator" ref={rootRef}>
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
      </span>{' '}
      <span aria-hidden className="cl-rotator__tail">
        {TAIL}
      </span>
    </h2>
  );
}
