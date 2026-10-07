"use client";

import { Canvas } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { createSun, SUN_CANVAS_SCALE, type SunModel } from "./sun-model";

/*
  Real 3D sun and moon for the live sky. Each is its own small transparent
  canvas, positioned by the sky. The moon is a textured sphere lit from the
  sun's actual direction, so its phase is physically correct; the sun is a
  glowing, slowly boiling sphere (see sun-model.ts).
*/

const MOON_TEXTURE = "/textures/moon.jpg";

function MoonSphere({ phase, mirror }: { phase: number; mirror: boolean }) {
  const map = useTexture(MOON_TEXTURE, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  });

  // Where the sun is as seen from the moon: behind it at new moon (0),
  // to the side at the quarters, behind us at full moon (0.5).
  const angle = phase * Math.PI * 2;
  const light: [number, number, number] = [
    Math.sin(angle) * 5 * (mirror ? -1 : 1),
    0.6,
    -Math.cos(angle) * 5,
  ];

  return (
    <>
      {/* A whisper of earthshine on the dark side */}
      <ambientLight intensity={0.05} />
      <directionalLight position={light} intensity={4.2} />
      {/* Same face always toward us: the near side of the texture */}
      <mesh rotation={[0, -Math.PI / 2, 0]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={map} roughness={1} metalness={0} />
      </mesh>
    </>
  );
}

export function Moon3D({ phase, mirror, size }: { phase: number; mirror: boolean; size: number }) {
  return (
    <div style={{ width: size, height: size }}>
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0, 3.2], fov: 38 }}
      >
        <Suspense fallback={null}>
          <MoonSphere phase={phase} mirror={mirror} />
        </Suspense>
      </Canvas>
    </div>
  );
}

/** The sun, `disc` px across, with its glow drawn around it. */
export function Sun3D({ warmth, disc }: { warmth: number; disc: number }) {
  const box = useRef<HTMLDivElement>(null);
  const sun = useRef<{ model: SunModel; renderer: THREE.WebGLRenderer; draw: () => void } | null>(null);
  const size = Math.round(disc * SUN_CANVAS_SCALE);

  // One small renderer per sun. It animates at ~30 fps while it's on screen
  // and stops when it scrolls away (or for people who prefer less motion).
  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    box.current?.appendChild(renderer.domElement);

    const model = createSun(0);
    const draw = () => renderer.render(model.scene, model.camera);
    sun.current = { model, renderer, draw };

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last < 30) return;
      model.update(last ? Math.min((now - last) / 1000, 0.1) : 0);
      last = now;
      draw();
    };
    const seen = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      last = 0;
      if (entry.isIntersecting && !still) frame = requestAnimationFrame(tick);
    });
    seen.observe(renderer.domElement);

    return () => {
      cancelAnimationFrame(frame);
      seen.disconnect();
      model.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      sun.current = null;
    };
  }, []);

  useEffect(() => {
    sun.current?.renderer.setSize(size, size);
    sun.current?.draw();
  }, [size]);

  useEffect(() => {
    sun.current?.model.setWarmth(warmth);
    sun.current?.draw();
  }, [warmth]);

  return <div ref={box} style={{ width: size, height: size }} />;
}
