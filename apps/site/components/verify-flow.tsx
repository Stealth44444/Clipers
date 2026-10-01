'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Activity, Download, ScanSearch } from 'lucide-react';
import { PlatformIcon } from '@clipers/ui';

// Brand page: views flow in from the platforms, pass three checks, and only what survives counts.
// Rejected views drop out of the stream. The checks mirror what Clipers actually does — no invented signals.

const SOURCES = ['youtube_shorts', 'tiktok', 'instagram_reels', 'naver_clip'];
const GATES: { at: number; label: string; note: string; icon: ReactNode; reject: number }[] = [
  { at: 0.3, label: '조회수 수집', note: '유튜브는 자동, 그 밖은 화면 캡처', icon: <Download size={24} />, reject: 0 },
  { at: 0.52, label: '운영팀 검수', note: '요구사항대로 올렸는지', icon: <ScanSearch size={24} />, reject: 0.1 },
  { at: 0.72, label: '급증 확인', note: '짧은 시간의 비정상 증가', icon: <Activity size={24} />, reject: 0.07 },
];
const RESULT_AT = 0.9;
const START_VERIFIED = 1_284_300;

type Dot = { y0: number; born: number; speed: number; fate: number; fallAt: number; dropped: boolean; counted: boolean; dropT: number };

export default function VerifyFlow() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const verifiedRef = useRef<HTMLSpanElement>(null);
  const flaggedRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const dots: Dot[] = [];
    let verified = START_VERIFIED;
    let flagged = 0;
    let lastSpawn = 0;

    const spawn = (now: number) => {
      const lane = Math.floor(Math.random() * SOURCES.length);
      // Which gate (if any) stops this dot.
      const roll = Math.random();
      let fallAt = -1;
      let cumulative = 0;
      for (let g = 0; g < GATES.length; g++) {
        cumulative += GATES[g].reject;
        if (roll < cumulative) {
          fallAt = g;
          break;
        }
      }
      dots.push({ y0: (lane + 0.5) / SOURCES.length, born: now, speed: 0.16 + Math.random() * 0.06, fate: Math.random(), fallAt, dropped: false, counted: false, dropT: 0 });
    };

    const yAt = (dot: Dot, progress: number) => {
      // Lanes converge into the center line before the first check.
      const merge = Math.min(1, Math.max(0, (progress - 0.05) / (GATES[0].at - 0.05)));
      const eased = merge * merge * (3 - 2 * merge);
      const laneY = height * (0.2 + dot.y0 * 0.6);
      return laneY + (height / 2 - laneY) * eased + Math.sin(dot.fate * 20 + progress * 12) * 3 * eased;
    };

    let raf = 0;
    let last = performance.now();
    let lastText = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (now - lastSpawn > 70) {
        lastSpawn = now;
        spawn(now);
      }
      ctx.clearRect(0, 0, width, height);

      // Guide line through the checks.
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = 'rgba(47, 125, 82, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width * GATES[0].at, height / 2);
      ctx.lineTo(width * RESULT_AT, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      for (let i = dots.length - 1; i >= 0; i--) {
        const dot = dots[i];
        const progress = ((now - dot.born) / 1000) * dot.speed;
        const x = 40 + progress * (width - 40);
        if (!dot.dropped && dot.fallAt >= 0 && progress >= GATES[dot.fallAt].at) {
          dot.dropped = true;
          dot.dropT = now;
          flagged += 1;
        }
        if (dot.dropped) {
          const t = (now - dot.dropT) / 900;
          if (t >= 1) {
            dots.splice(i, 1);
            continue;
          }
          const gx = width * GATES[dot.fallAt].at;
          ctx.beginPath();
          ctx.arc(gx + t * 18, height / 2 + t * t * 120, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(150, 140, 130, ${(0.7 * (1 - t)).toFixed(3)})`;
          ctx.fill();
          continue;
        }
        if (progress >= RESULT_AT) {
          if (!dot.counted) {
            dot.counted = true;
            verified += Math.round(80 + dot.fate * 240);
          }
          dots.splice(i, 1);
          continue;
        }
        const y = yAt(dot, progress);
        const passed = progress > GATES[GATES.length - 1].at;
        ctx.beginPath();
        ctx.arc(x, y, passed ? 3.2 : 2.6, 0, Math.PI * 2);
        ctx.fillStyle = passed ? 'rgba(88, 185, 130, 1)' : `rgba(88, 185, 130, ${(0.45 + 0.4 * dot.fate).toFixed(3)})`;
        if (passed) {
          ctx.shadowColor = 'rgba(88, 185, 130, 0.8)';
          ctx.shadowBlur = 8;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (now - lastText > 150) {
        lastText = now;
        if (verifiedRef.current) verifiedRef.current.textContent = verified.toLocaleString('ko-KR');
        if (flaggedRef.current) flaggedRef.current.textContent = `따로 확인 ${flagged.toLocaleString('ko-KR')}건`;
      }
      raf = requestAnimationFrame(frame);
    };

    let visible = false;
    const run = () => {
      if (raf || !visible || document.hidden) return;
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
    const resizeObserver = new ResizeObserver(resize);
    resize();
    observer.observe(root);
    resizeObserver.observe(root);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div className="cl-verify__flow" ref={rootRef}>
      <canvas aria-hidden className="cl-verify__canvas" ref={canvasRef} />
      <div aria-hidden className="cl-verify__sources">
        {SOURCES.map((platform) => (
          <span key={platform}>
            <PlatformIcon platform={platform} size={20} />
          </span>
        ))}
      </div>
      {GATES.map((gate) => (
        <div className="cl-verify__gate" key={gate.label} style={{ left: `${gate.at * 100}%` }}>
          <span aria-hidden className="cl-verify__gate-icon">
            {gate.icon}
          </span>
          <span className="cl-verify__gate-label">{gate.label}</span>
          <span className="cl-verify__gate-note">{gate.note}</span>
        </div>
      ))}
      <div className="cl-verify__result">
        <span className="cl-verify__result-label">정산에 쓰이는 검증 조회수</span>
        <span className="cl-verify__result-value" ref={verifiedRef}>
          {START_VERIFIED.toLocaleString('ko-KR')}
        </span>
        <span className="cl-verify__result-flag" ref={flaggedRef}>
          걸러진 조회수는 따로 확인해요
        </span>
      </div>
    </div>
  );
}
