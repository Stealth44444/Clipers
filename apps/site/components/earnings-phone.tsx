'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Avatar, DeviceFrame, PlatformIcon, StatusDot, formatKRW } from '@clipers/ui';

// Creator hero visual: a clip plays on a phone while its views climb, and the payout beside it climbs with them.
// The slider takes over so visitors can try their own view count (views are on a log scale, 1 to 1,000,000).
// Rate and threshold come from the server page as plain numbers so no pricing module ships to the browser.

const LOOP_MS = 9000;
const AUTO_PEAK = 120_000;
const SLIDER_MAX = 1000;

const viewsFromSlider = (value: number) => Math.round(Math.pow(10, (value / SLIDER_MAX) * 6));
const sliderFromViews = (views: number) => Math.round((Math.log10(Math.max(1, views)) / 6) * SLIDER_MAX);
const compact = (views: number) =>
  views >= 10_000 ? `${(views / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만` : views.toLocaleString('ko-KR');

const SCALE: [number, string][] = [
  [0, '1회'],
  [50, '1천'],
  [66.67, '1만'],
  [83.33, '10만'],
  [100, '100만'],
];

export default function EarningsPhone({ rate, minViews }: { rate: number; minViews: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [views, setViews] = useState(48_200);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (manual || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let visible = false;
    let start = performance.now();
    const tick = (now: number) => {
      const t = (Math.max(0, now - start) % LOOP_MS) / LOOP_MS;
      // Climb for 80% of the loop (slow start, like a clip catching on), then hold.
      const climb = Math.min(1, t / 0.8);
      setViews(Math.round(AUTO_PEAK * Math.pow(climb, 2.2)));
      raf = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) {
        start = performance.now();
        raf = requestAnimationFrame(tick);
      }
    });
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [manual]);

  const counting = views >= minViews;
  const payout = counting ? Math.floor((views / 1000) * rate) : 0;

  return (
    <div className="cl-earn" ref={rootRef}>
      <div aria-hidden className="cl-earn__stage">
        <div className="cl-earn__card cl-earn__card--campaign">
          <p className="cl-earn__label">참여 중인 캠페인</p>
          <p className="cl-earn__campaign">
            <Avatar name="여름밤 챌린지" size="sm" />
            신곡 &apos;여름밤&apos; 후렴 챌린지
          </p>
          <p className="cl-earn__rate">
            1천 회당 <strong>{formatKRW(rate)}</strong>
          </p>
        </div>

        <div className="cl-earn__phone">
          <DeviceFrame>
            <div className="cl-earn__screen cl-clip-screen">
              <span className="cl-clip-screen__rail">
                <i />
                <i />
                <i />
              </span>
              <span className="cl-clip-screen__lines">
                <i />
                <i />
              </span>
              <span className="cl-clip-screen__progress" />
            </div>
          </DeviceFrame>
          <p className="cl-earn__views">
            <PlatformIcon platform="youtube_shorts" size={16} />
            조회수 {compact(views)}
          </p>
        </div>

        <div className="cl-earn__card cl-earn__card--payout">
          <p className="cl-earn__label">받을 금액</p>
          <p className="cl-earn__amount">{formatKRW(payout)}</p>
          {counting ? <StatusDot tone="green">정산 중</StatusDot> : <StatusDot tone="gray">{minViews.toLocaleString('ko-KR')}회부터 정산돼요</StatusDot>}
        </div>
      </div>

      <label className="cl-earn__slider">
        <span className="cl-earn__slider-label">
          조회수를 움직여 보세요 <strong>{views.toLocaleString('ko-KR')}회</strong>
        </span>
        <input
          aria-valuetext={`조회수 ${views.toLocaleString('ko-KR')}회, 받을 금액 ${formatKRW(payout)}`}
          max={SLIDER_MAX}
          min={0}
          onChange={(event) => {
            setManual(true);
            setViews(viewsFromSlider(Number(event.target.value)));
          }}
          style={{ '--fill': `${(sliderFromViews(views) / SLIDER_MAX) * 100}%` } as CSSProperties}
          type="range"
          value={sliderFromViews(views)}
        />
        <span className="cl-earn__slider-scale">
          {SCALE.map(([at, label]) => (
            <span key={label} style={{ left: `${at}%` }}>
              {label}
            </span>
          ))}
        </span>
        <span className="cl-earn__note">1천 회당 {formatKRW(rate)} 캠페인 기준 예시예요. 캠페인마다 금액이 달라요.</span>
      </label>
    </div>
  );
}
