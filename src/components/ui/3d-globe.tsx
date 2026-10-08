"use client";
import React, { useRef, useMemo, useState, useCallback, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface GlobeMarker {
  lat: number;
  lng: number;
  src: string;
  label?: string;
  size?: number;
  /** Just a small glowing dot on the surface: no pin, no picture. */
  dot?: boolean;
}

export interface Globe3DConfig {
  /** Globe radius */
  radius?: number;
  /** Globe base color (used as fallback or tint) */
  globeColor?: string;
  /** URL to the Earth texture map */
  textureUrl?: string;
  /** URL to the bump/elevation map for terrain */
  bumpMapUrl?: string;
  /** Whether to show atmosphere glow */
  showAtmosphere?: boolean;
  /** Atmosphere color */
  atmosphereColor?: string;
  /** Atmosphere intensity */
  atmosphereIntensity?: number;
  /** Atmosphere blur/softness (higher = more diffuse, default 3) */
  atmosphereBlur?: number;
  /** Terrain bump scale (0 = flat, higher = more pronounced) */
  bumpScale?: number;
  /** Auto rotate speed (0 = disabled) */
  autoRotateSpeed?: number;
  /** Enable zoom */
  enableZoom?: boolean;
  /** Enable pan */
  enablePan?: boolean;
  /** Min zoom distance */
  minDistance?: number;
  /** Max zoom distance */
  maxDistance?: number;
  /** Initial rotation */
  initialRotation?: { x: number; y: number };
  /** Marker default size */
  markerSize?: number;
  /** Show wireframe overlay */
  showWireframe?: boolean;
  /** Wireframe color */
  wireframeColor?: string;
  /** Ambient light intensity */
  ambientIntensity?: number;
  /** Point light intensity */
  pointLightIntensity?: number;
  /** Background color (null for transparent) */
  backgroundColor?: string | null;
  /**
   * Night-side texture (city lights). When set, the globe is shaded with a
   * day side, a night side and a glowing sunset line between them.
   */
  nightTextureUrl?: string | null;
  /** Direction of the sun relative to the camera (view space) */
  sunDirection?: [number, number, number];
  /** Color of the glow along the day/night line */
  terminatorColor?: string;
  /**
   * Spin speed when the globe first appears; it eases down to
   * autoRotateSpeed over spinDownSeconds (0 = no intro spin).
   */
  introSpinSpeed?: number;
  spinDownSeconds?: number;
}

interface Globe3DProps {
  /** Array of markers to display on the globe */
  markers?: GlobeMarker[];
  /** Globe configuration */
  config?: Globe3DConfig;
  /** Additional CSS classes */
  className?: string;
  /** Callback when a marker is clicked */
  onMarkerClick?: (marker: GlobeMarker) => void;
  /** Callback when a marker is hovered */
  onMarkerHover?: (marker: GlobeMarker | null) => void;
  /** Called once the textures have loaded and the globe is on screen */
  onReady?: () => void;
  /** Stop spinning and glide in to centre this place (e.g. the viewer). */
  focus?: { lat: number; lng: number } | null;
}

// ============================================================================
// Constants - Earth Texture URLs (NASA Blue Marble)
// ============================================================================

const DEFAULT_EARTH_TEXTURE =
  "https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg";
const DEFAULT_BUMP_TEXTURE =
  "https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert latitude/longitude to 3D cartesian coordinates
 */
function latLngToVector3(
  lat: number,
  lng: number,
  radius: number,
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

// ============================================================================
// Marker Component (static - rotation handled by parent group)
// ============================================================================

interface MarkerProps {
  marker: GlobeMarker;
  radius: number;
  defaultSize: number;
  onClick?: (marker: GlobeMarker) => void;
  onHover?: (marker: GlobeMarker | null) => void;
}

function Marker({
  marker,
  radius,
  defaultSize,
  onClick,
  onHover,
}: MarkerProps) {
  const [hovered, setHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const groupRef = useRef<THREE.Group>(null);
  const imageGroupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Surface position (where the line starts)
  const surfacePosition = useMemo(() => {
    return latLngToVector3(marker.lat, marker.lng, radius * 1.001);
  }, [marker.lat, marker.lng, radius]);

  // Top of the line (where the image is) - positioned further out to prevent going inside globe
  const topPosition = useMemo(() => {
    return latLngToVector3(marker.lat, marker.lng, radius * 1.18);
  }, [marker.lat, marker.lng, radius]);

  const lineHeight = topPosition.distanceTo(surfacePosition);

  // Check if marker is facing the camera
  useFrame(() => {
    if (!imageGroupRef.current) return;

    // Get the world position of the image (the positioned element)
    const worldPos = new THREE.Vector3();
    imageGroupRef.current.getWorldPosition(worldPos);

    // Direction from globe center (0,0,0) to marker
    const markerDirection = worldPos.clone().normalize();

    // Direction from globe center to camera
    const cameraDirection = camera.position.clone().normalize();

    // Dot product: positive means facing camera, negative means behind
    const dot = markerDirection.dot(cameraDirection);

    // Show marker only if it's facing the camera (stricter threshold)
    setIsVisible(dot > 0.1);
  });

  const handlePointerEnter = useCallback(() => {
    setHovered(true);
    onHover?.(marker);
  }, [marker, onHover]);

  const handlePointerLeave = useCallback(() => {
    setHovered(false);
    onHover?.(null);
  }, [onHover]);

  const handleClick = useCallback(() => {
    onClick?.(marker);
  }, [marker, onClick]);

  // Calculate line center and orientation
  const { lineCenter, lineQuaternion } = useMemo(() => {
    const center = surfacePosition.clone().lerp(topPosition, 0.5);

    // Calculate rotation to align cylinder with the direction from surface to top
    const direction = topPosition.clone().sub(surfacePosition).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

    return { lineCenter: center, lineQuaternion: quaternion };
  }, [surfacePosition, topPosition]);

  return (
    <group ref={groupRef} visible={isVisible}>
      {/* Pin line from surface to image - properly oriented */}
      <mesh position={lineCenter} quaternion={lineQuaternion}>
        <cylinderGeometry args={[0.003, 0.003, lineHeight, 8]} />
        <meshBasicMaterial
          color={hovered ? "#ffffff" : "#f4efe9"}
          transparent
          opacity={hovered ? 0.9 : 0.45}
        />
      </mesh>

      {/* Pin point at the surface */}
      <mesh position={surfacePosition} quaternion={lineQuaternion}>
        <coneGeometry args={[0.015, 0.04, 8]} />
        <meshBasicMaterial color={hovered ? "#ffb54d" : "#ff7a3d"} />
      </mesh>

      {/* Circular image at the top */}
      <group ref={imageGroupRef} position={topPosition}>
        <Html
          transform
          center
          sprite
          distanceFactor={10}
          style={{
            pointerEvents: isVisible ? "auto" : "none",
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.15s ease-out",
          }}
        >
          <div
            className={cn(
              "cursor-pointer overflow-hidden rounded-full bg-neutral-900 shadow-lg transition-transform duration-200",
              hovered && "scale-125 shadow-xl ring-1 ring-white/50",
            )}
            style={{
              width: "4px",
              height: "4px",
            }}
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
            onClick={handleClick}
          >
            <img
              src={marker.src}
              alt={marker.label || "Marker"}
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
        </Html>
      </group>
    </group>
  );
}

/** A small dot sitting on the surface, for "you are here". */
function SurfaceDot({ marker, radius }: { marker: GlobeMarker; radius: number }) {
  const position = useMemo(
    () => latLngToVector3(marker.lat, marker.lng, radius * 1.004),
    [marker.lat, marker.lng, radius],
  );
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius * 0.024, 24, 16]} />
        <meshBasicMaterial color="#ffb54d" transparent opacity={0.35} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * 0.012, 24, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Rotating Globe with Markers (all rotate together)
// ============================================================================

interface RotatingGlobeProps {
  config: Required<Globe3DConfig>;
  markers: GlobeMarker[];
  onMarkerClick?: (marker: GlobeMarker) => void;
  onMarkerHover?: (marker: GlobeMarker | null) => void;
}

function RotatingGlobe({
  config,
  markers,
  onMarkerClick,
  onMarkerHover,
}: RotatingGlobeProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Load Earth textures (configured once, as they finish loading)
  const [earthTexture, bumpTexture, nightTexture] = useTexture(
    [
      config.textureUrl,
      config.bumpMapUrl,
      config.nightTextureUrl ?? config.textureUrl,
    ],
    ([earth, bump, night]) => {
      earth.colorSpace = THREE.SRGBColorSpace;
      earth.anisotropy = 16;
      bump.anisotropy = 8;
      night.colorSpace = THREE.SRGBColorSpace;
      night.anisotropy = 16;
    },
  );

  const dayNightMaterial = useMemo(() => {
    if (!config.nightTextureUrl) return null;
    return createDayNightMaterial({
      day: earthTexture,
      night: nightTexture,
      sunDirection: config.sunDirection,
      terminatorColor: config.terminatorColor,
    });
  }, [
    config.nightTextureUrl,
    config.sunDirection,
    config.terminatorColor,
    earthTexture,
    nightTexture,
  ]);

  // Create geometries
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(config.radius, 64, 64);
  }, [config.radius]);

  const wireframeGeometry = useMemo(() => {
    return new THREE.SphereGeometry(config.radius * 1.002, 32, 16);
  }, [config.radius]);

  return (
    <group ref={groupRef}>
      {/* Main globe mesh with Earth texture */}
      {dayNightMaterial ? (
        <mesh geometry={geometry}>
          <primitive object={dayNightMaterial} attach="material" />
        </mesh>
      ) : (
        <mesh geometry={geometry}>
          <meshStandardMaterial
            map={earthTexture}
            bumpMap={bumpTexture}
            bumpScale={config.bumpScale * 0.05}
            roughness={0.7}
            metalness={0.0}
          />
        </mesh>
      )}

      {/* Wireframe overlay */}
      {config.showWireframe && (
        <mesh geometry={wireframeGeometry}>
          <meshBasicMaterial
            color={config.wireframeColor}
            wireframe
            transparent
            opacity={0.08}
          />
        </mesh>
      )}

      {/* Markers - now inside the rotating group */}
      {markers.map((marker, index) =>
        marker.dot ? (
          <SurfaceDot key={`dot-${index}-${marker.lat}-${marker.lng}`} marker={marker} radius={config.radius} />
        ) : (
        <Marker
          key={`marker-${index}-${marker.lat}-${marker.lng}`}
          marker={marker}
          radius={config.radius}
          defaultSize={config.markerSize}
          onClick={onMarkerClick}
          onHover={onMarkerHover}
        />
        ),
      )}
    </group>
  );
}

// ============================================================================
// Day / night material with a glowing sunset line
// ============================================================================

/**
 * Day side, city lights on the night side, and a glowing sunset line between.
 * With sunSpace "view" the sun is fixed relative to the camera, so the sunset
 * line always stays in view while the Earth turns underneath it. With "object"
 * the sun is fixed to the Earth (a real sun position), so the line turns with it.
 */
export function createDayNightMaterial({
  day,
  night,
  sunDirection,
  terminatorColor,
  sunSpace = "view",
  seam = 0.02,
  seamWidth = 0.045,
  seamStrength = 1,
  seamHalo = 0,
}: {
  day: THREE.Texture;
  night: THREE.Texture;
  sunDirection: [number, number, number];
  terminatorColor: string;
  sunSpace?: "view" | "object";
  /** Where the glow peaks, as the sine of the sun's altitude there. */
  seam?: number;
  /** How wide and how bright the glow is, plus an optional soft halo around it. */
  seamWidth?: number;
  seamStrength?: number;
  seamHalo?: number;
}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      dayMap: { value: day },
      nightMap: { value: night },
      sunDirection: { value: new THREE.Vector3(...sunDirection).normalize() },
      terminatorColor: { value: new THREE.Color(terminatorColor) },
      seam: { value: seam },
      seamWidth: { value: seamWidth },
      seamStrength: { value: seamStrength },
      seamHalo: { value: seamHalo },
    },
    defines: sunSpace === "object" ? { SUN_IN_OBJECT: "" } : {},
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vNormalObject;
      varying vec3 vViewPosition;
      void main() {
        vUv = uv;
        vNormalView = normalize(normalMatrix * normal);
        vNormalObject = normal;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D dayMap;
      uniform sampler2D nightMap;
      uniform vec3 sunDirection;
      uniform vec3 terminatorColor;
      uniform float seam;
      uniform float seamWidth;
      uniform float seamStrength;
      uniform float seamHalo;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vNormalObject;
      varying vec3 vViewPosition;

      void main() {
        vec3 normal = normalize(vNormalView);
        #ifdef SUN_IN_OBJECT
          float sun = dot(normalize(vNormalObject), sunDirection);
        #else
          float sun = dot(normal, sunDirection);
        #endif

        vec3 dayColor = texture2D(dayMap, vUv).rgb;
        vec3 nightColor = texture2D(nightMap, vUv).rgb * 1.6;

        // Soft daylight falloff, then blend to city lights.
        float daylight = smoothstep(-0.08, 0.22, sun);
        vec3 lit = dayColor * (0.55 + 0.85 * max(sun, 0.0));
        vec3 color = mix(nightColor, lit, daylight);

        // Late-afternoon warmth on the day side close to the line.
        // With a real sun, only the evening half of the line is a sunset:
        // the morning half (sunrise) stays plain.
        #ifdef SUN_IN_OBJECT
          vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), sunDirection));
          float evening = smoothstep(-0.03, 0.03, dot(normalize(vNormalObject), east));
        #else
          float evening = 1.0;
        #endif

        float lateLight = smoothstep(0.45, 0.0, sun) * daylight * evening;
        color = mix(color, color * vec3(1.5, 0.95, 0.6), lateLight * 0.8);

        // The sunset line itself: a narrow warm seam, brightest where it
        // meets the day side so it reads as light, not paint.
        float band = exp(-pow((sun - seam) / seamWidth, 2.0))
          + seamHalo * exp(-pow((sun - seam) / (seamWidth * 5.0), 2.0));
        band *= evening;
        color += terminatorColor * band * seamStrength * (0.35 + 0.9 * dayColor.g);

        // Thin atmosphere on the rim, warm where the sun is setting.
        vec3 viewDir = normalize(-vViewPosition);
        float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.6);
        vec3 rimColor = mix(vec3(0.35, 0.55, 1.0), terminatorColor, band + (1.0 - daylight) * 0.4);
        color += rimColor * rim * smoothstep(-0.35, 0.25, sun) * 0.8;

        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

// ============================================================================
// Atmosphere Component (stays static - doesn't rotate)
// ============================================================================

interface AtmosphereProps {
  radius: number;
  color: string;
  intensity: number;
  blur: number;
}

function Atmosphere({ radius, color, intensity, blur }: AtmosphereProps) {
  // blur controls the fresnel exponent: lower = more diffuse, higher = sharper edge
  // We invert it so higher blur value = more diffuse (lower exponent)
  const fresnelPower = Math.max(0.5, 5 - blur);

  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        atmosphereColor: { value: new THREE.Color(color) },
        intensity: { value: intensity },
        fresnelPower: { value: fresnelPower },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 atmosphereColor;
        uniform float intensity;
        uniform float fresnelPower;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, normalize(-vPosition))), fresnelPower);
          gl_FragColor = vec4(atmosphereColor, fresnel * intensity);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
  }, [color, intensity, fresnelPower]);

  return (
    <mesh scale={[1.12, 1.12, 1.12]}>
      <sphereGeometry args={[radius, 64, 32]} />
      <primitive object={atmosphereMaterial} attach="material" />
    </mesh>
  );
}

// ============================================================================
// Scene Component
// ============================================================================

interface SceneProps {
  focus?: { lat: number; lng: number } | null;
  markers: GlobeMarker[];
  config: Required<Globe3DConfig>;
  onMarkerClick?: (marker: GlobeMarker) => void;
  onMarkerHover?: (marker: GlobeMarker | null) => void;
  onReady?: () => void;
}

function Scene({
  focus,
  markers,
  config,
  onMarkerClick,
  onMarkerHover,
  onReady,
}: SceneProps) {
  const { camera } = useThree();

  // Scene only commits after the textures inside it have resolved.
  React.useEffect(() => {
    onReady?.();
  }, [onReady]);

  // Intro spin: start fast, ease out to the resting speed.
  const spinStart = useRef<number | null>(null);
  useFrame((state) => {
    const controls = state.controls as { autoRotateSpeed: number } | null;
    if (!controls || config.introSpinSpeed <= 0) return;
    const elapsed = state.clock.elapsedTime;
    if (spinStart.current === null) spinStart.current = elapsed;
    const t = Math.min((elapsed - spinStart.current) / config.spinDownSeconds, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    controls.autoRotateSpeed =
      config.introSpinSpeed +
      (config.autoRotateSpeed - config.introSpinSpeed) * eased;
  });

  // Glide in to a place: the camera swings round to face it and moves
  // closer, easing in and out, and the spin stops.
  const glide = useRef<{ from: THREE.Vector3; to: THREE.Vector3; start: number | null } | null>(null);
  const focusLat = focus?.lat;
  const focusLng = focus?.lng;
  React.useEffect(() => {
    if (focusLat === undefined || focusLng === undefined) return;
    glide.current = {
      from: new THREE.Vector3(),
      to: latLngToVector3(focusLat, focusLng, config.radius * 2.75),
      start: null,
    };
  }, [focusLat, focusLng, config.radius]);

  useFrame((state) => {
    const g = glide.current;
    if (!g) return;
    const controls = state.controls as { autoRotate: boolean; update: () => void } | null;
    if (controls) controls.autoRotate = false;
    const now = state.clock.elapsedTime;
    if (g.start === null) {
      g.start = now;
      g.from.copy(state.camera.position);
    }
    const t = Math.min((now - g.start) / 2.2, 1);
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    // Swing along the sphere (not through it) while closing the distance.
    const distance = g.from.length() + (g.to.length() - g.from.length()) * e;
    const dir = g.from.clone().normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(dir, g.to.clone().normalize());
    const partial = new THREE.Quaternion().slerp(quat, e);
    state.camera.position.copy(dir.applyQuaternion(partial).multiplyScalar(distance));
    state.camera.lookAt(0, 0, 0);
    controls?.update();
    if (t >= 1) glide.current = null;
  });

  // Set initial camera position (pulled back to accommodate markers)
  React.useEffect(() => {
    camera.position.set(0, 0, config.radius * 3.5);
    camera.lookAt(0, 0, 0);
  }, [camera, config.radius]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={config.ambientIntensity} />
      <directionalLight
        position={[config.radius * 5, config.radius * 2, config.radius * 5]}
        intensity={config.pointLightIntensity}
        color="#ffffff"
      />
      <directionalLight
        position={[-config.radius * 3, config.radius, -config.radius * 2]}
        intensity={config.pointLightIntensity * 0.3}
        color="#88ccff"
      />

      {/* Rotating Globe with Markers */}
      <RotatingGlobe
        config={config}
        markers={markers}
        onMarkerClick={onMarkerClick}
        onMarkerHover={onMarkerHover}
      />

      {/* Atmosphere (static) */}
      {config.showAtmosphere && (
        <Atmosphere
          radius={config.radius}
          color={config.atmosphereColor}
          intensity={config.atmosphereIntensity}
          blur={config.atmosphereBlur}
        />
      )}

      {/* Controls */}
      <OrbitControls
        makeDefault
        enablePan={config.enablePan}
        enableZoom={config.enableZoom}
        minDistance={config.minDistance}
        maxDistance={config.maxDistance}
        rotateSpeed={0.4}
        autoRotate={!focus && config.autoRotateSpeed > 0}
        autoRotateSpeed={config.autoRotateSpeed}
        enableDamping
        dampingFactor={0.1}
      />
    </>
  );
}

// ============================================================================
// Loading Fallback
// ============================================================================

// The globe fades in once its textures are ready; until then the sky stays empty.
function LoadingFallback() {
  return null;
}

// ============================================================================
// Main Globe3D Component
// ============================================================================

const defaultConfig: Required<Globe3DConfig> = {
  radius: 2,
  globeColor: "#1a1a2e",
  textureUrl: DEFAULT_EARTH_TEXTURE,
  bumpMapUrl: DEFAULT_BUMP_TEXTURE,
  showAtmosphere: false,
  atmosphereColor: "#4da6ff",
  atmosphereIntensity: 0.5,
  atmosphereBlur: 2,
  bumpScale: 1,
  autoRotateSpeed: 0.3,
  enableZoom: false,
  enablePan: false,
  minDistance: 5,
  maxDistance: 15,
  initialRotation: { x: 0, y: 0 },
  markerSize: 0.06,
  showWireframe: false,
  wireframeColor: "#4a9eff",
  ambientIntensity: 0.6,
  pointLightIntensity: 1.5,
  backgroundColor: null,
  nightTextureUrl: null,
  sunDirection: [1, 0.25, 0.2],
  terminatorColor: "#ff7a3d",
  introSpinSpeed: 0,
  spinDownSeconds: 3,
};

export function Globe3D({
  markers = [],
  config = {},
  className,
  onMarkerClick,
  onMarkerHover,
  onReady,
  focus,
}: Globe3DProps) {
  const mergedConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [config],
  );

  return (
    <div className={cn("relative h-[500px] w-full", className)}>
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
        camera={{
          fov: 45,
          near: 0.1,
          far: 1000,
          position: [0, 0, mergedConfig.radius * 3.5],
        }}
        style={{
          background: mergedConfig.backgroundColor || "transparent",
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Scene
            focus={focus}
            markers={markers}
            config={mergedConfig}
            onMarkerClick={onMarkerClick}
            onMarkerHover={onMarkerHover}
            onReady={onReady}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default Globe3D;
