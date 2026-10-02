'use client';

import { useEffect, useRef } from 'react';
import { DeviceFrame, PlatformIcon, StatusDot } from '@clipers/ui';
import ShortSlide, { type ShortClip } from '@/components/short-slide';

// How views are verified, in the creator page's grammar (2026-10-02, replacing the flow diagram): two short paragraphs
// beside one real clip on a phone, with the checks it passed as glass cards (the creator hero's layout). Example values.

const CLIP: ShortClip = {
  video: '/media/clips/fashion-c.mp4',
  poster: '/media/clips/fashion-c.jpg',
  handle: 'minji.dance',
  caption: '여름밤 후렴 챌린지',
  tag: '#여름밤챌린지',
  likes: '4,120',
  comments: '386',
};

export default function VerifyFlow() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // The clip plays while it is on screen (reduced motion keeps the poster).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void video.play().catch(() => undefined);
      else video.pause();
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <section aria-labelledby="verify-title" className="cl-landing-section cl-clipping cl-verify">
      <div className="cl-clipping__copy">
        <h2 className="cl-clipping__title" id="verify-title">
          검증된 조회수에만
          <br />
          예산이 쓰여요
        </h2>
        <p className="cl-clipping__lead">
          올라온 영상은 운영팀이 48시간 안에 직접 봐요. 캠페인에 적어 둔 요구사항대로인지 확인하고, 통과한 영상만&nbsp;정산해요.
        </p>
        <p className="cl-clipping__lead">
          유튜브는 조회수를 자동으로 가져오고, 다른 플랫폼은 운영팀이 영상에 표시된 조회수를 직접 확인해요. 짧은 시간에 튄 조회수는 정산 전에 따로&nbsp;확인해요.
        </p>
      </div>
      <div aria-hidden className="cl-earn" inert>
        <div className="cl-earn__stage">
          <div className="cl-earn__card cl-earn__card--campaign">
            <p className="cl-earn__label">요구사항 확인</p>
            <div className="cl-verify__checks">
              <StatusDot tone="green">후렴 15초 이상 사용</StatusDot>
              <StatusDot tone="green">#여름밤챌린지 포함</StatusDot>
            </div>
          </div>
          <div className="cl-earn__phone">
            <DeviceFrame>
              <div className="cl-short">
                <ShortSlide clip={CLIP} preload="metadata" videoRef={videoRef} />
              </div>
            </DeviceFrame>
            <p className="cl-earn__views">
              <PlatformIcon platform="tiktok" size={16} />
              조회수 48,200
            </p>
          </div>
          <div className="cl-earn__card cl-earn__card--payout">
            <p className="cl-earn__label">검증 조회수</p>
            <p className="cl-earn__amount">48,200회</p>
            <StatusDot tone="green">운영팀 확인 완료</StatusDot>
          </div>
        </div>
        <p className="cl-verify__spike">
          <StatusDot tone="gray">급증 확인 · 최근 24시간 이상 없음</StatusDot>
        </p>
      </div>
    </section>
  );
}
