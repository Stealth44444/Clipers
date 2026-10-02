'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChartNoAxesColumn, Layers, Users } from 'lucide-react';
import { platformLabel } from '@clipers/db';
import { Avatar, DeviceFrame, PlatformIcon } from '@clipers/ui';
import ShortSlide from '@/components/short-slide';
import { useStickySteps } from '@/components/use-sticky-steps';
import { ARRIVALS, HIT_PERCENT, HOOP_CLIPS, RANKED_CLIPS, compactViews, type ReachClip } from '@/lib/brand-reach';

// Spec: docs/superpowers/specs/2026-10-02-brand-reach-section-design.md §4. The why that ViewsStory doesn't cover:
// more clips, more chances. Same grammar as the creator page's campaign kinds (CampaignTypes): a pinned stage, one
// sentence per scene on the left, the real product on the right, a segmented progress bar. Phones stack the scenes.

const ARRIVAL_MS = 520;

type Scene = { id: 'many' | 'more' | 'ranked'; label: string; icon: ReactNode; title: string; body: ReactNode };

const SCENES: Scene[] = [
  {
    id: 'many',
    label: '여러 크리에이터',
    icon: <Users size={26} />,
    title: '한 명 대신, 여러 크리에이터가 동시에 올려요.',
    body: (
      <>
        <span className="cl-phrase">서로 다른 계정과 플랫폼에서 영상이 한꺼번에&nbsp;올라와요.</span>{' '}
        <span className="cl-phrase">한 사람의 팔로워에만 머물지&nbsp;않아요.</span>
      </>
    ),
  },
  {
    id: 'more',
    label: '영상 수만큼의 기회',
    icon: <Layers size={26} />,
    title: '영상이 많을수록, 터질 기회도 많아요.',
    body: (
      <>
        <span className="cl-phrase">
          영상 10편이면 그중 하나가 상위 20%에 들 확률이 {HIT_PERCENT}%예요.
        </span>{' '}
        <span className="cl-phrase">빗나간 영상엔 예산이 쓰이지 않아요.</span>
      </>
    ),
  },
  {
    id: 'ranked',
    label: '먹히는 영상',
    icon: <ChartNoAxesColumn size={26} />,
    title: '무엇이 먹히는지, 조회수가 알려줘요.',
    body: (
      <>
        <span className="cl-phrase">같은 경기도 크리에이터마다 장면과 첫&nbsp;3초, 자막이&nbsp;달라요.</span>{' '}
        <span className="cl-phrase">어떤 영상이 퍼졌는지 캠페인 화면에서 바로&nbsp;보여요.</span>
      </>
    ),
  },
];

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Phone({ clip, views, hit, videoRef }: { clip: ReachClip; views?: string; hit?: boolean; videoRef: (element: HTMLVideoElement | null) => void }) {
  return (
    <div className="cl-reach__phone">
      <DeviceFrame>
        <div className="cl-short">
          <ShortSlide clip={clip} preload="metadata" videoRef={videoRef} />
        </div>
      </DeviceFrame>
      {views && (
        <p className="cl-earn__views" data-hit={hit || undefined}>
          <PlatformIcon platform={clip.platform} size={16} />
          조회수 <b>{views}</b>
        </p>
      )}
    </div>
  );
}

export default function ReachStory() {
  const { rootRef, progress, active, jumpTo } = useStickySteps(SCENES.length);
  const videos = useRef(new Map<string, { scene: number; element: HTMLVideoElement }>());
  const [landed, setLanded] = useState(ARRIVALS.length);

  // Each clip plays while it is on screen and, on wide screens, while its scene is the one showing.
  useEffect(() => {
    if (reducedMotion()) return;
    const clips = videos.current;
    const narrow = window.matchMedia('(max-width: 860px)');
    const seen = new Set<HTMLVideoElement>();
    const sync = () => {
      clips.forEach(({ scene, element }) => {
        if (seen.has(element) && (narrow.matches || scene === active)) void element.play().catch(() => undefined);
        else element.pause();
      });
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? seen.add(entry.target as HTMLVideoElement) : seen.delete(entry.target as HTMLVideoElement)));
      sync();
    });
    clips.forEach(({ element }) => observer.observe(element));
    narrow.addEventListener('change', sync);
    return () => {
      observer.disconnect();
      narrow.removeEventListener('change', sync);
      clips.forEach(({ element }) => element.pause());
    };
  }, [active]);

  // The first scene's notifications land one by one, oldest first, each time it comes on. The server HTML, reduced
  // motion and phones (where the scenes stack and never switch) show them all.
  useEffect(() => {
    if (active !== 0 || reducedMotion() || window.matchMedia('(max-width: 860px)').matches) return;
    setLanded(0);
    const timer = window.setInterval(() => setLanded((count) => (count >= ARRIVALS.length ? count : count + 1)), ARRIVAL_MS);
    return () => window.clearInterval(timer);
  }, [active]);

  const video = (key: string, scene: number) => (element: HTMLVideoElement | null) => {
    if (element) videos.current.set(key, { scene, element });
    else videos.current.delete(key);
  };

  const visual = (scene: Scene, index: number) => {
    if (scene.id === 'many')
      return (
        <div className="cl-kinds__card" data-slot="arrivals">
          <div className="cl-reach__arrivals">
            {ARRIVALS.map((arrival, order) => (
              <div className="cl-notice" data-landed={ARRIVALS.length - 1 - order < landed} key={arrival.creator}>
                <img alt="" className="cl-notice__icon" src="/logo/clipers-mark.svg" />
                <div className="cl-notice__text">
                  <p className="cl-notice__head">
                    <strong>새 클립</strong>
                    <span>{arrival.ago}</span>
                  </p>
                  <p className="cl-notice__body cl-reach__arrival">
                    <PlatformIcon platform={arrival.platform} size={14} />
                    {arrival.creator}님이 {platformLabel(arrival.platform)}에 영상을 올렸어요.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    if (scene.id === 'more')
      return HOOP_CLIPS.map((clip, slot) => (
        <div className="cl-kinds__card" data-slot={clip.hit ? 'front' : slot === 0 ? 'left' : 'right'} key={clip.video}>
          <Phone clip={clip} hit={clip.hit} videoRef={video(clip.video, index)} views={compactViews(clip.views)} />
        </div>
      ));
    return (
      <div className="cl-kinds__card" data-slot="panel">
        <div className="cl-app-dark cl-bdemo cl-reach__panel">
          <p className="cl-bdemo__label">받은 클립 · 조회수 순</p>
          <ul className="cl-bdemo__people">
            {RANKED_CLIPS.map((row, rank) => (
              <li data-hit={rank === 0 || undefined} key={row.title}>
                <Avatar name={row.creator} size="sm" />
                <span className="cl-bdemo__person">
                  <span>{row.title}</span>
                  <small>
                    {row.creator} · {platformLabel(row.platform)}
                  </small>
                </span>
                <span className="cl-reach__views">{compactViews(row.views)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <section aria-labelledby="reach-title" className="cl-kinds cl-reach" ref={rootRef} style={{ '--kinds': SCENES.length } as CSSProperties}>
      <h2 className="cl-reach__title" id="reach-title">
        한 명 대신, 여러 크리에이터가 동시에 올려요
      </h2>
      <div className="cl-kinds__stage">
        {SCENES.map((scene, index) => (
          <article className="cl-kinds__item" data-kind={scene.id} data-state={index < active ? 'past' : index === active ? 'active' : 'next'} key={scene.id}>
            <p className="cl-kinds__text">
              <span aria-hidden className="cl-kinds__icon">
                {scene.icon}
              </span>
              <span>
                <strong>{scene.title}</strong> {scene.body}
              </span>
            </p>
            <div aria-hidden className="cl-kinds__stack" inert>
              {visual(scene, index)}
            </div>
          </article>
        ))}

        <nav aria-label="영상이 퍼지는 방식 진행" className="cl-kinds__progress">
          {SCENES.map((scene, index) => (
            <button
              aria-current={index === active ? 'step' : undefined}
              aria-label={scene.label}
              className="cl-kinds__step"
              key={scene.id}
              onClick={() => jumpTo(index)}
              type="button"
            >
              <span aria-hidden className="cl-kinds__step-track">
                <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress * SCENES.length - index))})` }} />
              </span>
            </button>
          ))}
        </nav>
      </div>
  </section>
  );
}
