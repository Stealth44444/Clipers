'use client';

import { useEffect, useRef, useState } from 'react';
import { DeviceFrame, PlatformIcon, StatusDot, formatKRW } from '@clipers/ui';

// Clipping explainer visual: a campaign's long video plays in a macOS window with one stretch of its timeline
// selected, and the same stretch plays as a vertical short on the phone beside it; under the phone the short's
// views climb and its payout follows. Both screens play the same clip (the wide one is a centre crop).
// The rate comes from the server page as a plain number (the creator rate only).

const VIDEO = '/media/clips/drive.mp4';
const POSTER = '/media/clips/drive.jpg';
const LOOP_MS = 6000;
const PEAK_VIEWS = 42_000;

// The long video is 4:10; the selected stretch is 1:52–2:26.
const DURATION_S = 250;
const RANGE_START_S = 112;
const RANGE_END_S = 146;

const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const compact = (views: number) =>
  views >= 10_000 ? `${(views / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만` : views.toLocaleString('ko-KR');

export default function ClippingStage({ rate }: { rate: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [progress, setProgress] = useState(0);
  const [moving, setMoving] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMoving(false);
      return;
    }
    let raf = 0;
    let start = performance.now();
    const tick = (now: number) => {
      setProgress(((now - start) % LOOP_MS) / LOOP_MS);
      raf = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      videoRefs.current.forEach((video) => {
        if (!video) return;
        if (entry.isIntersecting) {
          video.currentTime = 0;
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      });
      if (entry.isIntersecting) {
        start = performance.now();
        raf = requestAnimationFrame(tick);
      }
    });
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // Views climb for 80% of the loop (slow start, like a clip catching on), then hold.
  const views = moving ? Math.round(PEAK_VIEWS * Math.pow(Math.min(1, progress / 0.8), 2.2)) : PEAK_VIEWS;
  const payout = Math.floor((views / 1000) * rate);
  const playhead = RANGE_START_S + (RANGE_END_S - RANGE_START_S) * (moving ? progress : 0.4);
  const pct = (seconds: number) => `${(seconds / DURATION_S) * 100}%`;

  return (
    <div aria-label="긴 영상의 한 구간을 세로 숏폼으로 편집해 올린 예시" className="cl-clip-stage" ref={rootRef} role="img">
      <div aria-hidden className="cl-demo cl-clip-window">
        <div className="cl-demo__titlebar">
          <span className="cl-traffic">
            <span className="cl-traffic__close" />
            <span className="cl-traffic__minimize" />
            <span className="cl-traffic__zoom" />
          </span>
          <span className="cl-demo__title">신차 런칭 풀버전</span>
          <span />
        </div>
        <div className="cl-clip-window__body">
          <div className="cl-clip-window__player">
            <video
              className="cl-clip-window__media"
              loop
              muted
              playsInline
              poster={POSTER}
              preload="none"
              ref={(element) => {
                videoRefs.current[0] = element;
              }}
              src={VIDEO}
            />
          </div>
          <div className="cl-clip-window__timeline">
            <span className="cl-clip-window__range" style={{ left: pct(RANGE_START_S), width: pct(RANGE_END_S - RANGE_START_S) }} />
            <span className="cl-clip-window__playhead" style={{ left: pct(playhead) }} />
          </div>
          <p className="cl-clip-window__meta">
            <span className="cl-number">
              {clock(playhead)} / {clock(DURATION_S)}
            </span>
            <span>
              {clock(RANGE_START_S)} – {clock(RANGE_END_S)} 구간 선택
            </span>
          </p>
        </div>
      </div>

      <div aria-hidden className="cl-clip-stage__phone">
        <DeviceFrame>
          <div className="cl-short">
            <video
              className="cl-short__media"
              loop
              muted
              playsInline
              poster={POSTER}
              preload="none"
              ref={(element) => {
                videoRefs.current[1] = element;
              }}
              src={VIDEO}
            />
          </div>
        </DeviceFrame>
        <div className="cl-clip-stage__result">
          <StatusDot tone="green">검수 통과</StatusDot>
          <p className="cl-clip-stage__views">
            <PlatformIcon platform="naver_clip" size={16} />
            조회수 {compact(views)}
          </p>
          <p className="cl-clip-stage__payout">{formatKRW(payout)}</p>
        </div>
      </div>
    </div>
  );
}
