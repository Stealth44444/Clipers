'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Heart, MessageCircle, Music2, Plus, Send } from 'lucide-react';
import { Avatar, DeviceFrame, PlatformIcon, StatusDot, formatKRW } from '@clipers/ui';

// Creator hero visual: a clip plays on a phone while its views climb, and the payout beside it climbs with them.
// The slider takes over so visitors can try their own view count (views on a log scale, 1,000 to 1,000,000).
// Rate and threshold come from the server page as plain numbers so no pricing module ships to the browser.

const LOOP_MS = 6000;
const AUTO_PEAK = 120_000;
const SLIDER_MAX = 1000;

// The slider runs on a log scale from 1,000 (the first paid view count) to 1,000,000.
const MIN_VIEWS = 1_000;
const viewsFromSlider = (value: number) => Math.round(Math.pow(10, 3 + (value / SLIDER_MAX) * 3));
const sliderFromViews = (views: number) => Math.round(Math.max(0, (Math.log10(Math.max(MIN_VIEWS, views)) - 3) / 3) * SLIDER_MAX);
const compact = (views: number) =>
  views >= 10_000 ? `${(views / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만` : views.toLocaleString('ko-KR');

// What plays on the phone: four creator clips, each from its own campaign; the feed swipes to the next one
// each loop. Videos: 540×960, muted, 6s (public/media/clips). The player chrome is neutral, not any one app's.
const CLIPS = [
  {
    video: '/media/clips/beauty.mp4',
    poster: '/media/clips/beauty.jpg',
    platform: 'instagram_reels',
    handle: 'yuna.glow',
    caption: '아침 5분이면 끝나는 속눈썹 루틴',
    tag: '#데일리마스카라',
    likes: '3.2만',
    comments: '418',
    campaign: '데일리 마스카라 루틴 챌린지',
  },
  {
    video: '/media/clips/drive.mp4',
    poster: '/media/clips/drive.jpg',
    platform: 'naver_clip',
    handle: 'desert.drive',
    caption: '의자에 앉은 채로 받아 낸 신차 점프',
    tag: '#카스타그램',
    likes: '7.4만',
    comments: '962',
    campaign: '신차 런칭 하이라이트 클리핑',
  },
  {
    video: '/media/clips/pet.mp4',
    poster: '/media/clips/pet.jpg',
    platform: 'tiktok',
    handle: 'mochi.daily',
    caption: '반다나 하나로 달라진 우리 집 모찌',
    tag: '#펫스타그램',
    likes: '5.8만',
    comments: '1,204',
    campaign: '반려견 반다나 신상 챌린지',
  },
  {
    video: '/media/clips/sky.mp4',
    poster: '/media/clips/sky.jpg',
    platform: 'youtube_shorts',
    handle: 'sky.jun',
    caption: '헬기에서 뛰어내린 날, 액션캠 시점',
    tag: '#액션캠',
    likes: '12만',
    comments: '2,310',
    campaign: '액션캠 1인칭 클립 캠페인',
  },
];

const SCALE: [number, string][] = [
  [0, '1천'],
  [33.33, '1만'],
  [66.67, '10만'],
  [100, '100만'],
];

export default function EarningsPhone({ rate, minViews }: { rate: number; minViews: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [views, setViews] = useState(48_200);
  const [manual, setManual] = useState(false);
  const [clip, setClip] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === clip) {
        video.currentTime = 0;
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  }, [clip]);

  useEffect(() => {
    if (manual || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let visible = false;
    let start = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.max(0, now - start);
      const t = (elapsed % LOOP_MS) / LOOP_MS;
      setClip(Math.floor(elapsed / LOOP_MS) % CLIPS.length);
      // Climb for 80% of the loop (slow start, like a clip catching on), then hold.
      const climb = Math.min(1, t / 0.8);
      setViews(Math.round(MIN_VIEWS + (AUTO_PEAK - MIN_VIEWS) * Math.pow(climb, 2.2)));
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
            <Avatar name={CLIPS[clip].campaign} size="sm" />
            {CLIPS[clip].campaign}
          </p>
          <p className="cl-earn__rate">
            1천 회당 <strong>{formatKRW(rate)}</strong>
          </p>
        </div>

        <div className="cl-earn__phone">
          <DeviceFrame>
            <div className="cl-short">
              {CLIPS.map((item, index) => (
                <div className="cl-short__slide" data-state={index === clip ? 'active' : index === (clip + CLIPS.length - 1) % CLIPS.length ? 'past' : 'next'} key={item.video}>
                  <video
                    className="cl-short__media"
                    loop
                    muted
                    playsInline
                    poster={item.poster}
                    preload={index === clip || index === (clip + 1) % CLIPS.length ? 'auto' : 'none'}
                    ref={(element) => {
                      videoRefs.current[index] = element;
                    }}
                    src={item.video}
                  />
                  <span className="cl-short__scrim" />
                  <div className="cl-short__rail">
                    <span className="cl-short__avatar">
                      <Avatar name={item.handle} size="sm" />
                      <i>
                        <Plus size={9} strokeWidth={3} />
                      </i>
                    </span>
                    <span className="cl-short__action">
                      <Heart fill="currentColor" size={22} strokeWidth={0} />
                      {item.likes}
                    </span>
                    <span className="cl-short__action">
                      <MessageCircle fill="currentColor" size={21} strokeWidth={0} />
                      {item.comments}
                    </span>
                    <span className="cl-short__action">
                      <Send size={19} />
                      공유
                    </span>
                  </div>
                  <div className="cl-short__info">
                    <p className="cl-short__handle">
                      @{item.handle} <span>팔로우</span>
                    </p>
                    <p className="cl-short__caption">
                      {item.caption} <b>{item.tag}</b>
                    </p>
                    <p className="cl-short__audio">
                      <Music2 size={11} />
                      <span>
                        <span>
                          오리지널 사운드 · @{item.handle} · 오리지널 사운드 · @{item.handle} ·{' '}
                        </span>
                      </span>
                    </p>
                  </div>
                  {index === clip && <Heart className="cl-short__burst" fill="currentColor" key={`burst-${clip}`} size={64} strokeWidth={0} />}
                  <span className="cl-short__progress" key={`progress-${index === clip ? clip : 'idle'}`} />
                </div>
              ))}
            </div>
          </DeviceFrame>
          <p className="cl-earn__views">
            <PlatformIcon platform={CLIPS[clip].platform} size={16} />
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
