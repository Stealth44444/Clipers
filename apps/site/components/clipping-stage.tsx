'use client';

import { useEffect, useRef, useState } from 'react';
import { Captions, Heart, Maximize, MessageCircle, Music2, Pause, Plus, Send, Settings, SkipForward, Volume2 } from 'lucide-react';
import { Avatar, DeviceFrame, PlatformIcon, formatKRW } from '@clipers/ui';

// Clipping explainer visual. Left: a long video in a macOS window, dressed as a long-form watch page (player controls,
// a progress bar with the clipped stretch marked, title and channel). Right: that stretch edited into a short on a
// phone (hook text, changing subtitles, the short-form rail and caption); under it the short's views climb and its
// payout follows. Both screens play the same clip (the wide one is a centre crop). On wide screens the window
// stretches to the phone's height so their edges line up. The rate comes from the server page (the creator rate only).

const VIDEO = '/media/clips/drive.mp4';
const POSTER = '/media/clips/drive.jpg';
const LOOP_MS = 6000;
const PEAK_VIEWS = 42_000;

// The long video is 4:10; the clipped stretch is 1:52–2:26.
const DURATION_S = 250;
const RANGE_START_S = 112;
const RANGE_END_S = 146;

// Subtitles burned into the short, one per third of the loop.
const SUBTITLES = ['시동 걸자마자', '차가 머리 위로 날아감', '근데 표정 실화?'];

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
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

  const loop = moving ? progress : 0.4;
  // Views climb for 80% of the loop (slow start, like a clip catching on), then hold.
  const views = moving ? Math.round(PEAK_VIEWS * Math.pow(Math.min(1, progress / 0.8), 2.2)) : PEAK_VIEWS;
  const payout = Math.floor((views / 1000) * rate);
  const playhead = RANGE_START_S + (RANGE_END_S - RANGE_START_S) * loop;
  const subtitle = SUBTITLES[Math.min(SUBTITLES.length - 1, Math.floor(loop * SUBTITLES.length))];
  const pct = (seconds: number) => `${(seconds / DURATION_S) * 100}%`;

  return (
    <div aria-label="긴 영상의 한 구간을 자막을 넣은 세로 숏폼으로 편집해 올린 예시" className="cl-clip-stage" ref={rootRef} role="img">
      <div aria-hidden className="cl-demo cl-clip-window">
        <div className="cl-demo__titlebar">
          <span className="cl-traffic">
            <span className="cl-traffic__close" />
            <span className="cl-traffic__minimize" />
            <span className="cl-traffic__zoom" />
          </span>
          <span />
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
            <div className="cl-yt">
              <div className="cl-yt__bar">
                <span className="cl-yt__played" style={{ width: pct(playhead) }} />
                <span className="cl-yt__range" style={{ left: pct(RANGE_START_S), width: pct(RANGE_END_S - RANGE_START_S) }} />
                <span className="cl-yt__scrubber" style={{ left: pct(playhead) }} />
              </div>
              <div className="cl-yt__controls">
                <Pause fill="currentColor" size={15} strokeWidth={0} />
                <SkipForward fill="currentColor" size={15} strokeWidth={0} />
                <Volume2 size={16} />
                <span className="cl-yt__time">
                  {clock(playhead)} / {clock(DURATION_S)}
                </span>
                <span className="cl-yt__spacer" />
                <Captions size={16} />
                <Settings size={16} />
                <Maximize size={15} />
              </div>
            </div>
          </div>
          <div className="cl-yt__meta">
            <p className="cl-yt__title">신차 런칭 풀버전 | 사막 점프 테스트 4분 몰아보기</p>
            <div className="cl-yt__channel">
              <Avatar name="오토랩" size="sm" />
              <span className="cl-yt__channel-text">
                <span>오토랩</span>
                <small>구독자 12.4만명</small>
              </span>
              <span className="cl-yt__subscribe">구독</span>
            </div>
          </div>
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
            <span className="cl-short__scrim" />
            <p className="cl-clip-short__hook">
              POV: 신차 시승을 <b>사막에서</b> 함
            </p>
            <p className="cl-clip-short__subtitle" key={subtitle}>
              {subtitle}
            </p>
            <div className="cl-short__rail">
              <span className="cl-short__avatar">
                <Avatar name="car.clipper" size="sm" />
                <i>
                  <Plus size={9} strokeWidth={3} />
                </i>
              </span>
              <span className="cl-short__action">
                <Heart fill="currentColor" size={22} strokeWidth={0} />
                4.1만
              </span>
              <span className="cl-short__action">
                <MessageCircle fill="currentColor" size={21} strokeWidth={0} />
                862
              </span>
              <span className="cl-short__action">
                <Send size={19} />
              </span>
            </div>
            <div className="cl-short__info">
              <p className="cl-short__handle">
                @car.clipper <span>팔로우</span>
              </p>
              <p className="cl-short__caption">
                풀버전보다 이 30초가 더 미침 <b>#신차런칭</b>
              </p>
              <p className="cl-short__audio">
                <Music2 size={11} />
                <span>
                  <span>오리지널 사운드 · @car.clipper · 오리지널 사운드 · @car.clipper · </span>
                </span>
              </p>
            </div>
            <span className="cl-clip-short__progress" style={{ width: `${loop * 100}%` }} />
          </div>
        </DeviceFrame>
      </div>
      <div aria-hidden className="cl-clip-stage__result">
        <p className="cl-clip-stage__views">
          <PlatformIcon platform="youtube_shorts" size={16} />
          조회수 {compact(views)}
        </p>
        <p className="cl-clip-stage__payout">{formatKRW(payout)}</p>
      </div>
    </div>
  );
}
