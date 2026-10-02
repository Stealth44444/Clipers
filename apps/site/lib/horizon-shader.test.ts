import { describe, expect, it } from 'vitest';
import { HORIZON_FS, HORIZON_VS } from './horizon-shader';

describe('horizon shader', () => {
  it('is WebGL2 GLSL with the uniforms the hero sets', () => {
    expect(HORIZON_VS.startsWith('#version 300 es')).toBe(true);
    expect(HORIZON_FS.startsWith('#version 300 es')).toBe(true);
    for (const name of ['uRes', 'uTime', 'uRise', 'uApproach', 'uMouse']) expect(HORIZON_FS).toContain(name);
  });

  it('never calls smoothstep with reversed constant edges (undefined in GLSL)', () => {
    const pairs = [...HORIZON_FS.matchAll(/smoothstep\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,/g)];
    expect(pairs.length).toBeGreaterThan(3);
    for (const [, a, b] of pairs) expect(Number(a)).toBeLessThan(Number(b));
  });
});
