'use client';

import { useEffect, useRef } from 'react';

type Star = { x: number; y: number; z: number; phase: number };

type StarfieldProps = {
  /** Number of stars on screen. */
  count?: number;
  /** Depth travelled per frame (0–10). */
  speed?: number;
  /** How far stars spread from the vanishing point. */
  spread?: number;
  /** Perspective strength; larger keeps stars nearer the centre. */
  focal?: number;
  /** Twinkle amplitude (0–1). */
  twinkle?: number;
  /** Motion trail length (0 = none, 1 = never clears). */
  trail?: number;
  /** Base star radius in CSS pixels. */
  size?: number;
  /** Stars fly away from the viewer instead of towards it. */
  reverse?: boolean;
  className?: string;
};

/**
 * Canvas starfield (perspective projection of points moving along z). Background-only: it is aria-hidden,
 * honours prefers-reduced-motion with a single still frame, and pauses while off-screen or in a hidden tab.
 */
export function Starfield({
  count = 1000,
  speed = 2,
  spread = 5,
  focal = 2,
  twinkle = 0.35,
  trail = 0.75,
  size = 2,
  reverse = true,
  className,
}: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const background = getComputedStyle(canvas).getPropertyValue('--color-background').trim() || '#111111';
    const spawn = (): Star => ({ x: (Math.random() - 0.5) * spread, y: (Math.random() - 0.5) * spread, z: Math.random(), phase: Math.random() * Math.PI * 2 });
    const stars = Array.from({ length: count }, spawn);
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
    };

    const draw = () => {
      // Partially repaint the background so moving stars leave short trails.
      context.globalAlpha = 1 - Math.min(Math.max(trail, 0), 0.98);
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
      context.fillStyle = '#ffffff';
      const step = Math.min(Math.max(speed, 0), 10) * 0.002;
      for (const star of stars) {
        star.z += reverse ? step : -step;
        if (star.z <= 0 || star.z > 1) Object.assign(star, spawn(), { z: reverse ? 0.001 : 1 });
        star.phase += twinkle * 0.05;
        const depth = star.z * focal + 0.001;
        const x = width / 2 + (star.x / depth) * width;
        const y = height / 2 + (star.y / depth) * height;
        if (x < -4 || x > width + 4 || y < -4 || y > height + 4) continue;
        const radius = size * (1 - star.z) * (1 + Math.sin(star.phase) * twinkle);
        if (radius <= 0) continue;
        context.globalAlpha = Math.max(0, 1 - star.z);
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    };

    const loop = () => {
      draw();
      frame = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const resume = () => {
      if (!reducedMotion && !frame && visible && !document.hidden) frame = requestAnimationFrame(loop);
    };

    resize();
    if (reducedMotion) {
      for (let warmup = 0; warmup < 40; warmup += 1) draw();
    } else {
      resume();
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    });
    observer.observe(canvas);
    const onResize = () => {
      resize();
      if (reducedMotion) draw();
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', resume);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [count, speed, spread, focal, twinkle, trail, size, reverse]);

  return <canvas aria-hidden className={className} ref={canvasRef} />;
}
