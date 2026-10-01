'use client';

import { useEffect, useRef } from 'react';
import { DeviceFrame, PlatformIcon, StatusDot } from '@clipers/ui';

// Brand hero visual: short-form screens drift along a curved band, each counting its views. Now and then the
// clip at the front passes review; its views stream as light into the campaign's verified total below.
// Hover a screen to stop the band, drag to scrub it. Cards are DOM (crisp, 3D), particles are canvas.

type Clip = { platform: string; views: number; rate: number; palette: [string, string, string] };

const CLIPS: Clip[] = [
  { platform: 'youtube_shorts', views: 32_400, rate: 180, palette: ['#163a2a', '#58b982', '#e4f5a8'] },
  { platform: 'tiktok', views: 8_240, rate: 90, palette: ['#14152e', '#4c5bd4', '#9ee6f2'] },
  { platform: 'instagram_reels', views: 51_800, rate: 260, palette: ['#3a1424', '#e0688a', '#ffd6b8'] },
  { platform: 'naver_clip', views: 12_900, rate: 70, palette: ['#0f2b22', '#2bb38a', '#c9f7d8'] },
  { platform: 'youtube_shorts', views: 4_120, rate: 140, palette: ['#2b1d0f', '#d98b3a', '#ffe2a6'] },
  { platform: 'kakao_shorts', views: 18_600, rate: 60, palette: ['#2b260c', '#c9a227', '#fff3b0'] },
  { platform: 'tiktok', views: 96_300, rate: 320, palette: ['#1d1033', '#8a5cf0', '#f6b6ff'] },
  { platform: 'x', views: 2_980, rate: 40, palette: ['#111418', '#55606e', '#d7dee8'] },
  { platform: 'instagram_reels', views: 27_100, rate: 150, palette: ['#33131a', '#c94b5a', '#ffc7a1'] },
  { platform: 'facebook', views: 6_480, rate: 50, palette: ['#0d1f3a', '#3b74d8', '#bcd6ff'] },
  { platform: 'youtube_shorts', views: 64_700, rate: 220, palette: ['#102a2e', '#2a9fa8', '#bff3ea'] },
  { platform: 'tiktok', views: 15_300, rate: 110, palette: ['#251530', '#b45cc4', '#ffd0e8'] },
];

const SPEED = 0.014; // band turns per second
const START_TOTAL = 1_284_300;
const VERIFY_EVERY_MS = 2200;
const FLIGHT_MS = 1100;

const compactViews = (views: number) =>
  views >= 10_000 ? `${(views / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만` : Math.round(views).toLocaleString('ko-KR');

type Particle = { x0: number; y0: number; cx: number; cy: number; born: number; delay: number };

export default function ClipStream() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const viewRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const totalRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const totalEl = totalRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !totalEl || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const views = CLIPS.map((clip) => clip.views);
    const verifiedAt = CLIPS.map(() => -Infinity);
    let total = START_TOTAL;
    let shownTotal = START_TOTAL;

    let width = 0;
    let height = 0;
    let bandRadius = 0;
    let cx = 0;
    let cy = 0;
    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      bandRadius = Math.min(width * 0.46, 470);
      cx = width / 2;
      cy = height * 0.4;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    let offset = 0.02;
    let speed = SPEED;
    let speedTarget = SPEED;
    let dragging = false;
    let lastX = 0;
    let lastT = 0;
    const positions = CLIPS.map(() => ({ x: 0, y: 0, z: 0, scale: 1 }));

    const layout = () => {
      CLIPS.forEach((_, index) => {
        const card = cardRefs.current[index];
        if (!card) return;
        const u = (((index / CLIPS.length + offset) % 1) + 1) % 1;
        const theta = (u - 0.5) * Math.PI * 2;
        const z = Math.cos(theta);
        const x = cx + Math.sin(theta) * bandRadius;
        const y = cy - (1 - z) * 34;
        const scale = 0.62 + 0.38 * Math.max(0, z);
        const visible = Math.min(1, Math.max(0, (z + 0.05) / 0.45));
        positions[index] = { x, y, z, scale };
        card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) rotateY(${((-theta * 180) / Math.PI) * 0.5}deg) scale(${scale.toFixed(3)})`;
        card.style.opacity = visible.toFixed(3);
        card.style.zIndex = String(Math.round((z + 1) * 50));
        card.style.visibility = visible < 0.01 ? 'hidden' : 'visible';
      });
    };

    const particles: Particle[] = [];
    const totalCenter = () => {
      const rootBox = root.getBoundingClientRect();
      const box = totalEl.getBoundingClientRect();
      return { x: box.left - rootBox.left + box.width / 2, y: box.top - rootBox.top + box.height / 2 };
    };

    let lastVerify = 0;
    const verify = (now: number) => {
      // The front-most clip that hasn't passed review recently.
      let best = -1;
      positions.forEach((position, index) => {
        if (now - verifiedAt[index] < 8000 || position.z < 0.85) return;
        if (best === -1 || position.z > positions[best].z) best = index;
      });
      if (best === -1) return;
      verifiedAt[best] = now;
      const card = cardRefs.current[best];
      if (card) {
        card.dataset.verified = 'true';
        window.setTimeout(() => (card.dataset.verified = 'false'), 1800);
      }
      const from = positions[best];
      const target = totalCenter();
      for (let i = 0; i < 14; i++) {
        particles.push({
          x0: from.x + (Math.random() - 0.5) * 60 * from.scale,
          y0: from.y + 40 * from.scale,
          cx: (from.x + target.x) / 2 + (Math.random() - 0.5) * 220,
          cy: Math.min(from.y, target.y) - 20 + Math.random() * 60,
          born: now,
          delay: i * 45,
        });
      }
      const gained = Math.round(3_000 + Math.random() * 9_000);
      window.setTimeout(() => (total += gained), FLIGHT_MS * 0.7);
    };

    const drawParticles = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      const target = totalCenter();
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        const t = (now - particle.born - particle.delay) / FLIGHT_MS;
        if (t < 0) continue;
        if (t >= 1) {
          particles.splice(i, 1);
          continue;
        }
        const ease = 1 - Math.pow(1 - t, 3);
        const at = (s: number) => ({
          x: (1 - s) * (1 - s) * particle.x0 + 2 * (1 - s) * s * particle.cx + s * s * target.x,
          y: (1 - s) * (1 - s) * particle.y0 + 2 * (1 - s) * s * particle.cy + s * s * target.y,
        });
        const head = at(ease);
        const tail = at(Math.max(0, ease - 0.08));
        const alpha = t < 0.85 ? 1 : (1 - t) / 0.15;
        const gradient = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
        gradient.addColorStop(0, 'rgba(88, 185, 130, 0)');
        gradient.addColorStop(1, `rgba(88, 185, 130, ${alpha.toFixed(3)})`);
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(head.x, head.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(head.x, head.y, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160, 230, 180, ${alpha.toFixed(3)})`;
        ctx.shadowColor = 'rgba(88, 185, 130, 0.9)';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    let lastText = 0;
    const writeNumbers = (now: number, force = false) => {
      if (!force && now - lastText < 180) return;
      lastText = now;
      viewRefs.current.forEach((element, index) => {
        if (element) element.textContent = `조회수 ${compactViews(views[index])}`;
      });
      totalEl.textContent = Math.round(shownTotal).toLocaleString('ko-KR');
    };

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!dragging) {
        speed += (speedTarget - speed) * Math.min(1, dt * 3);
        offset += speed * dt;
      }
      CLIPS.forEach((clip, index) => (views[index] += clip.rate * dt));
      shownTotal += (total - shownTotal) * Math.min(1, dt * 4);
      layout();
      if (now - lastVerify > VERIFY_EVERY_MS) {
        lastVerify = now;
        verify(now);
      }
      drawParticles(now);
      writeNumbers(now);
      raf = requestAnimationFrame(frame);
    };

    let visible = false;
    const run = () => {
      if (reduced || raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) run();
      else stop();
    });
    const onVisibility = () => (document.hidden ? stop() : run());
    const resizeObserver = new ResizeObserver(() => {
      resize();
      layout();
    });

    const onPointerDown = (event: PointerEvent) => {
      if (reduced) return;
      dragging = true;
      root.dataset.dragging = 'true';
      lastX = event.clientX;
      lastT = performance.now();
      try {
        root.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic pointers can't be captured.
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const du = -(event.clientX - lastX) / (Math.PI * 2 * bandRadius);
      offset += du;
      speed = Math.max(-0.6, Math.min(0.6, du / Math.max(0.008, (now - lastT) / 1000)));
      lastX = event.clientX;
      lastT = now;
      if (reduced) layout();
    };
    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      root.dataset.dragging = 'false';
      if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
    };
    // Hovering a screen stops the band so it can be read.
    const onOver = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && (event.target as HTMLElement).closest('.cl-stream__card')) speedTarget = 0;
    };
    const onOut = (event: PointerEvent) => {
      if (!(event.relatedTarget as HTMLElement | null)?.closest?.('.cl-stream__card')) speedTarget = SPEED;
    };

    resize();
    layout();
    writeNumbers(0, true);
    observer.observe(root);
    resizeObserver.observe(root);
    document.addEventListener('visibilitychange', onVisibility);
    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerup', onPointerUp);
    root.addEventListener('pointercancel', onPointerUp);
    root.addEventListener('pointerover', onOver);
    root.addEventListener('pointerout', onOut);
    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerUp);
      root.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerout', onOut);
    };
  }, []);

  return (
    <div aria-hidden className="cl-stream" ref={rootRef}>
      {CLIPS.map((clip, index) => (
        <div
          className="cl-stream__card"
          key={index}
          ref={(element) => {
            cardRefs.current[index] = element;
          }}
        >
          <DeviceFrame>
            <div
              className="cl-clip-screen"
              style={{
                background: `radial-gradient(60% 40% at 30% 30%, ${clip.palette[2]}cc, transparent 70%), radial-gradient(70% 50% at 70% 80%, ${clip.palette[1]}, transparent 75%), linear-gradient(160deg, ${clip.palette[0]}, ${clip.palette[1]})`,
                animationDelay: `${-index * 1.7}s`,
              }}
            >
              <span className="cl-clip-screen__rail">
                <i />
                <i />
                <i />
              </span>
              <span className="cl-clip-screen__lines">
                <i />
                <i />
              </span>
              <span className="cl-clip-screen__progress" style={{ animationDelay: `${-index * 2.3}s` }} />
            </div>
          </DeviceFrame>
          <div className="cl-stream__meta">
            <PlatformIcon platform={clip.platform} size={14} />
            <span
              ref={(element) => {
                viewRefs.current[index] = element;
              }}
            />
          </div>
          <span className="cl-stream__verified">
            <StatusDot tone="green">검증됨</StatusDot>
          </span>
        </div>
      ))}
      <canvas className="cl-stream__canvas" ref={canvasRef} />
      <div className="cl-stream__total">
        <span className="cl-stream__total-label">이번 캠페인 검증 조회수</span>
        <span className="cl-stream__total-value" ref={totalRef}>
          {START_TOTAL.toLocaleString('ko-KR')}
        </span>
      </div>
    </div>
  );
}
