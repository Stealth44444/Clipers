'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ChartLine, Film, House, Megaphone, MonitorPlay, Music, Package, Users } from 'lucide-react';
import { Avatar, PlatformIcon, StatusDot, formatCompactNumber } from '@clipers/ui';
import { useDemoFrame } from '@/components/brand/use-demo-frame';
import { BRAND_CASES, caseThumbnails, type BrandCase } from '@/lib/brand-cases';
import type { ShowcaseKind, ShowcaseVideo } from '@/lib/youtube-showcase';

// Spec §4.5, after the reference's product tour: icon tabs over a progress track, then the brand app's 제출 영상
// screen for that case. Tabs advance every 6 seconds while on screen; a click jumps.

const ICONS: Record<BrandCase['id'], ReactNode> = {
  launch: <Package size={24} />,
  music: <Music size={24} />,
  channel: <MonitorPlay size={24} />,
};
const FRAMES = BRAND_CASES.map((item) => ({ ms: 6000, state: item.id }));
const NAV = [
  { label: '홈', icon: <House size={15} /> },
  { label: '캠페인', icon: <Megaphone size={15} /> },
  { label: '제출 영상', icon: <Film size={15} />, active: true },
  { label: '크리에이터', icon: <Users size={15} /> },
  { label: '분석', icon: <ChartLine size={15} /> },
];
const TILES = 5;

export default function UseCases({ videos = {} }: { videos?: Partial<Record<ShowcaseKind, ShowcaseVideo[]>> }) {
  const { ref, index, moving, go } = useDemoFrame<BrandCase['id'], HTMLElement>(FRAMES);
  const active = BRAND_CASES[index];
  const thumbnails = caseThumbnails(videos[active.showcase], TILES, active.posters);

  return (
    <section aria-labelledby="cases-title" className="cl-landing-section cl-cases" ref={ref}>
      <h2 className="cl-landing-section__title" id="cases-title">
        이럴 때 캠페인을 열어요
      </h2>
      <div aria-label="사례" className="cl-cases__tabs" role="tablist">
        {BRAND_CASES.map((item, position) => (
          <button
            aria-controls="cases-panel"
            aria-selected={position === index}
            className="cl-cases__tab"
            id={`case-${item.id}`}
            key={item.id}
            onClick={() => go(position)}
            role="tab"
            type="button"
          >
            <span aria-hidden className="cl-cases__icon">
              {ICONS[item.id]}
            </span>
            <span className="cl-cases__label">{item.label}</span>
          </button>
        ))}
      </div>
      <div aria-hidden className="cl-cases__track" style={{ '--cases': BRAND_CASES.length, '--case': index } as CSSProperties}>
        <span data-moving={moving} key={index} />
      </div>

      <div aria-labelledby={`case-${active.id}`} className="cl-cases__panel" id="cases-panel" role="tabpanel">
        <p className="cl-cases__lead">{active.lead}</p>
        <div aria-hidden className="cl-demo cl-cases__window">
          <div className="cl-demo__titlebar">
            <span className="cl-traffic">
              <span className="cl-traffic__close" />
              <span className="cl-traffic__minimize" />
              <span className="cl-traffic__zoom" />
            </span>
            <span className="cl-demo__title">Clipers — 제출 영상</span>
            <span className="cl-demo__user">
              <Avatar name={active.brand} size="sm" />
              {active.brand}
            </span>
          </div>
          <div className="cl-demo__body">
            <nav className="cl-demo__nav">
              <img alt="" className="cl-demo__brand" src="/logo/clipers-wordmark.svg" />
              <span className="cl-demo__nav-heading">브랜드</span>
              {NAV.map((item) => (
                <span className="cl-demo__nav-item" data-active={item.active ?? false} key={item.label}>
                  {item.icon}
                  {item.label}
                </span>
              ))}
            </nav>
            <div className="cl-cases__content">
              <header className="cl-live__head">
                <div>
                  <p className="cl-live__eyebrow">{active.kind}</p>
                  <p className="cl-live__title">{active.title}</p>
                </div>
                <StatusDot pulse tone="green">
                  진행 중
                </StatusDot>
              </header>
              <p className="cl-cases__filters">
                <span data-on="true">
                  전체<b>{active.counts.all}</b>
                </span>
                <span>
                  검수 대기<b>{active.counts.pending}</b>
                </span>
                <span>
                  승인<b>{active.counts.approved}</b>
                </span>
              </p>
              <ul className="cl-cases__grid">
                {active.clips.map((clip, position) => (
                  <li key={`${active.id}-${position}`} style={{ animationDelay: `${position * 60}ms` }}>
                    <img alt="" className="cl-cases__thumb" referrerPolicy="no-referrer" src={thumbnails[position]} />
                    <span className="cl-cases__who">
                      <Avatar name={clip.creator} size="sm" />
                      <span>{clip.creator}</span>
                      <PlatformIcon platform={clip.platform} size={13} />
                    </span>
                    <span className="cl-cases__row">
                      <span>조회수 {formatCompactNumber(clip.views)}</span>
                      {clip.pending ? (
                        <StatusDot pulse tone="yellow">
                          검수 대기
                        </StatusDot>
                      ) : (
                        <StatusDot tone="green">승인</StatusDot>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
