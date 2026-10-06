"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/*
  Real 3D sun and moon for the live sky. Each is its own small transparent
  canvas, positioned by the sky. The moon is a textured sphere lit from the
  sun's actual direction, so its phase is physically correct; the sun is a
  sphere with a slowly churning surface shader.
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

const sunVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sunFragment = /* glsl */ `
  uniform float time;
  uniform vec3 hot;
  uniform vec3 cool;
  varying vec3 vNormal;
  varying vec3 vPos;

  // Small 3D value noise, layered for a granular, boiling surface.
  float hash(vec3 p) { return fract(sin(dot(p, vec3(17.1, 113.7, 271.3))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
    return v;
  }

  void main() {
    float n = fbm(vPos * 4.0 + vec3(time * 0.06, time * 0.04, -time * 0.05));
    float granules = fbm(vPos * 11.0 - time * 0.12);
    // Limb darkening: the edge of the disc is cooler and dimmer.
    float facing = max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0);
    float limb = pow(facing, 0.45);
    vec3 color = mix(cool, hot, limb);
    color *= 0.82 + 0.3 * n + 0.12 * granules;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function SunSphere({ warmth }: { warmth: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      hot: { value: new THREE.Color() },
      cool: { value: new THREE.Color() },
    }),
    [],
  );

  // White-gold high in the sky, deep orange near the horizon.
  useEffect(() => {
    const m = material.current;
    if (!m) return;
    m.uniforms.hot.value.set("#fff6e0").lerp(new THREE.Color("#ffd08a"), warmth);
    m.uniforms.cool.value.set("#ffb347").lerp(new THREE.Color("#ff6a3d"), warmth);
  }, [warmth]);

  useFrame((_, delta) => {
    if (material.current) material.current.uniforms.time.value += delta;
    if (mesh.current) mesh.current.rotation.y += delta * 0.03;
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={sunVertex}
        fragmentShader={sunFragment}
      />
    </mesh>
  );
}

export function Sun3D({ warmth, size }: { warmth: number; size: number }) {
  return (
    <div style={{ width: size, height: size }}>
      <Canvas dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0, 3.2], fov: 38 }}>
        <SunSphere warmth={warmth} />
      </Canvas>
    </div>
  );
}
