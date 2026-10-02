// The brand hero's "horizon": a planet's rim lit green and lime, a haze, light shafts and rising specks — one per clip,
// their brightness drawn from a Pareto so only a few shine. One WebGL2 fragment shader over a full-screen quad.
// uApproach (0 → 1, the hero's scroll) flies down to the planet: the horizon rises and flattens, its light thickens,
// and at the end the light washes the screen white so the white page below follows on (2026-10-02).
// smoothstep is always called with edge0 < edge1 (reversed edges are undefined in GLSL; a prototype broke on it).

export const HORIZON_VS = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0., 1.); }`;

export const HORIZON_FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uRise;
uniform float uApproach;
uniform vec2 uMouse;
out vec4 o;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= .5; } return v; }

// rising clips: a scrolling grid, one speck per cell, brightness from a Pareto(1.16)
float clips(vec2 p, float scale, float speed, float t) {
  vec2 g = (p - vec2(0., t * speed)) * scale;
  vec2 id = floor(g), f = fract(g) - .5;
  float h = hash(id);
  if (h > 0.55) return 0.;
  vec2 pos = vec2(hash(id + 3.1), hash(id + 7.7)) - .5;
  float w = pow(1. - hash(id + 9.7) * 0.999, -1. / 1.16);
  float b = clamp(log(w) / 5., 0., 1.);
  float d = length(f - pos * .7);
  float twinkle = .65 + .35 * sin(t * (1.5 + h * 3.) + h * 40.);
  return (1. - smoothstep(0., 0.05 + 0.14 * b, d)) * (0.18 + 0.82 * b) * twinkle;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - .5) * asp, uv.y);
  float t = uTime;

  float a = uApproach;
  float near = smoothstep(0.08, 0.85, a);
  float R = mix(2.9, 14.0, near), top = 0.19 + uRise * 0.14 + 0.30 * near;
  float thick = 1. + near * 3.;
  vec2 c = vec2((uMouse.x - .5) * 0.10 * (1. - near), top - R);
  vec2 q = p - c; float r = length(q); float d = r - R;
  vec2 n = q / r;
  float ang = atan(n.x, n.y) - (uMouse.x - .5) * 0.06;
  float focus = exp(-ang * ang * 42.) * (.92 + .08 * sin(t * .45)) * (1. + uRise * 0.9 + near * 0.5);

  float above = step(0., d);
  float rim = exp(-abs(d) * 260. / thick) * (0.30 + 0.70 * focus);
  float rimSoft = exp(-abs(d) * 46. / thick) * (0.18 + 0.82 * focus);
  float halo = exp(-max(d, 0.) * (4.2 - uRise * 1.6) * (1. + near * 0.8)) * (0.10 + 0.90 * focus) * above;
  float haloWide = exp(-max(d, 0.) * 1.6 * (1. + near)) * (0.05 + 0.40 * focus) * above;
  float inner = exp(min(d, 0.) * 18. / thick) * (1. - above) * (0.25 + 0.75 * focus);

  vec2 src = vec2(c.x, top - 0.22); vec2 rv = p - src; float ra = atan(rv.x, rv.y);
  float shafts = smoothstep(0.42, 0.95, fbm(vec2(ra * 7.0, t * 0.04))) * exp(-length(rv) * 1.7) * smoothstep(-0.01, 0.06, d) * exp(-ra * ra * 3.);

  float rise = above * exp(-d * 2.2) * smoothstep(0.0, 0.03, d) * (0.25 + 0.75 * exp(-ang * ang * 6.));
  float parts = (clips(p, 46., 0.035, t) + clips(p + 3.7, 90., 0.05, t) * 0.7 + clips(p + 9.1, 150., 0.07, t) * 0.45) * rise;
  float surface = (1. - above) * fbm(q * vec2(5., 9.) + vec2(0., t * 0.01)) * exp(min(d, 0.) * 7.) * (0.2 + 0.8 * focus);

  vec3 bg = vec3(0.012, 0.020, 0.016);
  vec3 green = vec3(0.345, 0.725, 0.510);
  vec3 deep = vec3(0.10, 0.36, 0.22);
  vec3 lime = vec3(0.804, 0.922, 0.471);
  vec3 col = bg + deep * haloWide * 0.55 + green * halo * 0.7 + mix(green, lime, 0.55) * rimSoft * 0.75
           + mix(lime, vec3(1.), 0.55) * rim * 1.6 + green * inner * 0.35 + mix(green, lime, 0.4) * shafts * 0.22
           + mix(lime, vec3(1.), 0.3) * parts * 1.5 + deep * surface * 0.22;
  col = 1. - exp(-col * 1.35);

  // the wash: like a sunrise, the light floods up into the sky from the rim (the planet below brightens last),
  // through the rim's lime into white, then the whole screen
  float w = smoothstep(0.5, 0.8, a);
  float reach = d > 0. ? d * 0.9 : -d * 1.8;
  float wash = max(smoothstep(0.0, 1.0, w * 2.0 - reach - 0.15), smoothstep(0.74, 0.8, a));
  vec3 light = mix(mix(green, lime, 0.6), vec3(1.), smoothstep(0.35, 1.0, wash));

  col *= 1. - 0.35 * (1. - wash) * smoothstep(0.55, 1.15, length((uv - vec2(.5, .45)) * vec2(asp * .8, 1.)));
  col = mix(col, light, wash);
  col += (hash(gl_FragCoord.xy + fract(t) * 91.) - .5) * 0.018 * (1. - wash);
  o = vec4(col, 1.);
}`;
