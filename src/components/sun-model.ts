import * as THREE from "three";

/*
  The sun, the way your eye (or a phone camera) sees it. An emissive sphere
  whose brightness is tone-mapped, so a high sun burns almost white with a thin
  gold rim, and a low sun shows a deep orange disc with a slowly boiling
  surface. In front of it, one glow layer: a tight bloom over the edge, a long
  soft tail, a wide haze that stretches along the horizon at sunset, and faint
  rays. The glow is premultiplied, so it blends cleanly over the CSS sky.

  1 world unit = the sun's radius. The canvas spans SUN_CANVAS_SCALE radii
  each way, so it is SUN_CANVAS_SCALE times as wide as the disc.
*/

export const SUN_CANVAS_SCALE = 3;

const S = SUN_CANVAS_SCALE;

// 3D simplex noise by Ashima Arts / Stefan Gustavson (MIT).
const SIMPLEX = /* glsl */ `
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
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
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
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
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

const discVertex = /* glsl */ `
varying vec3 vObj;
varying vec3 vNormal;
varying vec2 vView;
void main(){
  vObj = position;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = mv.xy;
  gl_Position = projectionMatrix * mv;
}`;

const discFragment = /* glsl */ `
uniform float uTime;
uniform float uExposure;
uniform float uLimbDark;
uniform float uGrain;
uniform float uExtinct;
uniform float uTintPow;
uniform vec3 uTint;
uniform vec3 uLimbTint;
varying vec3 vObj;
varying vec3 vNormal;
varying vec2 vView;
${SIMPLEX}
void main(){
  float mu = clamp(normalize(vNormal).z, 0.0, 1.0);
  // Mild limb darkening; overexposure hides most of it on a high sun.
  float limb = 1.0 - uLimbDark * (1.0 - pow(mu, 0.55));
  vec3 tint = mix(uLimbTint, uTint, pow(mu, uTintPow));

  // Plasma: slow domain-warped large scale + fine granulation (3 octaves total).
  float t = uTime;
  vec3 p = vObj;
  float warp = snoise(p * 1.3 + vec3(0.0, t * 0.020, t * 0.013));
  float plasma = snoise(p * 2.4 + warp * 0.6 + vec3(t * 0.018, -t * 0.011, 0.0));
  vec3 gp = p * 26.0;
  float gran = snoise(gp + vec3(0.0, 0.0, t * 0.08));
  // Granulation fades out when its cells get close to pixel size.
  float granFade = 1.0 - smoothstep(0.35, 0.9, length(fwidth(gp)));
  float tex = 0.55 * plasma + 0.45 * gran * granFade;

  float I = limb * (1.0 + uGrain * tex);
  // Atmospheric extinction near the horizon: lower half of the disc redder/dimmer.
  float lower = clamp(0.5 - 0.5 * vView.y, 0.0, 1.0);
  vec3 trans = exp(-uExtinct * lower * vec3(0.18, 0.55, 1.2));
  vec3 hdr = uExposure * I * tint * trans;
  gl_FragColor = vec4(1.0 - exp(-hdr), 1.0);
}`;

const haloVertex = /* glsl */ `
varying vec2 vP;
void main(){
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const haloFragment = /* glsl */ `
uniform float uTime;
uniform float uEdge;
uniform float uBloomAmp;
uniform float uBloomK;
uniform float uInnerK;
uniform float uMidAmp;
uniform float uMidK;
uniform float uWideAmp;
uniform float uWideW;
uniform float uStretch;
uniform float uRayAmp;
uniform float uAlphaGain;
uniform float uPulse;
uniform vec3 uGlare;
uniform vec3 uHalo;
uniform vec3 uOuter;
uniform vec3 uEmber;
uniform float uEmberAmp;
uniform float uEmberK;
uniform float uGroundCut;
varying vec2 vP;

float hash1(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
// Periodic 1D value noise over the angle (seamless at the wrap).
float ring(float a, float n, float spin){
  float x = (a + spin) * n;
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(hash1(mod(i, n)), hash1(mod(i + 1.0, n)), f);
}

void main(){
  vec2 p = vP;
  float r = length(p);
  float d = r - 1.0;              // distance from the limb, in disc radii
  float dout = max(d, 0.0);

  // Steep bloom around the limb (also bleeds a little inward over the disc).
  float bloom = uBloomAmp * (d >= 0.0 ? exp(-d * uBloomK) : exp(d * uInnerK));
  // Long soft tail.
  float mid = uMidAmp / (1.0 + (dout * uMidK) * (dout * uMidK));
  mid *= smoothstep(-0.02, 0.0, d);
  // Broad atmospheric glow, stretched along the horizon when the sun is low.
  float rw = length(vec2(p.x / uStretch, p.y));
  float dw = max(rw - 1.0, 0.0);
  float wide = uWideAmp * exp(-(dw * dw) / (uWideW * uWideW)) * smoothstep(-0.02, 0.0, d);

  // Ciliary / diffraction rays: two counter-rotating fine angular noises,
  // each ray with its own length.
  float ang = atan(p.y, p.x) / 6.2831853 + 0.5;
  float rr = 0.45 * ring(ang, 53.0, uTime * 0.0035) + 0.55 * ring(ang, 89.0, -uTime * 0.0025);
  rr = rr * rr;
  float rays = uRayAmp * rr * exp(-dout * (3.2 - 1.6 * rr)) * smoothstep(0.0, 0.08, d);

  // A tight, deep-red ember ring hugging the limb of a low sun.
  float ember = uEmberAmp * exp(-dout * uEmberK) * smoothstep(-0.03, 0.0, d);

  float base = (bloom + mid + wide + rays) * uPulse;
  float I = base + ember;
  // A low sun lights the sky, not the ground: little glow below it.
  I *= mix(1.0, smoothstep(-1.6, -0.2, p.y), uGroundCut);
  // Fade to exactly zero before the canvas edge.
  I *= 1.0 - smoothstep(uEdge * 0.62, uEdge * 0.97, r);

  // Colour: matches the disc edge at the limb, warming/saturating outward.
  vec3 col = mix(uGlare, uHalo, smoothstep(0.0, 0.45, dout));
  col = mix(col, uOuter, smoothstep(0.3, 1.5, dout));
  col = mix(col, uEmber, ember / (base + ember + 1e-4));
  float a = 1.0 - exp(-I * uAlphaGain);
  // Half a step of dither so the soft glow doesn't band on 8-bit screens.
  a = clamp(a + (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0, 0.0, 1.0);
  gl_FragColor = vec4(col * a, a); // premultiplied
}`;

type Vec3 = [number, number, number];

// How the sun looks at a given height. Colours go to the screen as they are.
type Look = {
  w: number;
  tint: Vec3;
  limbTint: Vec3;
  tintPow: number;
  exposure: number;
  limbDark: number;
  grain: number;
  extinct: number;
  halo: Vec3;
  outer: Vec3;
  bloomAmp: number;
  bloomK: number;
  innerK: number;
  midAmp: number;
  midK: number;
  wideAmp: number;
  wideW: number;
  stretch: number;
  rayAmp: number;
  alphaGain: number;
  glareLift: number;
  ember: Vec3;
  emberAmp: number;
  emberK: number;
  groundCut: number;
};

// 0 = high in the sky, 0.67 = golden hour, 1 = on the horizon.
const KEYS: Look[] = [
  {
    w: 0.0,
    tint: [1.0, 0.95, 0.84], limbTint: [1.0, 0.7, 0.4], tintPow: 0.5, exposure: 7.0, limbDark: 0.3, grain: 0.03, extinct: 0.0,
    halo: [1.0, 0.95, 0.81], outer: [1.0, 0.97, 0.92],
    bloomAmp: 2.0, bloomK: 7.0, innerK: 26.0, midAmp: 0.8, midK: 2.6, wideAmp: 0.2, wideW: 1.0, stretch: 1.0,
    rayAmp: 0.28, alphaGain: 0.85, glareLift: 0.5,
    ember: [1.0, 0.32, 0.1], emberAmp: 0.0, emberK: 9.0, groundCut: 0.0,
  },
  {
    w: 0.67,
    tint: [1.0, 0.45, 0.16], limbTint: [1.0, 0.28, 0.08], tintPow: 0.9, exposure: 6.0, limbDark: 0.45, grain: 0.04, extinct: 0.3,
    halo: [1.0, 0.8, 0.52], outer: [1.0, 0.56, 0.26],
    bloomAmp: 1.6, bloomK: 6.0, innerK: 28.0, midAmp: 0.65, midK: 2.0, wideAmp: 0.3, wideW: 1.3, stretch: 1.12,
    rayAmp: 0.2, alphaGain: 0.8, glareLift: 0.12,
    ember: [1.0, 0.36, 0.12], emberAmp: 0.25, emberK: 9.0, groundCut: 0.35,
  },
  {
    w: 1.0,
    tint: [1.0, 0.31, 0.1], limbTint: [1.0, 0.155, 0.04], tintPow: 1.3, exposure: 4.8, limbDark: 0.4, grain: 0.09, extinct: 0.8,
    halo: [1.0, 0.44, 0.16], outer: [1.0, 0.36, 0.14],
    bloomAmp: 1.1, bloomK: 6.2, innerK: 33.0, midAmp: 0.5, midK: 1.3, wideAmp: 0.28, wideW: 1.6, stretch: 1.2,
    rayAmp: 0.1, alphaGain: 0.72, glareLift: 0.1,
    ember: [1.0, 0.32, 0.1], emberAmp: 0.5, emberK: 8.0, groundCut: 1.0,
  },
];

function lookAt(warmth: number): Look {
  const w = Math.min(Math.max(warmth, 0), 1);
  let i = 0;
  while (i < KEYS.length - 2 && w > KEYS[i + 1].w) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = (w - a.w) / (b.w - a.w);
  const lerp = (x: number, y: number) => x + (y - x) * t;
  const out: Record<string, number | number[]> = {};
  for (const k of Object.keys(a) as (keyof Look)[]) {
    const from = a[k];
    const to = b[k];
    out[k] = typeof from === "number" ? lerp(from, to as number) : from.map((v, j) => lerp(v, (to as Vec3)[j]));
  }
  return out as Look;
}

const HALO_PARAMS = [
  "bloomAmp",
  "bloomK",
  "innerK",
  "midAmp",
  "midK",
  "wideAmp",
  "wideW",
  "stretch",
  "rayAmp",
  "alphaGain",
  "emberAmp",
  "emberK",
  "groundCut",
] as const;

export type SunModel = {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  setWarmth: (warmth: number) => void;
  update: (dt: number) => void;
  dispose: () => void;
};

/** warmth: 0 = sun high in the sky (white-gold), 1 = on the horizon (deep orange). */
export function createSun(warmth: number): SunModel {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-S, S, S, -S, 0.1, 20);
  camera.position.set(0, 0, 10);

  const v3 = () => ({ value: new THREE.Vector3() });
  const f = (x = 0) => ({ value: x });
  const discU = {
    uTime: f(),
    uExposure: f(),
    uLimbDark: f(),
    uGrain: f(),
    uExtinct: f(),
    uTintPow: f(1),
    uTint: v3(),
    uLimbTint: v3(),
  };
  // The glow's shape and strength, one uniform each (uBloomAmp, uBloomK, …).
  const params = Object.fromEntries(HALO_PARAMS.map((k) => [k, f()])) as Record<
    (typeof HALO_PARAMS)[number],
    { value: number }
  >;
  const haloU = {
    uTime: f(),
    uEdge: f(S),
    uPulse: f(1),
    uGlare: v3(),
    uHalo: v3(),
    uOuter: v3(),
    uEmber: v3(),
    ...Object.fromEntries(HALO_PARAMS.map((k) => [`u${k[0].toUpperCase()}${k.slice(1)}`, params[k]])),
  };

  const disc = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 48),
    new THREE.ShaderMaterial({ uniforms: discU, vertexShader: discVertex, fragmentShader: discFragment }),
  );
  scene.add(disc);

  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * S, 2 * S),
    new THREE.ShaderMaterial({
      uniforms: haloU,
      vertexShader: haloVertex,
      fragmentShader: haloFragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // Premultiplied "over", so the glow composites correctly on a transparent canvas.
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    }),
  );
  halo.position.z = 2;
  halo.renderOrder = 1;
  scene.add(halo);

  function setWarmth(value: number) {
    const L = lookAt(value);
    discU.uTint.value.fromArray(L.tint);
    discU.uLimbTint.value.fromArray(L.limbTint);
    discU.uExposure.value = L.exposure;
    discU.uLimbDark.value = L.limbDark;
    discU.uGrain.value = L.grain;
    discU.uExtinct.value = L.extinct;
    discU.uTintPow.value = L.tintPow;
    // The glow starts at the disc's own edge colour, so there's no rim or outline.
    const discCol = (mu: number) => {
      const limb = 1 - L.limbDark * (1 - Math.pow(mu, 0.55));
      const sm = Math.pow(mu, L.tintPow);
      return [0, 1, 2].map(
        (j) => 1 - Math.exp(-L.exposure * limb * (L.limbTint[j] + (L.tint[j] - L.limbTint[j]) * sm)),
      );
    };
    const edge = discCol(0.12);
    const core = discCol(1);
    haloU.uGlare.value.set(...(edge.map((v, j) => v + (core[j] - v) * L.glareLift) as Vec3));
    haloU.uHalo.value.fromArray(L.halo);
    haloU.uOuter.value.fromArray(L.outer);
    haloU.uEmber.value.fromArray(L.ember);
    for (const k of HALO_PARAMS) params[k].value = L[k];
  }
  setWarmth(warmth);

  let clock = 0;
  return {
    scene,
    camera,
    setWarmth,
    update(dt) {
      clock = (clock + dt) % 3600;
      discU.uTime.value = clock;
      haloU.uTime.value = clock;
      // Barely-there breathing of the glare.
      haloU.uPulse.value = 1 + 0.025 * Math.sin(clock * 0.6) + 0.015 * Math.sin(clock * 1.37 + 1.3);
    },
    dispose() {
      for (const m of [disc, halo]) {
        m.geometry.dispose();
        m.material.dispose();
      }
    },
  };
}

