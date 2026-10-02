'use client';

import { useEffect, useRef } from 'react';
import { DeviceFrame } from '@clipers/ui';

/** A creator's finished short playing in a phone, the thing a campaign gets back. Plays only while on screen. */
export default function ClipSubmitDemo() {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = video.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) element.play().catch(() => {});
      else element.pause();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="cl-crop-phone">
      <DeviceFrame>
        <video className="cl-crop-phone__clip" loop muted playsInline poster="/media/clips/beauty.jpg" preload="metadata" ref={video} src="/media/clips/beauty.mp4" />
      </DeviceFrame>
    </div>
  );
}
