'use client';

import { useEffect, useRef, useState } from 'react';
import { DeviceFrame } from '@clipers/ui';

// Campaign kinds: pick one on the left and the phone on the right shows what that kind of video looks like.
// Advances on its own while in view, until someone picks.

const KINDS = [
  { id: 'clipping', title: '클리핑', body: '브랜드가 준 긴 영상에서 좋은 장면을 골라 짧게 편집해 올려요.' },
  { id: 'ugc', title: 'UGC', body: '제품과 서비스를 직접 써 보고, 내 말투로 소개하는 영상을 만들어요.' },
  { id: 'music', title: '음악', body: '신곡과 음원을 내 영상에 쓰고, 노래가 퍼진 만큼 받아요.' },
] as const;

const STEP_MS = 4800;

export default function KindsShowcase() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = 0;
    const observer = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer);
      if (entry.isIntersecting) timer = window.setInterval(() => setActive((index) => (index + 1) % KINDS.length), STEP_MS);
    });
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [auto]);

  return (
    <div className="cl-kinds" data-auto={auto} ref={rootRef}>
      <div className="cl-kinds__list">
        {KINDS.map((kind, index) => (
          <button
            aria-pressed={index === active}
            className="cl-kinds__item"
            key={kind.id}
            onClick={() => {
              setActive(index);
              setAuto(false);
            }}
            type="button"
          >
            <span className="cl-kinds__title">{kind.title}</span>
            <span className="cl-kinds__body">{kind.body}</span>
            {index === active && auto && <span aria-hidden className="cl-kinds__timer" key={`timer-${active}`} />}
          </button>
        ))}
      </div>

      <div aria-hidden className="cl-kinds__stage">
        <DeviceFrame className="cl-kinds__device">
          <div className="cl-kinds__screens" data-active={KINDS[active].id}>
            <div className="cl-kinds__screen cl-kinds__screen--clipping">
              <div className="cl-trim">
                <span className="cl-trim__time">00:42 – 00:57</span>
                <div className="cl-trim__strip">
                  {Array.from({ length: 8 }, (_, index) => (
                    <i key={index} />
                  ))}
                  <span className="cl-trim__window" />
                </div>
              </div>
            </div>
            <div className="cl-kinds__screen cl-kinds__screen--ugc">
              <span className="cl-rec">녹화 중 00:12</span>
              <span className="cl-rec__product" />
            </div>
            <div className="cl-kinds__screen cl-kinds__screen--music">
              <span className="cl-audio">
                <span className="cl-audio__disc" />
                여름밤 · 데모 레코즈
              </span>
            </div>
          </div>
        </DeviceFrame>
      </div>
    </div>
  );
}
