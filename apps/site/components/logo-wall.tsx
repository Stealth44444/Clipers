'use client';

import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react';

// Platform marks for the landing, from the files in /platforms (brand-supplied PNGs; CapCut and Discord as SVG marks
// framed the same way). At rest they read as one quiet
// grey; a soft spotlight (the pointer, or a slow sweep when there is none) reveals each mark's own colour.
// They fade in one by one when scrolled into view.
const PLATFORMS = [
  { src: '/platforms/capcut.svg', label: '캡컷' },
  { src: '/platforms/youtube_shorts.png', label: '유튜브 쇼츠' },
  { src: '/platforms/tiktok.png', label: '틱톡' },
  { src: '/platforms/instagram_reels.png', label: '인스타그램 릴스' },
  { src: '/platforms/facebook.png', label: '페이스북' },
  { src: '/platforms/x.png', label: 'X' },
  { src: '/platforms/naver_clip.png', label: '네이버 클립' },
  { src: '/platforms/kakao_shorts.png', label: '카카오 쇼츠' },
  { src: '/platforms/discord.svg', label: '디스코드' },
];

function Marks({ lit }: { lit?: boolean }) {
  return (
    <ul aria-hidden={lit || undefined} aria-label={lit ? undefined : '함께 쓰는 플랫폼'} className={lit ? 'cl-logo-wall cl-logo-wall--lit' : 'cl-logo-wall'}>
      {PLATFORMS.map((platform, index) => (
        <li key={platform.src} style={{ '--i': index } as CSSProperties}>
          <img alt={lit ? '' : platform.label} className="cl-logo-wall__img" height={52} src={platform.src} width={52} />
        </li>
      ))}
    </ul>
  );
}

export default function LogoWall() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        root.dataset.inview = 'true';
        observer.disconnect();
      },
      { threshold: 0.3 }
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const root = event.currentTarget;
    const box = root.getBoundingClientRect();
    root.dataset.pointer = 'true';
    root.style.setProperty('--spot-x', `${event.clientX - box.left}px`);
    root.style.setProperty('--spot-y', `${event.clientY - box.top}px`);
  };

  return (
    <div className="cl-logo-cloud" onPointerLeave={(event) => delete event.currentTarget.dataset.pointer} onPointerMove={onPointerMove} ref={rootRef}>
      <Marks />
      <Marks lit />
    </div>
  );
}
