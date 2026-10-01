'use client';

import { useEffect, useRef, useState } from 'react';
import { ChartLine, Film, House, Megaphone, Users } from 'lucide-react';
import { Avatar, LineChart, PlatformIcon, StatusDot } from '@clipers/ui';

// Brand hero: the brand's own campaign dashboard, running live inside a macOS window. Verified views tick up,
// the chart grows, and new submissions arrive and pass review. Budget figures are left out on purpose:
// next to the views they would reveal the brand rate.

type Submission = { id: number; creator: string; platform: string; title: string; approved: boolean };

const INCOMING: Omit<Submission, 'id' | 'approved'>[] = [
  { creator: '하루', platform: 'youtube_shorts', title: '후렴 15초 챌린지 · 첫 시도' },
  { creator: '민지', platform: 'instagram_reels', title: '여름밤 립싱크 버전' },
  { creator: '도윤', platform: 'tiktok', title: '퇴근길 여름밤 듣기' },
  { creator: '서아', platform: 'naver_clip', title: '여름밤 커버 댄스' },
  { creator: '지호', platform: 'youtube_shorts', title: '기타로 치는 여름밤 후렴' },
  { creator: '유나', platform: 'kakao_shorts', title: '친구랑 여름밤 챌린지' },
];

const NAV = [
  { label: '홈', icon: <House size={15} /> },
  { label: '캠페인', icon: <Megaphone size={15} />, active: true },
  { label: '제출 영상', icon: <Film size={15} /> },
  { label: '크리에이터', icon: <Users size={15} /> },
  { label: '분석', icon: <ChartLine size={15} /> },
];

const START_VIEWS = 1_184_200;
const SERIES_START = [0.08, 0.16, 0.27, 0.39, 0.5, 0.61, 0.71, 0.8, 0.88, 0.94, 0.98, 1].map((share) => Math.round(START_VIEWS * share));

const dayLabel = (index: number) => `9/${index + 18}`;

export default function BrandLiveWindow() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [views, setViews] = useState(START_VIEWS);
  const [series, setSeries] = useState(SERIES_START);
  const [feed, setFeed] = useState<Submission[]>(() => INCOMING.slice(0, 4).map((item, index) => ({ ...item, id: index, approved: index > 0 })));
  const [approvedCount, setApprovedCount] = useState(212);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timers: number[] = [];
    let next = 4;
    const start = () => {
      timers = [
        // Verified views tick up continuously.
        window.setInterval(() => setViews((value) => value + Math.round(40 + Math.random() * 160)), 140),
        // The chart's last point follows the counter; a new day starts now and then.
        window.setInterval(() => {
          setSeries((points) => {
            const grown = [...points];
            grown[grown.length - 1] = Math.round(grown[grown.length - 1] * 1.012);
            return grown;
          });
        }, 1400),
        // New submissions arrive pending, then pass review.
        window.setInterval(() => {
          const item = INCOMING[next % INCOMING.length];
          const id = next;
          next += 1;
          setFeed((rows) => [{ ...item, id, approved: false }, ...rows].slice(0, 4));
          window.setTimeout(() => {
            setFeed((rows) => rows.map((row) => (row.id === id ? { ...row, approved: true } : row)));
            setApprovedCount((count) => count + 1);
          }, 1800);
        }, 3600),
      ];
    };
    const stop = () => {
      timers.forEach((timer) => window.clearInterval(timer));
      timers = [];
    };
    const observer = new IntersectionObserver(([entry]) => {
      stop();
      if (entry.isIntersecting) start();
    });
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      observer.disconnect();
      stop();
    };
  }, []);

  const points = series.map((value, index) => ({
    label: dayLabel(index),
    detail: `9월 ${index + 18}일`,
    value: index === series.length - 1 ? Math.max(value, views) : value,
  }));

  return (
    <div aria-label="Clipers 브랜드 대시보드 예시" className="cl-demo cl-live" ref={rootRef} role="img">
      <div className="cl-demo__titlebar">
        <span aria-hidden className="cl-traffic">
          <span className="cl-traffic__close" />
          <span className="cl-traffic__minimize" />
          <span className="cl-traffic__zoom" />
        </span>
        <span className="cl-demo__title">Clipers — 캠페인</span>
        <span className="cl-demo__user">
          <Avatar name="데모 레코즈" size="sm" />
          데모 레코즈
        </span>
      </div>
      <div className="cl-demo__body">
        <nav aria-hidden className="cl-demo__nav">
          <img alt="" className="cl-demo__brand" src="/logo/clipers-wordmark.svg" />
          <span className="cl-demo__nav-heading">브랜드</span>
          {NAV.map((item) => (
            <span className="cl-demo__nav-item" data-active={item.active ?? false} key={item.label}>
              {item.icon}
              {item.label}
            </span>
          ))}
        </nav>
        <div className="cl-live__content">
          <header className="cl-live__head">
            <div>
              <p className="cl-live__eyebrow">캠페인</p>
              <h4 className="cl-live__title">신곡 &apos;여름밤&apos; 후렴 챌린지</h4>
            </div>
            <StatusDot pulse tone="green">
              진행 중
            </StatusDot>
          </header>

          <dl className="cl-live__stats">
            <div>
              <dt>검증 조회수</dt>
              <dd>{views.toLocaleString('ko-KR')}</dd>
            </div>
            <div>
              <dt>승인된 영상</dt>
              <dd>{approvedCount.toLocaleString('ko-KR')}</dd>
            </div>
            <div>
              <dt>참여 크리에이터</dt>
              <dd>86</dd>
            </div>
          </dl>

          <div className="cl-live__grid">
            <section className="cl-live__panel">
              <p className="cl-live__panel-title">일별 누적 조회수</p>
              <LineChart label="조회수 예시" points={points} unit="회" variant="minimal" />
            </section>
            <section className="cl-live__panel">
              <p className="cl-live__panel-title">새로 올라온 영상</p>
              <ul className="cl-live__feed">
                {feed.map((row) => (
                  <li key={row.id}>
                    <Avatar name={row.creator} size="sm" />
                    <span className="cl-live__feed-text">
                      <span className="cl-live__feed-title">{row.title}</span>
                      <span className="cl-live__feed-meta">
                        <PlatformIcon platform={row.platform} size={12} />
                        {row.creator}
                      </span>
                    </span>
                    {row.approved ? (
                      <StatusDot tone="green">승인</StatusDot>
                    ) : (
                      <StatusDot pulse tone="yellow">
                        검수 중
                      </StatusDot>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
