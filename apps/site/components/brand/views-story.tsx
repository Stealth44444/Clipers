'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import {
  SPONSOR_PRICE_PER_1K,
  belowMeanShare,
  hitTiles,
  medianPricePer1kManwon,
  medianToMean,
  worstCostMultiple,
} from '@/lib/views-math';

// Spec §5: why paying for views beats paying a fixed fee, from an 80:20 split. The section pins while native scroll
// fills 20 of 100 tiles, rolls two numbers into place and lands one line (never hijacked). Sources and the model
// live in docs/superpowers/specs/2026-10-01-brand-hero-data-design.md (the hit chance, 1 − 0.8¹⁰, moved to
// ReachStory: 2026-10-02-brand-reach-section-design.md). Phones, short screens and
// reduced motion get the finished state in normal flow. The server HTML is the finished state too.

const TILES = 100;
const HITS = hitTiles(TILES, 20);
const STATIC = '(max-width: 860px), (max-height: 819px), (prefers-reduced-motion: reduce)';

type Stat = { value: number; from: number; unit: string; accent?: boolean; title: string; body: ReactNode; range: [number, number] };

const STATS: Stat[] = [
  {
    value: medianPricePer1kManwon(),
    from: 2,
    unit: '만 원',
    accent: true,
    title: '중앙값 게시물의 실제 1천 회당 비용',
    body: (
      <>
        기준은 1천 회당 {SPONSOR_PRICE_PER_1K / 10_000}만 원이지만, 중앙값 게시물은 조회수가 평균의 {Math.round(medianToMean() * 100)}%라 실제로는 약{' '}
        {medianPricePer1kManwon()}만 원이에요.
      </>
    ),
    range: [0.44, 0.58],
  },
  {
    value: Math.round(belowMeanShare() * 100),
    from: 0,
    unit: '%',
    title: '평균에 못 미치는 게시물',
    body: (
      <>
        열 건 중 아홉 건은 약속한 단가보다 비싸게 사고, 많게는 {Math.floor(worstCostMultiple())}배까지 내요.
      </>
    ),
    range: [0.6, 0.74],
  },
];

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => 1 - Math.pow(1 - value, 3);
const span = (value: number, a: number, b: number) => clamp((value - a) / (b - a));
const pair = (text: string | undefined): [number, number] => {
  const [a = 0, b = 1] = (text ?? '').split(' ').map(Number);
  return [a, b];
};

export default function ViewsStory() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const media = window.matchMedia(STATIC);
    const enters = Array.from(track.querySelectorAll<HTMLElement>('[data-enter]'));
    const beats = Array.from(track.querySelectorAll<HTMLElement>('[data-beat]'));
    const hits = Array.from(track.querySelectorAll<HTMLElement>('[data-hit]'));
    const counts = Array.from(track.querySelectorAll<HTMLElement>('[data-count]'));

    const apply = () => {
      if (media.matches) {
        [...enters, ...beats].forEach((el) => el.style.setProperty('--o', '1'));
        hits.forEach((el) => el.style.setProperty('--fill', '1'));
        counts.forEach((el) => (el.textContent = el.dataset.count ?? ''));
        return;
      }
      const rect = track.getBoundingClientRect();
      const enter = clamp(1 - rect.top / window.innerHeight);
      const progress = clamp(-rect.top / (rect.height - window.innerHeight));
      enters.forEach((el) => el.style.setProperty('--o', ease(span(enter, ...pair(el.dataset.enter))).toFixed(3)));
      beats.forEach((el) => el.style.setProperty('--o', ease(span(progress, ...pair(el.dataset.beat))).toFixed(3)));
      hits.forEach((el) => {
        const start = 0.05 + Number(el.dataset.hit) * 0.0165;
        el.style.setProperty('--fill', ease(span(progress, start, start + 0.06)).toFixed(3));
      });
      counts.forEach((el) => {
        const [a, b] = pair(el.dataset.range);
        const from = Number(el.dataset.from), to = Number(el.dataset.count);
        el.textContent = String(Math.round(from + (to - from) * ease(span(progress, a, b))));
      });
    };

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        apply();
      });
    };
    apply();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    media.addEventListener('change', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      media.removeEventListener('change', schedule);
    };
  }, []);

  return (
    <section aria-labelledby="views-title" className="cl-views">
      <div className="cl-views__track" ref={trackRef}>
        <div className="cl-views__pin">
          <div className="cl-views__inner">
            <div className="cl-views__intro" data-enter="0.15 0.6">
              <h2 id="views-title">
                숏폼 조회수는
                <br />
                공평하지 않아요
              </h2>
              <p>
                틱톡 추천 영상 265만 개를 분석하면, 영상 20%가 조회수의 80%를 가져가요. 협찬비는 평균 조회수에 매겨지지만, 대부분의 게시물은 그
                평균에 닿지 못해요.
              </p>
            </div>
            <figure className="cl-views__tiles" data-enter="0.4 0.9">
              <div aria-hidden className="cl-views__grid">
                {Array.from({ length: TILES }, (_, index) => {
                  const order = HITS.indexOf(index);
                  return <i data-hit={order >= 0 ? order : undefined} key={index} />;
                })}
              </div>
              <figcaption>
                <span>
                  <b data-key="hit" />이 20편이 조회수의 80%
                </span>
                <span>
                  <b />
                  나머지 80편이 20%
                </span>
              </figcaption>
            </figure>
            <div className="cl-views__stats">
              {STATS.map((stat) => (
                <div className="cl-views__stat" data-accent={stat.accent || undefined} data-beat={`${stat.range[0]} ${stat.range[0] + 0.08}`} key={stat.title}>
                  <p className="cl-views__num">
                    <span data-count={stat.value} data-from={stat.from} data-range={stat.range.join(' ')}>
                      {stat.value}
                    </span>
                    <small>{stat.unit}</small>
                  </p>
                  <h3>{stat.title}</h3>
                  <p>{stat.body}</p>
                </div>
              ))}
            </div>
            <p className="cl-views__close" data-beat="0.86 0.94">
              <strong>협찬은 평균에 돈을 내요.</strong> <span>클리핑은 실제로 난 조회수에만 내요.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
