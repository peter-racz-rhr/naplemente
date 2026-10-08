"use client";

import { useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { createSun } from "@/components/sun-model";
import { createDayNightMaterial } from "@/components/ui/3d-globe";

/*
  The Earth with the real sun on it: the glowing line is where the sun is
  setting right now, and it moves as the minutes pass. Drag to turn it (the
  page scrolls from outside the globe), pinch to zoom, tap a city to pick
  it. The sun itself hangs out in space in its real direction, so turning the
  night side towards you shows it behind the Earth. It only draws while
  something moves, so it costs nothing when it's still.
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
  distance: number; // camera distance from the Earth's centre, in Earth radii
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
const REST_DISTANCE = 4.3;
const MIN_DISTANCE = 1.6;
const MAX_DISTANCE = 13;
// Closer than this, swap in the sharper 4K maps, and name every city.
const SHARP_AT = 3.2;
const NAMES_AT = 2.9;
// Not to scale (the real sun is 23,000 Earth radii away), just far enough to
// sit behind the Earth when you look at the night side.
const SUN_DISTANCE = 24;
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

/**
 * Cities fade out as they turn towards the edge, instead of hanging off it,
 * and keep about the same size on screen as you zoom.
 */
function fadeEdgeDots(globe: THREE.Group, at: THREE.Vector3, distance: number) {
  const scale = Math.pow((distance - 1) / (REST_DISTANCE - 1), 0.7);
  for (const dot of globe.children) {
    if (!dot.userData.dot) continue;
    dot.getWorldPosition(at);
    const fade = clamp((at.z / at.length() - 1 / distance - 0.02) / 0.15, 0, 1);
    dot.visible = fade > 0;
    dot.scale.setScalar(scale);
    for (const sprite of dot.children as THREE.Sprite[]) sprite.material.opacity = sprite.userData.opacity * fade;
  }
}

/** The sun far out along its real direction, always facing the camera. */
function placeSun(sun: THREE.Object3D, globe: THREE.Group, direction: THREE.Vector3) {
  sun.position.copy(direction).multiplyScalar(SUN_DISTANCE);
  sun.scale.setScalar(0.75);
  sun.quaternion.copy(globe.quaternion).invert();
}

function setMaps(material: THREE.ShaderMaterial, day: THREE.Texture, night: THREE.Texture) {
  material.uniforms.dayMap.value = day;
  material.uniforms.nightMap.value = night;
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
  /** Where a city's label goes on the canvas (px), and how visible it is (0–1). */
  onLabel: (id: string, x: number, y: number, opacity: number) => void;
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
  const sunModel = useMemo(() => createSun(0, { occludable: true }), []);
  const [sharp, setSharp] = useState(false);
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
    distance: REST_DISTANCE,
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
      sunModel.dispose();
    },
    [material, textures, sunModel],
  );

  // Zoomed in, the 2K maps go soft: load the 4K ones once, in the background.
  useEffect(() => {
    if (!sharp) return;
    let alive = true;
    const loader = new THREE.TextureLoader();
    const load = (url: string) =>
      loader.loadAsync(url).then((t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
        return t;
      });
    let loaded: THREE.Texture[] = [];
    void Promise.all([load("/textures/earth-day-4k.jpg"), load("/textures/earth-night-4k.jpg")])
      .then(([day4k, night4k]) => {
        loaded = [day4k, night4k];
        if (!alive) return;
        setMaps(material, day4k, night4k);
        invalidate();
      })
      .catch(() => {});
    return () => {
      alive = false;
      setMaps(material, day, night);
      for (const t of loaded) t.dispose();
    };
  }, [sharp, material, day, night, gl, invalidate]);

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
    // Fingers on the globe, for pinch-to-zoom.
    const fingers = new Map<number, { x: number; y: number }>();
    let pinch: null | { gap: number; distance: number } = null;
    let askedSharp = false;
    const gap = () => {
      const [a, b] = [...fingers.values()];
      return Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1);
    };
    const zoomTo = (distance: number) => {
      m.distance = clamp(distance, MIN_DISTANCE, MAX_DISTANCE);
      if (m.distance < SHARP_AT && !askedSharp) {
        askedSharp = true;
        setSharp(true);
      }
      invalidate();
    };

    const down = (e: PointerEvent) => {
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 2) {
        // A second finger: stop turning, start zooming.
        drag = null;
        m.dragging = false;
        m.tween = null;
        m.target = null;
        m.velocity = 0;
        pinch = { gap: gap(), distance: m.distance };
        latest.current.onTurn();
        return;
      }
      if (!e.isPrimary || drag) return;
      // A finger on the globe stops a coasting spin.
      m.velocity = 0;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw: m.yaw, tilt: m.tilt, moved: false, px: e.clientX, pt: e.timeStamp };
    };
    const move = (e: PointerEvent) => {
      if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && fingers.size >= 2) {
        zoomTo((pinch.distance * pinch.gap) / gap());
        return;
      }
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved) {
        // The globe owns every touch on it: any drag turns it (sideways
        // spins, up and down tilts). Small wobbles still count as a tap.
        const slop = e.pointerType === "touch" ? 12 : 6;
        if (Math.hypot(dx, dy) < slop) return;
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
      // A full-width drag turns it half way round; less when zoomed in.
      const k = (Math.PI / el.clientWidth) * clamp((m.distance - 1) / (REST_DISTANCE - 1), 0.15, 1.2);
      m.yaw = drag.yaw + dx * k;
      m.tilt = clamp(drag.tilt + dy * k, -MAX_TILT, MAX_TILT);
      const dt = Math.max(e.timeStamp - drag.pt, 1);
      m.velocity = 0.7 * m.velocity + 0.3 * (((e.clientX - drag.px) * k) / dt);
      drag.px = e.clientX;
      drag.pt = e.timeStamp;
      invalidate();
    };
    const lift = (e: PointerEvent) => {
      fingers.delete(e.pointerId);
      if (fingers.size < 2) pinch = null;
    };
    const up = (e: PointerEvent) => {
      lift(e);
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
      lift(e);
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
        if (at.z < 1 / m.distance + 0.05) continue; // round the back
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

    // Trackpad pinch (and ctrl + wheel) zooms too; a plain wheel still scrolls the page.
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      zoomTo(m.distance * Math.exp(e.deltaY * 0.01));
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
    };
  }, [gl, camera, invalidate]);

  const labelAt = useMemo(() => new THREE.Vector3(), []);
  const dotAt = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
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
    camera.position.setZ(m.distance);
    group.rotation.set(m.tilt, m.yaw, 0);
    group.updateMatrixWorld();

    fadeEdgeDots(group, dotAt, m.distance);
    placeSun(sunModel.scene, group, material.uniforms.sunDirection.value);
    sunModel.update(Math.min(delta, 0.1));

    // Labels: the picked city always (unless it's round the back), the
    // others only once you've zoomed in.
    const names = clamp((NAMES_AT - m.distance) / 0.4, 0, 1);
    const { dots: all, selected: picked, onLabel: place } = latest.current;
    for (const dot of all) {
      const isPicked = dot.id === picked?.id;
      if (!isPicked && names === 0) {
        place(dot.id, 0, 0, 0);
        continue;
      }
      toVector(dot.latitude, dot.longitude, 1, labelAt).applyMatrix4(group.matrixWorld);
      const facing = clamp((labelAt.z - 1 / m.distance - 0.15) / 0.15, 0, 1);
      labelAt.project(camera);
      place(dot.id, ((labelAt.x + 1) / 2) * size.width, ((1 - labelAt.y) / 2) * size.height, isPicked ? facing : facing * names);
    }
    if (moving) invalidate();
  });

  return (
    <group ref={globe}>
      <mesh material={material}>
        <sphereGeometry args={[1, 128, 96]} />
      </mesh>
      <primitive object={sunModel.scene} />
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
      camera={{ fov: 30, position: [0, 0, REST_DISTANCE], near: 0.05, far: 200 }}
      style={{ touchAction: "none" }}
    >
      <Suspense fallback={null}>
        <Earth {...props} />
      </Suspense>
    </Canvas>
  );
}
