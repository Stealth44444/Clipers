'use client';

import { useEffect, useRef } from 'react';
import { Avatar, PlatformIcon } from '@clipers/ui';

// Brand hero visual: a dotted globe that turns on its own (drag to spin it, it leans toward the pointer).
// Campaign tiles, the seven platforms and creators sit on its surface; arcs run from a campaign to a creator
// and land with the views that clip brought in. Grid and arcs are canvas; tiles are DOM so they stay crisp.

type GlobeNode = {
  kind: 'campaign' | 'platform' | 'creator';
  lat: number;
  lon: number;
  platform?: string;
  name?: string;
  caption?: string;
  /** Caption shown as a large bubble instead of a faint label. */
  bubble?: boolean;
};

const NODES: GlobeNode[] = [
  { kind: 'campaign', lat: 16, lon: -28, caption: '새 캠페인이 열렸어요' },
  { kind: 'campaign', lat: -24, lon: 160, caption: '새 캠페인이 열렸어요' },
  { kind: 'platform', platform: 'youtube_shorts', lat: 46, lon: 18 },
  { kind: 'platform', platform: 'tiktok', lat: -6, lon: 78 },
  { kind: 'platform', platform: 'instagram_reels', lat: -44, lon: 24 },
  { kind: 'platform', platform: 'naver_clip', lat: 34, lon: 196 },
  { kind: 'platform', platform: 'kakao_shorts', lat: -36, lon: -104 },
  { kind: 'platform', platform: 'x', lat: 50, lon: -142 },
  { kind: 'platform', platform: 'facebook', lat: 6, lon: 236 },
  { kind: 'creator', name: '하루', lat: 4, lon: 34, caption: '첫 정산 받았어요!', bubble: true },
  { kind: 'creator', name: '민지', lat: -26, lon: -58, caption: '검수 통과!' },
  { kind: 'creator', name: '도윤', lat: 26, lon: 116, caption: '조회수 1만 돌파' },
  { kind: 'creator', name: '서아', lat: -10, lon: 200, caption: '바로 올려 볼게요' },
  { kind: 'creator', name: '지호', lat: 18, lon: -96, caption: '가 보자고' },
  { kind: 'creator', name: '유나', lat: -52, lon: 120 },
];

/** Campaign → creator, and the views that clip brought in. */
const ARCS: [number, number, string][] = [
  [0, 11, '조회수 +3.1만'],
  [1, 9, '조회수 +1.2만'],
  [0, 14, '조회수 +8,400'],
  [1, 10, '조회수 +2.4만'],
  [0, 12, '조회수 +5,600'],
  [1, 13, '조회수 +9,800'],
];

const AUTO_SPIN = 0.16; // rad/s
const BASE_PITCH = 0.38;
const DRAW_MS = 1500;
const HOLD_MS = 1700;
const FADE_MS = 500;
const ARC_MS = DRAW_MS + HOLD_MS + FADE_MS;
const INK = '47, 125, 82';
const toRad = (deg: number) => (deg * Math.PI) / 180;

type Vec = [number, number, number];
const unit = (lat: number, lon: number): Vec => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];

function slerp(a: Vec, b: Vec, t: number): Vec {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  if (omega < 1e-4) return a;
  const sa = Math.sin((1 - t) * omega) / Math.sin(omega);
  const sb = Math.sin(t * omega) / Math.sin(omega);
  return [a[0] * sa + b[0] * sb, a[1] * sa + b[1] * sb, a[2] * sa + b[2] * sb];
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function ReachGlobe() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const pill = pillRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !pill || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Grid samples: five parallels and twelve meridians, dense enough to read as dotted lines.
    const grid: Vec[] = [];
    for (const lat of [-60, -30, 0, 30, 60]) {
      const count = Math.round(260 * Math.cos(toRad(lat)));
      for (let i = 0; i < count; i++) grid.push(unit(toRad(lat), (i / count) * Math.PI * 2));
    }
    for (let m = 0; m < 12; m++) {
      for (let i = 1; i < 130; i++) grid.push(unit(-Math.PI / 2 + (i / 130) * Math.PI, (m / 12) * Math.PI * 2));
    }
    const nodeVecs = NODES.map((node) => unit(toRad(node.lat), toRad(node.lon)));

    let width = 0;
    let height = 0;
    let radius = 0;
    let cx = 0;
    let cy = 0;
    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      radius = Math.min(width * 0.38, height * 0.4);
      cx = width / 2;
      cy = height / 2;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    let yaw = 0.5;
    let yawVelocity = AUTO_SPIN;
    let pitch = BASE_PITCH;
    let lean = 0;
    let leanTarget = 0;
    let dragging = false;
    let lastPointer = { x: 0, y: 0, t: 0 };

    // Rotate a unit vector into view space: yaw about Y, then pitch (plus lean) about X.
    const project = (v: Vec) => {
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const x1 = v[0] * cosY + v[2] * sinY;
      const z1 = -v[0] * sinY + v[2] * cosY;
      const p = pitch + lean;
      const y2 = v[1] * Math.cos(p) - z1 * Math.sin(p);
      const z2 = v[1] * Math.sin(p) + z1 * Math.cos(p);
      return { x: cx + x1 * radius, y: cy - y2 * radius, z: z2 };
    };

    const hit = new Set<number>();
    const setHit = (index: number, on: boolean) => {
      const element = nodeRefs.current[index];
      if (!element || hit.has(index) === on) return;
      if (on) hit.add(index);
      else hit.delete(index);
      element.dataset.hit = on ? 'true' : 'false';
    };

    let start = performance.now();
    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      // Rim and grid.
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${INK}, 0.10)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      for (const v of grid) {
        const p = project(v);
        const alpha = p.z > 0 ? 0.1 + 0.32 * p.z : 0.05;
        ctx.fillStyle = `rgba(${INK}, ${alpha.toFixed(3)})`;
        ctx.fillRect(p.x - 0.7, p.y - 0.7, 1.4, 1.4);
      }

      // Tiles: depth drives opacity, scale and stacking.
      NODES.forEach((_, index) => {
        const element = nodeRefs.current[index];
        if (!element) return;
        const p = project(nodeVecs[index]);
        const front = Math.min(1, Math.max(0, (p.z + 0.12) / 0.45));
        const scale = 0.72 + 0.28 * ((p.z + 1) / 2);
        element.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        element.style.opacity = (0.06 + 0.94 * front).toFixed(3);
        element.style.zIndex = String(Math.round((p.z + 1) * 50));
        element.style.setProperty('--front', front.toFixed(3));
      });

      // One arc at a time: draw, hold with the views label, fade.
      const elapsed = reduced ? DRAW_MS + 200 : now - start;
      const arcIndex = Math.floor(elapsed / ARC_MS) % ARCS.length;
      const local = elapsed % ARC_MS;
      const [from, to, label] = ARCS[arcIndex];
      const drawn = easeInOut(Math.min(1, local / DRAW_MS));
      const fade = local > DRAW_MS + HOLD_MS ? 1 - (local - DRAW_MS - HOLD_MS) / FADE_MS : 1;
      const a = nodeVecs[from];
      const b = nodeVecs[to];
      const span = Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
      const arcHeight = 0.12 + 0.24 * (span / Math.PI);
      const steps = 80;
      let previous = null as ReturnType<typeof project> | null;
      for (let i = 0; i <= Math.round(steps * drawn); i++) {
        const s = i / steps;
        const v = slerp(a, b, s);
        const lift = 1 + arcHeight * Math.sin(Math.PI * s);
        const p = project([v[0] * lift, v[1] * lift, v[2] * lift]);
        if (previous) {
          const depth = (p.z + previous.z) / 2;
          ctx.beginPath();
          ctx.moveTo(previous.x, previous.y);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = `rgba(88, 185, 130, ${((depth > -0.1 ? 0.95 : 0.25) * fade).toFixed(3)})`;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        previous = p;
      }
      if (previous && drawn < 1) {
        ctx.beginPath();
        ctx.arc(previous.x, previous.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(88, 185, 130, 1)';
        ctx.shadowColor = 'rgba(88, 185, 130, 0.8)';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Views label rides the arc's apex once the arc lands.
      const mid = slerp(a, b, 0.5);
      const apex = project([mid[0] * (1 + arcHeight), mid[1] * (1 + arcHeight), mid[2] * (1 + arcHeight)]);
      const landed = drawn >= 1;
      pill.textContent = label;
      pill.style.transform = `translate3d(${apex.x.toFixed(1)}px, ${apex.y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${landed ? 1 : 0.85})`;
      pill.style.opacity = landed ? fade.toFixed(3) : '0';
      ARCS.forEach(([, target]) => setHit(target, landed && target === to && fade > 0.5));
    };

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!dragging) {
        yawVelocity += (AUTO_SPIN - yawVelocity) * Math.min(1, dt * 1.2);
        yaw += yawVelocity * dt;
        pitch += (BASE_PITCH - pitch) * Math.min(1, dt * 0.8);
      }
      lean += (leanTarget - lean) * Math.min(1, dt * 4);
      draw(now);
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
      if (!raf) draw(performance.now());
    });

    const onPointerDown = (event: PointerEvent) => {
      if (reduced) return;
      dragging = true;
      try {
        root.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic pointers can't be captured; dragging still works while over the globe.
      }
      root.dataset.dragging = 'true';
      lastPointer = { x: event.clientX, y: event.clientY, t: performance.now() };
    };
    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      leanTarget = ((event.clientY - rect.top) / rect.height - 0.5) * 0.18;
      if (!dragging) return;
      const now = performance.now();
      const dx = event.clientX - lastPointer.x;
      const dy = event.clientY - lastPointer.y;
      const dt = Math.max(0.008, (now - lastPointer.t) / 1000);
      yaw += dx / radius;
      pitch = Math.min(0.9, Math.max(-0.1, pitch + dy / radius / 1.5));
      yawVelocity = Math.max(-4, Math.min(4, dx / radius / dt));
      lastPointer = { x: event.clientX, y: event.clientY, t: now };
    };
    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      root.dataset.dragging = 'false';
      if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
    };
    const onPointerLeave = () => {
      leanTarget = 0;
    };

    resize();
    draw(performance.now());
    start = performance.now();
    observer.observe(root);
    resizeObserver.observe(root);
    document.addEventListener('visibilitychange', onVisibility);
    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerup', onPointerUp);
    root.addEventListener('pointercancel', onPointerUp);
    root.addEventListener('pointerleave', onPointerLeave);
    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerUp);
      root.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <div aria-hidden className="cl-globe" ref={rootRef}>
      <canvas className="cl-globe__canvas" ref={canvasRef} />
      {NODES.map((node, index) => (
        <div
          className="cl-globe__node"
          data-kind={node.kind}
          key={`${node.kind}-${node.lat}-${node.lon}`}
          ref={(element) => {
            nodeRefs.current[index] = element;
          }}
        >
          {node.caption && <span className={node.bubble ? 'cl-globe__bubble' : 'cl-globe__caption'}>{node.caption}</span>}
          {node.kind === 'campaign' && (
            <span className="cl-globe__tile">
              <img alt="" src="/logo/clipers-mark.svg" />
            </span>
          )}
          {node.kind === 'platform' && (
            <span className="cl-globe__tile">
              <PlatformIcon platform={node.platform!} size={26} />
            </span>
          )}
          {node.kind === 'creator' && (
            <span className="cl-globe__avatar">
              <Avatar name={node.name!} size="md" />
            </span>
          )}
        </div>
      ))}
      <span className="cl-globe__pill" ref={pillRef} />
    </div>
  );
}
