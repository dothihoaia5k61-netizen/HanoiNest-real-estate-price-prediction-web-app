import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Grid, Line, RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type SilverSceneProps = {
  progress: number;
  dataSignal: number;
  modelGap: number | null;
};

type ModuleProps = {
  index: number;
  count: number;
  progress: number;
  dataSignal: number;
};

const silver = new THREE.Color("#d6dde4");
const graphite = new THREE.Color("#303b43");
const cyan = new THREE.Color("#25b8c7");
const coral = new THREE.Color("#ff755f");

function ease(value: number) {
  return value * value * (3 - 2 * value);
}

function phase(value: number, start: number, end: number) {
  return ease(THREE.MathUtils.clamp((value - start) / (end - start), 0, 1));
}

function ArchitectureModule({ index, count, progress, dataSignal }: ModuleProps) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(() => {
    const accent = index % 9 === 0 ? cyan : index % 13 === 0 ? coral : silver;
    return new THREE.MeshPhysicalMaterial({
      color: accent,
      metalness: index % 9 === 0 || index % 13 === 0 ? 0.68 : 0.9,
      roughness: 0.2,
      clearcoat: 0.72,
      clearcoatRoughness: 0.16,
    });
  }, [index]);

  const architecture = useMemo(() => {
    const column = index % 7;
    const row = Math.floor(index / 7);
    return new THREE.Vector3(
      (column - 3) * 0.72,
      (row - 1.5) * 0.72,
      column % 2 === 0 ? 0.3 : -0.3,
    );
  }, [index]);

  const ring = useMemo(() => {
    const angle = (index / count) * Math.PI * 2;
    const radius = 2.25 + (index % 3) * 0.36;
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      ((index % 6) - 2.5) * 0.35,
      Math.sin(angle) * radius,
    );
  }, [count, index]);

  const bars = useMemo(() => {
    const column = index % 7;
    const row = Math.floor(index / 7);
    return new THREE.Vector3((column - 3) * 0.76, -1.6, (row - 1.5) * 0.82);
  }, [index]);

  useFrame((state, delta) => {
    if (!ref.current) return;

    const toRing = phase(progress, 0.18, 0.56);
    const toBars = phase(progress, 0.58, 0.94);
    const target = architecture
      .clone()
      .lerp(ring, toRing)
      .lerp(bars, toBars);

    ref.current.position.lerp(target, 1 - Math.exp(-delta * 6));

    const barHeight = 0.7 + ((index * 17 + dataSignal) % 10) * 0.22;
    const baseScale = new THREE.Vector3(0.6, 0.48, 0.6);
    const architectureScale = new THREE.Vector3(
      index % 4 === 0 ? 1.35 : 0.76,
      index % 5 === 0 ? 0.35 : 0.68,
      index % 3 === 0 ? 1.8 : 0.74,
    );
    const ringScale = new THREE.Vector3(0.22, 0.22, 0.86);
    const barScale = new THREE.Vector3(0.48, barHeight, 0.48);
    const targetScale = baseScale
      .clone()
      .multiply(architectureScale)
      .lerp(ringScale, toRing)
      .lerp(barScale, toBars);

    ref.current.scale.lerp(targetScale, 1 - Math.exp(-delta * 6));
    const ringRotation = THREE.MathUtils.lerp(0, Math.PI * 0.5, toRing);
    ref.current.rotation.x = THREE.MathUtils.lerp(ringRotation, 0, toBars);
    ref.current.rotation.y =
      state.clock.elapsedTime * (index % 2 === 0 ? 0.04 : -0.035) * (1 - toBars);
  });

  return (
    <mesh ref={ref} material={material} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
  );
}

function SceneContent({ progress, dataSignal, modelGap }: SilverSceneProps) {
  const root = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Group>(null);
  const { camera, pointer } = useThree();
  const moduleCount = 28;
  const linePoints = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => {
        const angle = (index / 33) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle) * 3.6, 0, Math.sin(angle) * 3.6);
      }),
    [],
  );

  useFrame((state, delta) => {
    const first = phase(progress, 0, 0.5);
    const second = phase(progress, 0.5, 1);
    const cameraTarget = new THREE.Vector3(
      THREE.MathUtils.lerp(5.8, 1.2, first) - second * 4.4,
      THREE.MathUtils.lerp(3.8, 2.35, first) + second * 0.8,
      THREE.MathUtils.lerp(8.2, 6.3, first) + second * 0.5,
    );
    cameraTarget.x += pointer.x * 0.3;
    cameraTarget.y += pointer.y * 0.18;
    camera.position.lerp(cameraTarget, 1 - Math.exp(-delta * 3.6));
    camera.lookAt(0, -0.15, 0);

    if (root.current) {
      root.current.rotation.y = state.clock.elapsedTime * 0.055 + progress * 0.9;
      root.current.rotation.x = THREE.MathUtils.lerp(0.08, -0.08, progress);
      root.current.position.x = THREE.MathUtils.lerp(
        0,
        1.55,
        phase(progress, 0.22, 0.92),
      );
      root.current.position.y = THREE.MathUtils.lerp(0, 0.22, second);
    }

    if (halo.current) {
      halo.current.rotation.z = -state.clock.elapsedTime * 0.12;
      halo.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.015);
    }
  });

  const gapColor = modelGap !== null && Math.abs(modelGap) > 18 ? coral : cyan;

  return (
    <>
      <color attach="background" args={["#eef2f4"]} />
      <fog attach="fog" args={["#eef2f4", 8, 18]} />
      <ambientLight intensity={1.8} />
      <directionalLight
        castShadow
        intensity={3.8}
        position={[5, 8, 7]}
        color="#ffffff"
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight intensity={2.2} position={[-5, 2, 4]} color="#a9e8ef" />
      <pointLight intensity={18} position={[0, -1, 1]} color="#ffb3a4" distance={8} />

      <group ref={root}>
        {Array.from({ length: moduleCount }, (_, index) => (
          <ArchitectureModule
            key={index}
            index={index}
            count={moduleCount}
            progress={progress}
            dataSignal={dataSignal}
          />
        ))}

        <group ref={halo} rotation={[Math.PI / 2, 0, 0]}>
          <Line points={linePoints} color={gapColor} lineWidth={1.2} transparent opacity={0.7} />
          <Line
            points={linePoints.map((point) => point.clone().multiplyScalar(0.76))}
            color="#ffffff"
            lineWidth={0.7}
            transparent
            opacity={0.6}
          />
        </group>

        <Float speed={1.3} rotationIntensity={0.2} floatIntensity={0.25}>
          <RoundedBox args={[2.25, 0.18, 1.15]} radius={0.08} position={[0, 2.1, 0]}>
            <meshPhysicalMaterial
              color="#f9fbfc"
              metalness={0.62}
              roughness={0.12}
              transparent
              opacity={0.88}
              clearcoat={1}
            />
          </RoundedBox>
        </Float>
      </group>

      <Grid
        position={[0, -1.68, 0]}
        args={[18, 18]}
        cellSize={0.5}
        cellThickness={0.35}
        cellColor="#b7c0c6"
        sectionSize={2.5}
        sectionThickness={0.8}
        sectionColor="#6b777f"
        fadeDistance={13}
        fadeStrength={1.8}
        infiniteGrid
      />
    </>
  );
}

export function SilverScene(props: SilverSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [5.8, 3.8, 8.2], fov: 34, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      shadows
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
