'use client';

import { useEffect, useRef } from 'react';
import { ButtonLink } from '@clipers/ui';
import { HORIZON_FS, HORIZON_VS } from '@/lib/horizon-shader';

// Spec §4 (2026-10-02: the whole first screen under a clear nav, then a fly-down). The horizon shader fills a pinned
// screen; native scroll through the section (never hijacked) is the approach: the headline lifts away, the planet rises,
// grows and flattens as if we were descending to it, its light thickens and finally washes the screen white, so the
// white data section below follows with no seam. Off screen or in a hidden tab it stops drawing; reduced motion and
// no-WebGL get the plain first screen (CSS keeps the section one screen tall for them).

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => 1 - Math.pow(1 - value, 3);
// Past this progress the screen is mostly white, so the nav goes back to its white self.
const NAV_WHITE_AT = 0.66;

/** Scroll progress through the pinned hero: 0 at the top, 1 when its last screen is reached. */
function progressOf(track: HTMLElement): number {
  const rect = track.getBoundingClientRect();
  const travel = rect.height - window.innerHeight;
  return travel > 0 ? clamp(-rect.top / travel) : 0;
}

export default function HorizonHero({ signUpHref }: { signUpHref: string }) {
  const trackRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  // While the dark hero is behind the nav, the nav is clear with white text; once the light has washed the screen
  // (or the hero has gone), the usual frosted white nav.
  useEffect(() => {
    const track = trackRef.current;
    const nav = document.querySelector<HTMLElement>('.cl-landing-nav');
    if (!track || !nav) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      nav.dataset.overDark = String(track.getBoundingClientRect().bottom > nav.offsetHeight && progressOf(track) < NAV_WHITE_AT);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    const track = trackRef.current, pin = pinRef.current, canvas = canvasRef.current, copy = copyRef.current;
    if (!track || !pin || !canvas || !copy) return;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    const compile = (context: WebGL2RenderingContext, type: number, source: string) => {
      const shader = context.createShader(type);
      if (!shader) return null;
      context.shaderSource(shader, source);
      context.compileShader(shader);
      return context.getShaderParameter(shader, context.COMPILE_STATUS) ? shader : null;
    };
    const vs = gl && compile(gl, gl.VERTEX_SHADER, HORIZON_VS);
    const fs = gl && compile(gl, gl.FRAGMENT_SHADER, HORIZON_FS);
    const program = gl && vs && fs ? gl.createProgram() : null;
    if (gl && program && vs && fs) {
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
    }
    if (!gl || !program || !gl.getProgramParameter(program, gl.LINK_STATUS)) {
      track.dataset.fallback = 'true';
      return;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(program, 'uRes');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uRise = gl.getUniformLocation(program, 'uRise');
    const uApproach = gl.getUniformLocation(program, 'uApproach');
    const uMouse = gl.getUniformLocation(program, 'uMouse');

    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const sizer = new ResizeObserver(resize);
    sizer.observe(canvas);

    const mouse = [0.5, 0.5], eased = [0.5, 0.5];
    // The clock runs faster as we approach, so the rising specks stream by (integrated, so it never jumps).
    let clock = 20, last = performance.now();
    const draw = (now: number) => {
      const progress = progressOf(track);
      clock += (Math.min(64, now - last) / 1000) * (1 + 1.6 * progress);
      last = now;
      const lift = clamp(progress / 0.28);
      copy.style.opacity = String(1 - ease(lift));
      copy.style.transform = `translateY(${-90 * ease(lift)}px)`;
      copy.style.visibility = lift >= 1 ? 'hidden' : '';
      eased[0] += (mouse[0] - eased[0]) * 0.04;
      eased[1] += (mouse[1] - eased[1]) * 0.04;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, clock);
      gl.uniform1f(uRise, ease(clamp(progress / 0.3)) * 0.6);
      gl.uniform1f(uApproach, progress);
      gl.uniform2f(uMouse, eased[0], eased[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw(last);
      return () => sizer.disconnect();
    }

    let frame = 0;
    let visible = false;
    const loop = (now: number) => {
      draw(now);
      frame = requestAnimationFrame(loop);
    };
    const update = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = performance.now();
      if (visible && !document.hidden) frame = requestAnimationFrame(loop);
    };
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    seen.observe(pin);
    const onMove = (event: PointerEvent) => {
      const rect = pin.getBoundingClientRect();
      mouse[0] = (event.clientX - rect.left) / rect.width;
      mouse[1] = 1 - (event.clientY - rect.top) / rect.height;
    };
    pin.addEventListener('pointermove', onMove);
    document.addEventListener('visibilitychange', update);
    return () => {
      cancelAnimationFrame(frame);
      seen.disconnect();
      sizer.disconnect();
      pin.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (
    <section className="cl-horizon" ref={trackRef}>
      <div className="cl-horizon__pin" ref={pinRef}>
        <canvas aria-hidden className="cl-horizon__canvas" ref={canvasRef} />
        <div className="cl-horizon__copy" ref={copyRef}>
          <h1>
            바이럴을
            <br />
            운에 맡기지 마세요
          </h1>
          <p>
            숏폼 크리에이터 수십, 수백 명이 브랜드를 각자의 영상으로 퍼뜨려요.
            <br />
            예산은 실제로 난 조회수에만 쓰여요.
          </p>
          <div className="cl-horizon__actions">
            <ButtonLink href={signUpHref} size="lg" variant="primary">
              캠페인 시작하기
            </ButtonLink>
            <ButtonLink className="cl-button--glass" href="/discover" size="lg" variant="secondary">
              진행 중인 캠페인 보기
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
