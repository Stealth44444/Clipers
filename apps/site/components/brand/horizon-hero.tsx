'use client';

import { useEffect, useRef } from 'react';
import { ButtonLink } from '@clipers/ui';
import { HORIZON_FS, HORIZON_VS } from '@/lib/horizon-shader';

// Spec §4: a dark full-bleed band under the white nav, the horizon shader behind the headline. As the band scrolls
// away the planet rises a little (native scroll, never hijacked). Off screen or in a hidden tab it stops drawing;
// under reduced motion it draws one frame; without WebGL2 a CSS horizon stands in.

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export default function HorizonHero({ signUpHref }: { signUpHref: string }) {
  const bandRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const band = bandRef.current, canvas = canvasRef.current, copy = copyRef.current;
    if (!band || !canvas || !copy) return;
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
      band.dataset.fallback = 'true';
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
    const start = performance.now();
    const draw = (now: number) => {
      const rect = band.getBoundingClientRect();
      const lift = 1 - Math.pow(1 - clamp(-rect.top / rect.height), 3);
      copy.style.transform = `translateY(${-40 * lift}px)`;
      eased[0] += (mouse[0] - eased[0]) * 0.04;
      eased[1] += (mouse[1] - eased[1]) * 0.04;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, 20 + (now - start) / 1000);
      gl.uniform1f(uRise, lift * 0.6);
      gl.uniform2f(uMouse, eased[0], eased[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw(start);
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
      if (visible && !document.hidden) frame = requestAnimationFrame(loop);
    };
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    seen.observe(band);
    const onMove = (event: PointerEvent) => {
      const rect = band.getBoundingClientRect();
      mouse[0] = (event.clientX - rect.left) / rect.width;
      mouse[1] = 1 - (event.clientY - rect.top) / rect.height;
    };
    band.addEventListener('pointermove', onMove);
    document.addEventListener('visibilitychange', update);
    return () => {
      cancelAnimationFrame(frame);
      seen.disconnect();
      sizer.disconnect();
      band.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (
    <section className="cl-horizon" ref={bandRef}>
      <canvas aria-hidden className="cl-horizon__canvas" ref={canvasRef} />
      <div className="cl-horizon__copy" ref={copyRef}>
        <h1>
          조회수가 난 만큼만,
          <br />
          예산을 쓰세요
        </h1>
        <p>
          크리에이터들이 각자 숏폼을 만들어 올려요.
          <br />
          예산은 검증된 조회수에만 쓰여요.
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
    </section>
  );
}
