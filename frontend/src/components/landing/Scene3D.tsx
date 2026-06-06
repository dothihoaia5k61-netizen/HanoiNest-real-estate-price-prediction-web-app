import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

export type AnalysisPhase = "idle" | "analyzing" | "result";

type TiltRef = MutableRefObject<{ x: number; y: number }>;

type Scene3DProps = {
  active: boolean;
  phase: AnalysisPhase;
  reducedMotion: boolean;
  tiltRef: TiltRef;
};

const blockPositions: Array<{
  position: [number, number, number];
  scale: [number, number, number];
}> = [
  { position: [-3.2, -1.1, -1.3], scale: [0.65, 1.2, 0.65] },
  { position: [-2.4, -0.75, 1.1], scale: [0.5, 1.9, 0.5] },
  { position: [-1.65, -1.25, -2], scale: [0.55, 0.85, 0.55] },
  { position: [1.8, -1.05, -2], scale: [0.55, 1.25, 0.55] },
  { position: [2.65, -0.65, 1.2], scale: [0.7, 2.1, 0.7] },
  { position: [3.4, -1.18, -0.7], scale: [0.55, 0.95, 0.55] },
  { position: [-3.5, -1.3, 0.25], scale: [0.45, 0.65, 0.45] },
  { position: [3.7, -1.3, 0.45], scale: [0.45, 0.65, 0.45] },
];

function DataHouse({
  phase,
  reducedMotion,
  tiltRef,
}: Pick<Scene3DProps, "phase" | "reducedMotion" | "tiltRef">) {
  const house = useRef<THREE.Group>(null);
  const scanOne = useRef<THREE.Mesh>(null);
  const scanTwo = useRef<THREE.Mesh>(null);
  const blocks = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!blocks.current) return;
    blockPositions.forEach((block, index) => {
      dummy.position.set(...block.position);
      dummy.scale.set(...block.scale);
      dummy.updateMatrix();
      blocks.current?.setMatrixAt(index, dummy.matrix);
    });
    blocks.current.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  useFrame((state, delta) => {
    if (!house.current) return;

    const analyzing = phase === "analyzing";
    const result = phase === "result";
    const idleDrift = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.6) * 0.035;
    const targetRotationY =
      analyzing
        ? state.clock.elapsedTime * 0.75
        : result
          ? 0.72
          : tiltRef.current.x * 0.22 + idleDrift;
    const targetRotationX = result ? -0.08 : tiltRef.current.y * 0.16;

    house.current.rotation.y = THREE.MathUtils.damp(
      house.current.rotation.y,
      targetRotationY,
      analyzing ? 4.2 : 6,
      delta,
    );
    house.current.rotation.x = THREE.MathUtils.damp(
      house.current.rotation.x,
      targetRotationX,
      6,
      delta,
    );
    house.current.position.y = THREE.MathUtils.damp(
      house.current.position.y,
      result ? 0.12 : idleDrift,
      4,
      delta,
    );
    house.current.scale.setScalar(
      THREE.MathUtils.damp(house.current.scale.x, analyzing ? 1.06 : 1, 5, delta),
    );

    const scanVisible = phase !== "idle";
    for (const [ring, offset] of [
      [scanOne.current, 0],
      [scanTwo.current, 1.1],
    ] as const) {
      if (!ring) continue;
      ring.visible = scanVisible;
      if (scanVisible) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.4 + offset) * 0.08;
        ring.scale.setScalar(pulse);
        ring.rotation.z += delta * (offset ? -0.42 : 0.5);
      }
    }
  });

  return (
    <>
      <instancedMesh ref={blocks} args={[undefined, undefined, blockPositions.length]}>
        <boxGeometry />
        <meshStandardMaterial
          color="#101a29"
          emissive="#07111d"
          emissiveIntensity={0.45}
          metalness={0.55}
          roughness={0.42}
        />
      </instancedMesh>

      <group ref={house}>
        <mesh position={[0, -1.45, 0]} scale={[3.2, 0.12, 2.7]}>
          <boxGeometry />
          <meshStandardMaterial
            color="#17263a"
            emissive="#0a1c2b"
            emissiveIntensity={0.7}
            metalness={0.72}
            roughness={0.26}
          />
        </mesh>

        <mesh position={[0, -0.18, 0]} scale={[2.15, 2.45, 1.85]}>
          <boxGeometry />
          <meshStandardMaterial
            color={phase === "result" ? "#bfeff7" : "#8eb9c7"}
            emissive={phase === "idle" ? "#123c4b" : "#1b7186"}
            emissiveIntensity={phase === "idle" ? 0.55 : 1.15}
            metalness={0.58}
            roughness={0.18}
          />
        </mesh>

        <mesh position={[0, 1.48, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.72, 0.78, 1.72]}>
          <coneGeometry args={[1, 1, 4]} />
          <meshStandardMaterial
            color="#263e58"
            emissive="#0b2035"
            emissiveIntensity={0.6}
            metalness={0.68}
            roughness={0.24}
          />
        </mesh>

        <mesh position={[0, -0.82, 0.94]} scale={[0.48, 0.98, 0.08]}>
          <boxGeometry />
          <meshBasicMaterial color="#08121e" />
        </mesh>

        {[-0.66, 0, 0.66].map((x) => (
          <mesh key={x} position={[x, 0.35, 0.95]} scale={[0.34, 0.36, 0.06]}>
            <boxGeometry />
            <meshBasicMaterial color={phase === "idle" ? "#2fbdd6" : "#89edff"} />
          </mesh>
        ))}

        <mesh ref={scanOne} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.55, 0.025, 8, 64]} />
          <meshBasicMaterial color="#47d9f4" transparent opacity={0.82} />
        </mesh>
        <mesh ref={scanTwo} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3.15, 0.018, 8, 64]} />
          <meshBasicMaterial color="#8b6dff" transparent opacity={0.55} />
        </mesh>
      </group>

      <mesh position={[0, -1.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[13, 13, 10, 10]} />
        <meshBasicMaterial color="#12314a" wireframe transparent opacity={0.34} />
      </mesh>
    </>
  );
}

function SceneContent(props: Pick<Scene3DProps, "phase" | "reducedMotion" | "tiltRef">) {
  return (
    <>
      <color attach="background" args={["#05070d"]} />
      <fog attach="fog" args={["#05070d", 8, 15]} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color="#dffbff" />
      <pointLight position={[-3, 1, 3]} intensity={12} color="#47d9f4" distance={8} />
      <pointLight position={[3, 2, -2]} intensity={8} color="#8b6dff" distance={7} />
      <DataHouse {...props} />
    </>
  );
}

export function Scene3D({ active, phase, reducedMotion, tiltRef }: Scene3DProps) {
  return (
    <Canvas
      dpr={reducedMotion ? 1 : [1, 1.25]}
      frameloop={active && !reducedMotion ? "always" : "demand"}
      camera={{ position: [5.4, 3.1, 7.5], fov: 39, near: 0.1, far: 30 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      performance={{ min: 0.65 }}
    >
      <SceneContent phase={phase} reducedMotion={reducedMotion} tiltRef={tiltRef} />
    </Canvas>
  );
}
