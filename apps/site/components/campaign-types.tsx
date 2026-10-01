'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Clapperboard, Music, Scissors } from 'lucide-react';
import MockCampaignCard, { MOCK_CAMPAIGNS } from '@/components/mock-campaign-card';

// Campaign kinds, after contentrewards.com: on wide screens the stage sticks while the page scrolls and
// each kind takes over in turn (a segmented progress bar shows where you are and jumps on click);
// on narrow screens the kinds simply stack.

const KINDS: { id: keyof typeof MOCK_CAMPAIGNS; label: string; icon: ReactNode; title: string; body: string }[] = [
  { id: 'clipping', label: '클리핑', icon: <Scissors size={26} />, title: '클리핑 캠페인.', body: '브랜드가 준 영상을 짧게 편집해 올리고, 조회수만큼 받아요.' },
  { id: 'ugc', label: 'UGC', icon: <Clapperboard size={26} />, title: 'UGC 캠페인.', body: '제품과 서비스를 직접 써 보고 소개하는 영상을 만들어, 조회수만큼 받아요.' },
  { id: 'music', label: '음악', icon: <Music size={26} />, title: '음악 캠페인.', body: '신곡과 음원을 영상에 쓰고, 노래가 퍼진 만큼 받아요.' },
];

export default function CampaignTypes() {
  const rootRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const active = Math.min(KINDS.length - 1, Math.floor(progress * KINDS.length));

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
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Scroll to the middle of a kind's stretch of the pinned section.
  const jumpTo = (index: number) => {
    const root = rootRef.current;
    if (!root) return;
    const top = root.getBoundingClientRect().top + window.scrollY;
    const travel = root.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + travel * ((index + 0.5) / KINDS.length), behavior: 'smooth' });
  };

  return (
    <section aria-label="캠페인 종류" className="cl-kinds" ref={rootRef} style={{ '--kinds': KINDS.length } as CSSProperties}>
      <div className="cl-kinds__stage">
        {KINDS.map((kind, index) => (
          <article className="cl-kinds__item" data-state={index < active ? 'past' : index === active ? 'active' : 'next'} key={kind.id}>
            <p className="cl-kinds__text">
              <span aria-hidden className="cl-kinds__icon">
                {kind.icon}
              </span>
              <span>
                <strong>{kind.title}</strong> {kind.body}
              </span>
            </p>
            <div aria-hidden className="cl-kinds__stack">
              {MOCK_CAMPAIGNS[kind.id].map((campaign) => (
                <div className="cl-kinds__card" key={campaign.title}>
                  <MockCampaignCard campaign={campaign} />
                </div>
              ))}
            </div>
          </article>
        ))}

        <nav aria-label="캠페인 종류 진행" className="cl-kinds__progress">
          {KINDS.map((kind, index) => (
            <button aria-current={index === active ? 'step' : undefined} className="cl-kinds__step" key={kind.id} onClick={() => jumpTo(index)} type="button">
              <span className="cl-kinds__step-label">{kind.label}</span>
              <span aria-hidden className="cl-kinds__step-track">
                <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress * KINDS.length - index))})` }} />
              </span>
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}
