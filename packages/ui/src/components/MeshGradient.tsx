'use client';

import { useEffect, useRef } from 'react';
import { cx } from '../lib/cx';

type MeshGradientProps = {
  /** Four colours (hex): base, then three that flow through it. */
  colors?: [string, string, string, string];
  /** Flow speed multiplier. */
  speed?: number;
  /** Noise scale; larger means smaller, busier shapes. */
  scale?: number;
  /** How strongly the field leans toward the pointer (0–1). */
  pointer?: number;
  /** Render resolution as a fraction of CSS pixels; the field is soft, so 0.5 is plenty. */
  resolution?: number;
  className?: string;
};

const VERTEX = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

// Domain-warped 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT) mixing four colours,
// plus per-pixel grain so the soft gradients never band.
const FRAGMENT = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uPointer;
uniform float uScale;
uniform vec3 uColor0;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = uv * vec2(uResolution.x / uResolution.y, 1.0) * uScale;
  vec2 lean = (uPointer - 0.5) * 0.6;
  float t = uTime;

  vec2 q = vec2(snoise(vec3(p + lean * 0.5, t * 0.6)), snoise(vec3(p + vec2(5.2, 1.3), t * 0.6)));
  vec2 r = vec2(snoise(vec3(p + 1.6 * q + vec2(1.7, 9.2) + lean, t * 0.8)), snoise(vec3(p + 1.6 * q + vec2(8.3, 2.8), t * 0.8)));
  float f = snoise(vec3(p + 1.2 * r, t * 0.5));

  vec3 color = uColor0;
  color = mix(color, uColor1, smoothstep(-0.25, 0.75, q.x) * 0.9);
  color = mix(color, uColor2, smoothstep(-0.2, 0.85, r.y) * 0.85);
  color = mix(color, uColor3, smoothstep(0.0, 0.9, f) * 0.7);

  float grain = fract(sin(dot(gl_FragCoord.xy + fract(t) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
  color += (grain - 0.5) * (4.0 / 255.0);
  gl_FragColor = vec4(color, 1.0);
}
`;

const hexToRgb = (hex: string): [number, number, number] => {
  const value = parseInt(hex.replace('#', ''), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * WebGL mesh gradient: four colours flowing through domain-warped simplex noise, with grain against banding.
 * Background-only (aria-hidden). Pauses off-screen and in hidden tabs, renders one still frame under reduced
 * motion, and falls back to the element's CSS background when WebGL is unavailable.
 */
export function MeshGradient({
  colors = ['#fffdfb', '#cfeedd', '#58b982', '#e2f3a6'],
  speed = 1,
  scale = 1.1,
  pointer = 0.5,
  resolution = 0.5,
  className,
}: MeshGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorKey = colors.join(',');

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!canvas || !gl) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    canvas.dataset.ready = 'true';

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const uResolution = uniform('uResolution');
    const uTime = uniform('uTime');
    const uPointer = uniform('uPointer');
    gl.uniform1f(uniform('uScale'), scale);
    colorKey.split(',').forEach((hex, index) => gl.uniform3fv(uniform(`uColor${index}`), hexToRgb(hex)));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1) * resolution;
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lean = { x: 0.5, y: 0.5 };
    let leanTarget = { x: 0.5, y: 0.5 };
    let time = 12.3;
    let raf = 0;
    let last = performance.now();

    const draw = () => {
      gl.uniform1f(uTime, time);
      gl.uniform2f(uPointer, lean.x, lean.y);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt * 0.12 * speed;
      lean = { x: lean.x + (leanTarget.x - lean.x) * dt * 1.5, y: lean.y + (leanTarget.y - lean.y) * dt * 1.5 };
      draw();
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
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (!raf) draw();
    });
    const onVisibility = () => (document.hidden ? stop() : run());
    const onPointerMove = (event: PointerEvent) => {
      if (pointer <= 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1 - (event.clientY - rect.top) / rect.height;
      leanTarget = { x: 0.5 + (x - 0.5) * pointer, y: 0.5 + (y - 0.5) * pointer };
    };

    resize();
    draw();
    observer.observe(canvas);
    resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteBuffer(buffer);
      delete canvas.dataset.ready;
    };
  }, [colorKey, speed, scale, pointer, resolution]);

  return <canvas aria-hidden className={cx('cl-mesh', className)} ref={canvasRef} />;
}
