'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChartLine, CircleCheck, Film, House, Megaphone, Wallet } from 'lucide-react';
import { Avatar, Button, LineChart, PlatformIcon, ProgressBar, StatusDot, formatKRW } from '@clipers/ui';

// A scripted walk through the real product inside a macOS-style window, rendered with the app's own
// components. The data is illustrative; it plays like a screen recording but stays sharp and light.

const SCENE_MS = 4600;
const TICK_MS = 100;

type SceneId = 'launch' | 'apply' | 'review' | 'views' | 'payout';
type Scene = {
  id: SceneId;
  label: string;
  nav: string;
  role: '브랜드' | '크리에이터';
  /** When the cursor clicks (fraction of the scene); the target carries data-tour-target. */
  click?: number;
  /** macOS-style notification shown from this fraction on. */
  notify?: { at: number; title: string; body: string };
};

const SCENES: Scene[] = [
  { id: 'launch', label: '캠페인 공개', nav: '캠페인', role: '브랜드', notify: { at: 0.5, title: 'Clipers', body: "캠페인 '여름밤 챌린지'가 공개됐어요." } },
  { id: 'apply', label: '지원과 승인', nav: '캠페인', role: '크리에이터', click: 0.3, notify: { at: 0.62, title: 'Clipers', body: '지원이 승인됐어요. 영상을 올려 보세요.' } },
  { id: 'review', label: '영상 검수', nav: '제출 현황', role: '크리에이터', notify: { at: 0.55, title: 'Clipers', body: '영상이 검수를 통과했어요.' } },
  { id: 'views', label: '조회수 집계', nav: '분석', role: '크리에이터' },
  { id: 'payout', label: '정산', nav: '수익', role: '크리에이터', click: 0.72, notify: { at: 0.8, title: 'Clipers', body: '지급 요청을 보냈어요.' } },
];

const NAV = [
  { label: '홈', icon: <House size={15} /> },
  { label: '캠페인', icon: <Megaphone size={15} /> },
  { label: '제출 현황', icon: <Film size={15} /> },
  { label: '분석', icon: <ChartLine size={15} /> },
  { label: '수익', icon: <Wallet size={15} /> },
];

const VIEW_SERIES = [0, 8, 21, 39, 64, 98, 151, 238, 352, 488, 640, 790, 930, 1060, 1150, 1210].map((thousands) => thousands * 1000);

type Cursor = { x: number; y: number; clicking: boolean; visible: boolean };

export default function ProductTour() {
  const rootRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState(0);
  const [elapsed, setElapsed] = useState(SCENE_MS);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [cursor, setCursor] = useState<Cursor>({ x: 0, y: 0, clicking: false, visible: false });

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

  // Cursor: glides to the scene's target before the click, presses on it, then rests.
  useLayoutEffect(() => {
    const frame = windowRef.current;
    if (reducedMotion || !frame || current.click === undefined) {
      setCursor((value) => ({ ...value, visible: false }));
      return;
    }
    const target = frame.querySelector<HTMLElement>('[data-tour-target]');
    if (!target) return;
    const box = frame.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const approaching = progress >= current.click - 0.22;
    setCursor({
      x: approaching ? rect.left - box.left + rect.width * 0.62 : box.width * 0.82,
      y: approaching ? rect.top - box.top + rect.height * 0.6 : box.height * 0.88,
      clicking: progress >= current.click - 0.03 && progress < current.click + 0.05,
      visible: progress > 0.04,
    });
  }, [progress, current, reducedMotion]);

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
          {after(0.45) ? <StatusDot tone="green">진행 중</StatusDot> : <StatusDot pulse tone="yellow">입금 확인 중</StatusDot>}
        </div>
      </div>
    );
  } else if (current.id === 'apply') {
    const clicked = after(SCENES[1].click!);
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
            <StatusDot tone="green">승인됨</StatusDot>
          ) : (
            <Button data-tour-target size="sm" variant={clicked ? 'secondary' : 'primary'}>
              {clicked ? '지원 완료' : '지원하기'}
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
          {after(0.5) ? <StatusDot tone="green">승인</StatusDot> : <StatusDot pulse tone="yellow">검수 대기</StatusDot>}
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
        <div className="cl-tour-row">
          <p className="cl-tour-figure">
            {(points.at(-1)!.value / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만 <span>조회수</span>
          </p>
          <StatusDot pulse tone="blue">
            집계 중
          </StatusDot>
        </div>
        <LineChart label="조회수 예시" points={points} variant="minimal" />
      </div>
    );
  } else {
    const earned = Math.round(968_000 * Math.min(1, progress * 1.6));
    const requested = after(SCENES[4].click!);
    body = (
      <div className="cl-tour-panel">
        <p className="cl-tour-eyebrow">받을 금액</p>
        <p className="cl-tour-figure">{formatKRW(earned)}</p>
        <ProgressBar label="정산 진행" value={Math.min(1, progress * 1.6)} />
        <div className="cl-tour-row">
          {requested ? <StatusDot tone="green">지급 요청 완료</StatusDot> : <span className="cl-tour-muted">3,000원부터 지급 요청</span>}
          <Button data-tour-target size="sm" variant={requested ? 'secondary' : 'primary'}>
            {requested ? '요청됨' : '지급 요청'}
          </Button>
        </div>
      </div>
    );
  }

  const notification = current.notify && after(current.notify.at) ? current.notify : null;

  return (
    <div className="cl-tour" ref={rootRef}>
      <div aria-label="Clipers 제품 화면 예시" className="cl-demo" ref={windowRef} role="img">
        <div className="cl-demo__titlebar">
          <span aria-hidden className="cl-traffic">
            <span className="cl-traffic__close" />
            <span className="cl-traffic__minimize" />
            <span className="cl-traffic__zoom" />
          </span>
          <span className="cl-demo__title">Clipers — {current.nav}</span>
          <span className="cl-demo__user">
            <Avatar name={current.role} size="sm" />
            {current.role}
          </span>
        </div>
        <div className="cl-demo__body">
          <nav aria-hidden className="cl-demo__nav">
            <img alt="" className="cl-demo__brand" src="/logo/clipers-wordmark.svg" />
            <span className="cl-demo__nav-heading">{current.role === '브랜드' ? '브랜드' : '크리에이터'}</span>
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

        {notification && (
          <div className="cl-mac-notice" key={`${current.id}-notice`}>
            <img alt="" src="/logo/clipers-mark.svg" />
            <div>
              <p className="cl-mac-notice__title">
                {notification.title} <span>지금</span>
              </p>
              <p className="cl-mac-notice__body">{notification.body}</p>
            </div>
          </div>
        )}

        {cursor.visible && (
          <span aria-hidden className="cl-cursor" data-clicking={cursor.clicking} style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}>
            <svg height="22" viewBox="0 0 16 22" width="16">
              <path d="M1 1v17.5l4.6-4.4 3.1 7 2.9-1.3-3-6.8h6.2z" fill="#000" stroke="#fff" strokeLinejoin="round" strokeWidth="1.4" />
            </svg>
          </span>
        )}
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
