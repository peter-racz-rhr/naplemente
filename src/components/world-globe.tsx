"use client";

import { useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createDayNightMaterial } from "@/components/ui/3d-globe";

/*
  The Earth with the real sun on it: the glowing line is where the sun is
  setting right now, and it moves as the minutes pass. Drag sideways to turn
  it (up and down still scrolls the page), tap a city to pick it. It only
  draws while something moves, so it costs nothing when it's still.
*/

export type GlobeDot = {
  id: string;
  latitude: number;
  longitude: number;
  /** day, in golden hour (sun about to set), night, or the viewer */
  tone: "day" | "setting" | "night" | "you";
};

type Place = { latitude: number; longitude: number };
type View = { yaw: number; tilt: number };
type Motion = {
  yaw: number;
  tilt: number;
  placed: boolean;
  seen: boolean;
  still: boolean;
  dragging: boolean;
  velocity: number; // radians per ms, after a fling
  last: number;
  target: View | null;
  tween: null | { from: View; to: View; start: number; duration: number };
};

/** Start turning towards the waiting target. */
function tweenToTarget(m: Motion, duration: number) {
  if (!m.target) return;
  m.velocity = 0;
  m.tween = { from: { yaw: m.yaw, tilt: m.tilt }, to: m.target, start: performance.now(), duration: m.still ? 1 : duration };
  m.target = null;
}

const RAD = Math.PI / 180;
const MAX_TILT = 60 * RAD;
// The real sunset line: the sun's centre 0.833° below the horizon.
const SUNSET_SEAM = Math.sin(-0.833 * RAD);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrap = (a: number) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

/** Same mapping as the equirectangular Earth texture on a three.js sphere. */
function toVector(latitude: number, longitude: number, radius = 1, out = new THREE.Vector3()) {
  const phi = (90 - latitude) * RAD;
  const theta = (longitude + 180) * RAD;
  return out.set(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/** Globe rotation that puts a place in the middle, north up. */
const viewOf = ({ latitude, longitude }: Place): View => ({
  yaw: -Math.PI / 2 - longitude * RAD,
  tilt: clamp(latitude * RAD, -MAX_TILT, MAX_TILT),
});

/** Cities fade out as they turn towards the edge, instead of hanging off it. */
function fadeEdgeDots(globe: THREE.Group, at: THREE.Vector3) {
  for (const dot of globe.children) {
    if (!dot.userData.dot) continue;
    dot.getWorldPosition(at);
    const fade = clamp((at.z / at.length() - 0.15) / 0.2, 0, 1);
    dot.visible = fade > 0;
    for (const sprite of dot.children as THREE.Sprite[]) sprite.material.opacity = sprite.userData.opacity * fade;
  }
}

function spriteTexture(draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  draw(canvas.getContext("2d")!, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A solid dot with a soft edge, and a thin ring for the picked city.
const dotTexture = () =>
  spriteTexture((g, s) => {
    const r = s / 2;
    const fill = g.createRadialGradient(r, r, 0, r, r, r);
    fill.addColorStop(0, "rgba(255,255,255,1)");
    fill.addColorStop(0.3, "rgba(255,255,255,1)");
    fill.addColorStop(0.4, "rgba(255,255,255,0.35)");
    fill.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = fill;
    g.fillRect(0, 0, s, s);
  });
const ringTexture = () =>
  spriteTexture((g, s) => {
    g.strokeStyle = "#fff";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2);
    g.stroke();
  });

const TONES = {
  day: { color: "#ffffff", opacity: 0.95 },
  setting: { color: "#ffc46b", opacity: 1 },
  night: { color: "#ffe2b8", opacity: 0.6 },
  you: { color: "#ffffff", opacity: 1 },
} as const;

type Props = {
  dots: GlobeDot[];
  sun: Place;
  selected: GlobeDot | null;
  /** Goes up each time a city is picked, so picking it again re-centres it. */
  focus: number;
  /** Where the picked city is on the canvas (px), to put its label there. */
  onLabel: (x: number, y: number, visible: boolean) => void;
  onPick: (id: string) => void;
  /** The viewer turned the globe themselves. */
  onTurn: () => void;
  onReady: () => void;
};

function Earth({ dots, sun, selected, focus, onLabel, onPick, onTurn, onReady }: Props) {
  const [day, night] = useTexture(["/textures/earth-day.jpg", "/textures/earth-night.jpg"], (textures) => {
    for (const t of textures) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    }
  });
  const material = useMemo(
    () =>
      createDayNightMaterial({
        day,
        night,
        sunDirection: [1, 0, 0],
        terminatorColor: "#ff7a3d",
        sunSpace: "object",
        seam: SUNSET_SEAM,
        // Seen face-on the line is much wider than on the intro's crescent:
        // keep it a fine bright line with a faint glow around it.
        seamWidth: 0.01,
        seamStrength: 0.6,
        seamHalo: 0.22,
      }),
    [day, night],
  );
  const textures = useMemo(() => ({ dot: dotTexture(), ring: ringTexture() }), []);
  const globe = useRef<THREE.Group>(null);
  const { camera, gl, size, invalidate } = useThree();

  // Everything about how the globe is turning lives here, outside React.
  const motion = useRef<Motion>({
    yaw: 0,
    tilt: 0,
    placed: false,
    seen: false,
    still: false,
    dragging: false,
    velocity: 0,
    last: 0,
    target: null,
    tween: null,
  });

  // The latest props, for the pointer handlers and the frame loop.
  const latest = useRef({ dots, selected, onPick, onTurn, onLabel });
  useEffect(() => {
    latest.current = { dots, selected, onPick, onTurn, onLabel };
    invalidate();
  }, [dots, selected, onPick, onTurn, onLabel, invalidate]);

  useEffect(() => {
    onReady();
  }, [onReady]);

  useEffect(
    () => () => {
      material.dispose();
      textures.dot.dispose();
      textures.ring.dispose();
    },
    [material, textures],
  );

  // The sun, where it really is right now.
  useEffect(() => {
    toVector(sun.latitude, sun.longitude, 1, material.uniforms.sunDirection.value);
    invalidate();
  }, [material, sun.latitude, sun.longitude, invalidate]);

  // Turn to the picked city. The first time, swing in from the west once
  // the globe scrolls into view.
  const pickedId = selected?.id;
  const pickedLat = selected?.latitude;
  const pickedLng = selected?.longitude;
  useEffect(() => {
    if (pickedLat === undefined || pickedLng === undefined) return;
    const m = motion.current;
    const to = viewOf({ latitude: pickedLat, longitude: pickedLng });
    if (!m.placed) {
      m.still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      m.yaw = to.yaw - (m.still ? 0 : 1.4);
      m.tilt = to.tilt;
      m.placed = true;
    }
    to.yaw = m.yaw + wrap(to.yaw - m.yaw);
    m.target = to;
    if (m.seen) tweenToTarget(m, 1000);
    invalidate();
  }, [pickedId, pickedLat, pickedLng, focus, invalidate]);

  useEffect(() => {
    const seen = new IntersectionObserver(
      ([entry]) => {
        const m = motion.current;
        if (!entry.isIntersecting || m.seen) return;
        m.seen = true;
        tweenToTarget(m, 1800);
        invalidate();
      },
      { threshold: 0.4 },
    );
    seen.observe(gl.domElement);
    return () => seen.disconnect();
  }, [gl, invalidate]);

  // Drag sideways to turn (and tilt, once you're dragging), tap to pick.
  useEffect(() => {
    const el = gl.domElement;
    const m = motion.current;
    let drag: null | { id: number; x: number; y: number; yaw: number; tilt: number; moved: boolean; px: number; pt: number } =
      null;

    const down = (e: PointerEvent) => {
      if (!e.isPrimary || drag) return;
      // A finger on the globe stops a coasting spin.
      m.velocity = 0;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw: m.yaw, tilt: m.tilt, moved: false, px: e.clientX, pt: e.timeStamp };
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved) {
        // Only a sideways drag turns the globe. Up and down belongs to the
        // page scroll, and small wobbles still count as a tap.
        const slop = e.pointerType === "touch" ? 12 : 6;
        if (Math.abs(dy) >= slop && Math.abs(dy) >= Math.abs(dx)) {
          drag = null;
          return;
        }
        if (Math.abs(dx) < slop) return;
        drag.moved = true;
        drag.yaw = m.yaw; // pick up from wherever an animation left it
        drag.tilt = m.tilt;
        drag.x = e.clientX;
        drag.y = e.clientY;
        m.tween = null;
        m.target = null;
        m.velocity = 0;
        m.dragging = true;
        el.setPointerCapture(e.pointerId);
        latest.current.onTurn();
        return;
      }
      const k = Math.PI / el.clientWidth; // a full-width drag turns it half way round
      m.yaw = drag.yaw + dx * k;
      m.tilt = clamp(drag.tilt + dy * k, -MAX_TILT, MAX_TILT);
      const dt = Math.max(e.timeStamp - drag.pt, 1);
      m.velocity = 0.7 * m.velocity + 0.3 * (((e.clientX - drag.px) * k) / dt);
      drag.px = e.clientX;
      drag.pt = e.timeStamp;
      invalidate();
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.moved) {
        // Keep spinning a little after a fling, unless the finger stopped
        // first or the phone asks for less motion.
        const still = e.timeStamp - drag.pt > 80 || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        m.velocity = still ? 0 : clamp(m.velocity * 0.6, -0.006, 0.006);
        m.last = performance.now();
      } else {
        pick(e.clientX, e.clientY);
      }
      m.dragging = false;
      drag = null;
      invalidate();
    };
    const cancel = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      m.dragging = false;
      drag = null;
      invalidate();
    };

    // The nearest visible city within a fingertip of the tap.
    const at = new THREE.Vector3();
    const pick = (clientX: number, clientY: number) => {
      const group = globe.current;
      if (!group) return;
      const rect = el.getBoundingClientRect();
      let best: string | null = null;
      let bestDistance = 28;
      for (const dot of latest.current.dots) {
        toVector(dot.latitude, dot.longitude, 1, at).applyMatrix4(group.matrixWorld);
        if (at.z < 0.3) continue; // on the far side
        at.project(camera);
        const x = rect.left + ((at.x + 1) / 2) * rect.width;
        const y = rect.top + ((1 - at.y) / 2) * rect.height;
        const distance = Math.hypot(x - clientX, y - clientY);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = dot.id;
        }
      }
      if (best) latest.current.onPick(best);
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
    };
  }, [gl, camera, invalidate]);

  const labelAt = useMemo(() => new THREE.Vector3(), []);
  const dotAt = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const group = globe.current;
    if (!group) return;
    const m = motion.current;
    const now = performance.now();
    let moving = false;
    if (m.tween) {
      const { from, to, start, duration } = m.tween;
      const t = clamp((now - start) / duration, 0, 1);
      const e = 1 - Math.pow(1 - t, 3);
      m.yaw = from.yaw + (to.yaw - from.yaw) * e;
      m.tilt = from.tilt + (to.tilt - from.tilt) * e;
      if (t < 1) moving = true;
      else m.tween = null;
    } else if (!m.dragging && Math.abs(m.velocity) > 1e-5) {
      const dt = Math.min(now - m.last, 64);
      m.yaw += m.velocity * dt;
      m.velocity *= Math.exp(-dt / 220);
      moving = true;
    }
    m.last = now;
    group.rotation.set(m.tilt, m.yaw, 0);
    group.updateMatrixWorld();

    fadeEdgeDots(group, dotAt);

    // Keep the label on the picked city, hidden when it's round the back.
    const picked = latest.current.selected;
    if (picked) {
      toVector(picked.latitude, picked.longitude, 1, labelAt).applyMatrix4(group.matrixWorld);
      const facing = labelAt.z;
      labelAt.project(camera);
      latest.current.onLabel(((labelAt.x + 1) / 2) * size.width, ((1 - labelAt.y) / 2) * size.height, facing > 0.35);
    }
    if (moving) invalidate();
  });

  return (
    <group ref={globe}>
      <mesh material={material}>
        <sphereGeometry args={[1, 96, 64]} />
      </mesh>
      {dots.map((dot) => {
        const tone = TONES[dot.tone];
        const position = toVector(dot.latitude, dot.longitude, 1.012);
        return (
          <group key={dot.id} position={position} userData={{ dot: true }}>
            {dot.tone === "setting" && (
              <sprite scale={0.16} renderOrder={1} userData={{ opacity: 0.45 }}>
                <spriteMaterial map={textures.dot} color="#ff7a3d" opacity={0.45} transparent depthWrite={false} toneMapped={false} />
              </sprite>
            )}
            <sprite scale={dot.tone === "you" ? 0.06 : 0.05} renderOrder={2} userData={{ opacity: tone.opacity }}>
              <spriteMaterial map={textures.dot} color={tone.color} opacity={tone.opacity} transparent depthWrite={false} toneMapped={false} />
            </sprite>
            {(dot.tone === "you" || dot.id === selected?.id) && (
              <sprite scale={dot.id === selected?.id ? 0.13 : 0.09} renderOrder={3} userData={{ opacity: 1 }}>
                <spriteMaterial
                  map={textures.ring}
                  color={dot.id === selected?.id ? "#ffffff" : "#ffc46b"}
                  transparent
                  depthWrite={false}
                  toneMapped={false}
                />
              </sprite>
            )}
          </group>
        );
      })}
    </group>
  );
}

export function WorldGlobe(props: Props) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: 30, position: [0, 0, 4.3], near: 0.1, far: 20 }}
      style={{ touchAction: "pan-y" }}
    >
      <Suspense fallback={null}>
        <Earth {...props} />
      </Suspense>
    </Canvas>
  );
}
