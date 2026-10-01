'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChartLine, CircleCheck, Film, House, Megaphone, Wallet } from 'lucide-react';
import { Avatar, Badge, Button, LineChart, PlatformIcon, ProgressBar, formatKRW } from '@clipers/ui';

// A scripted walk through the real product, rendered with the same components the app uses.
// The data is illustrative; it plays like a screen recording but stays sharp and light.

const SCENE_MS = 4200;
const TICK_MS = 100;

type Scene = { id: string; label: string; nav: string; role: '브랜드' | '크리에이터' };
const SCENES: Scene[] = [
  { id: 'launch', label: '캠페인 공개', nav: '캠페인', role: '브랜드' },
  { id: 'apply', label: '지원과 승인', nav: '캠페인', role: '크리에이터' },
  { id: 'review', label: '영상 검수', nav: '제출 현황', role: '크리에이터' },
  { id: 'views', label: '조회수 집계', nav: '분석', role: '크리에이터' },
  { id: 'payout', label: '정산', nav: '수익', role: '크리에이터' },
];

const NAV = [
  { label: '홈', icon: <House size={15} /> },
  { label: '캠페인', icon: <Megaphone size={15} /> },
  { label: '제출 현황', icon: <Film size={15} /> },
  { label: '분석', icon: <ChartLine size={15} /> },
  { label: '수익', icon: <Wallet size={15} /> },
];

const VIEW_SERIES = [0, 8, 21, 39, 64, 98, 151, 238, 352, 488, 640, 790, 930, 1060, 1150, 1210].map((thousands) => thousands * 1000);

export default function ProductTour() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState(0);
  const [elapsed, setElapsed] = useState(SCENE_MS);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(reduced);
    // Reduced motion: no autoplay; each chapter shows its finished state.
    if (reduced) return;
    setElapsed(0);
    const observer = new IntersectionObserver(([entry]) => setPlaying(entry.isIntersecting), { threshold: 0.35 });
    if (rootRef.current) observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setElapsed((current) => {
        if (current + TICK_MS < SCENE_MS) return current + TICK_MS;
        setScene((index) => (index + 1) % SCENES.length);
        return 0;
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [playing]);

  const progress = Math.min(1, elapsed / SCENE_MS);
  const current = SCENES[scene];
  const after = (fraction: number) => progress >= fraction;

  let body: ReactNode;
  if (current.id === 'launch') {
    body = (
      <div className="cl-tour-panel">
        <p className="cl-tour-eyebrow">새 캠페인</p>
        <h4 className="cl-tour-title">신곡 &apos;여름밤&apos; 후렴 챌린지</h4>
        <div className="cl-tour-row">
          <span className="cl-tour-muted">예산</span>
          <strong>{formatKRW(5_000_000)}</strong>
        </div>
        <div className="cl-tour-row">
          <span className="cl-tour-muted">플랫폼</span>
          <span className="cl-tour-logos">
            {['youtube_shorts', 'tiktok', 'instagram_reels'].map((platform) => (
              <PlatformIcon key={platform} platform={platform} size={16} />
            ))}
          </span>
        </div>
        <div className="cl-tour-row">
          <span className="cl-tour-muted">상태</span>
          {after(0.45) ? <Badge tone="brand">진행 중</Badge> : <Badge tone="amber">입금 확인 중</Badge>}
        </div>
        {after(0.45) && <p className="cl-tour-note">입금이 확인되어 캠페인이 공개됐어요.</p>}
      </div>
    );
  } else if (current.id === 'apply') {
    body = (
      <div className="cl-tour-panel">
        <div className="cl-tour-cover" />
        <p className="cl-tour-brand">
          <Avatar name="데모 브랜드" size="sm" /> 데모 브랜드
        </p>
        <h4 className="cl-tour-title">신곡 &apos;여름밤&apos; 후렴 챌린지</h4>
        <div className="cl-tour-row">
          <span className="cl-tour-muted">1천 회당 {formatKRW(800)}</span>
          {after(0.6) ? (
            <Badge tone="brand">승인됨</Badge>
          ) : (
            <Button size="sm" variant={after(0.25) ? 'secondary' : 'primary'}>
              {after(0.25) ? '지원 완료' : '지원하기'}
            </Button>
          )}
        </div>
      </div>
    );
  } else if (current.id === 'review') {
    body = (
      <div className="cl-tour-panel">
        <p className="cl-tour-eyebrow">제출한 영상</p>
        <div className="cl-tour-clip">
          <PlatformIcon platform="youtube_shorts" size={18} />
          <span className="cl-tour-url">youtube.com/shorts/…</span>
          {after(0.5) ? <Badge tone="brand">승인</Badge> : <Badge tone="amber">검수 대기</Badge>}
        </div>
        {after(0.5) && (
          <p className="cl-tour-note">
            <CircleCheck size={15} /> 요구사항을 지켜서 승인됐어요. 이제 조회수가 집계돼요.
          </p>
        )}
      </div>
    );
  } else if (current.id === 'views') {
    const shown = Math.max(2, Math.round(VIEW_SERIES.length * Math.min(1, progress * 1.25)));
    const points = VIEW_SERIES.slice(0, shown).map((value, index) => ({ label: `9/${index + 10}`, value }));
    body = (
      <div className="cl-tour-panel">
        <p className="cl-tour-figure">
          {(points.at(-1)!.value / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만 <span>조회수</span>
        </p>
        <LineChart label="조회수 예시" points={points} variant="minimal" />
      </div>
    );
  } else {
    const earned = Math.round(968_000 * Math.min(1, progress * 1.6));
    body = (
      <div className="cl-tour-panel">
        <p className="cl-tour-eyebrow">받을 금액</p>
        <p className="cl-tour-figure">{formatKRW(earned)}</p>
        <ProgressBar label="정산 진행" value={Math.min(1, progress * 1.6)} />
        <div className="cl-tour-row">
          <span className="cl-tour-muted">3,000원부터 지급 요청</span>
          <Button size="sm" variant={after(0.75) ? 'secondary' : 'primary'}>
            {after(0.75) ? '지급 요청 완료' : '지급 요청'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="cl-tour" ref={rootRef}>
      <div aria-label="Clipers 제품 화면 예시" className="cl-demo" role="img">
        <div className="cl-demo__topbar">
          <img alt="" src="/logo/clipers-wordmark.svg" />
          <span className="cl-demo__user">
            <Avatar name={current.role} size="sm" />
            {current.role}
          </span>
        </div>
        <div className="cl-demo__body">
          <nav aria-hidden className="cl-demo__nav">
            {NAV.map((item) => (
              <span className="cl-demo__nav-item" data-active={item.label === current.nav} key={item.label}>
                {item.icon}
                {item.label}
              </span>
            ))}
          </nav>
          <div className="cl-demo__content" key={current.id}>
            {body}
          </div>
        </div>
      </div>

      <div aria-label="장면" className="cl-tour__chapters" role="tablist">
        {SCENES.map((item, index) => (
          <button
            aria-selected={index === scene}
            className="cl-tour__chapter"
            key={item.id}
            onClick={() => {
              setScene(index);
              setElapsed(reducedMotion ? SCENE_MS : 0);
            }}
            role="tab"
            type="button"
          >
            <span className="cl-tour__bar">
              <span className="cl-tour__fill" style={{ width: index < scene ? '100%' : index === scene ? `${progress * 100}%` : '0%' }} />
            </span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
