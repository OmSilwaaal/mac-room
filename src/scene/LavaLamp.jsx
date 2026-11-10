import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'
import { getMaterials } from './materials'

// A 1960s-style lava lamp: brass rocket base and cap, tapered bottle,
// amber liquid and slow wax blobs (marching-cube metaballs).
// The lamp is the room's main light at night.

export const LAVA_INTENSITY = 1.0

// profiles are smoothed with a spline so polished metal doesn't break into facet rings
const lathe = (pts, seg = 72, samples = 96) => {
  const curve = new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y)))
  return new THREE.LatheGeometry(curve.getPoints(samples), seg)
}

// profiles as [radius, height] in metres
const BASE = [
  [0, 0],
  [0.068, 0],
  [0.07, 0.004],
  [0.07, 0.012],
  [0.066, 0.018],
  [0.052, 0.06],
  [0.04, 0.11],
  [0.034, 0.142],
  [0.039, 0.146],
  [0.039, 0.152],
  [0.034, 0.155],
]
const BOTTLE_Y0 = 0.155
const BOTTLE_Y1 = 0.402
const BOTTLE = [
  [0.033, BOTTLE_Y0],
  [0.037, 0.17],
  [0.047, 0.21],
  [0.054, 0.26],
  [0.053, 0.29],
  [0.045, 0.34],
  [0.035, 0.38],
  [0.03, BOTTLE_Y1],
]
const CAP = [
  [0.031, BOTTLE_Y1],
  [0.033, 0.406],
  [0.022, 0.44],
  [0.012, 0.458],
  [0.006, 0.462],
  [0, 0.463],
]

// Each blob drifts up and down on its own slow cycle (periods of 30 to 55 s).
const BLOBS = [
  { speed: 0.19, phase: 0.0, x: 0.06, z: -0.02, s: 0.95 },
  { speed: 0.14, phase: 2.1, x: -0.05, z: 0.04, s: 0.8 },
  { speed: 0.12, phase: 4.0, x: 0.02, z: 0.06, s: 1.05 },
  { speed: 0.17, phase: 5.3, x: -0.03, z: -0.05, s: 0.65 },
  { speed: 0.115, phase: 1.2, x: 0.0, z: 0.0, s: 0.75 },
]

export default function LavaLamp({ lampRef, position = [0, 0, 0], rotation = [0, 0, 0] }) {
  const m = getMaterials()
  const geo = useMemo(() => ({ base: lathe(BASE), bottle: lathe(BOTTLE), liquid: lathe(BOTTLE.map(([r, y]) => [r * 0.93, y])), cap: lathe(CAP) }), [])

  const mats = useMemo(
    () => ({
      // polished brass, smoother than the brushed desk hardware
      metal: new THREE.MeshPhysicalMaterial({ color: '#b88a4a', metalness: 1, roughness: 0.24, clearcoat: 0.4, clearcoatRoughness: 0.2, roughnessMap: m.brass.roughnessMap }),
      wax: new THREE.MeshStandardMaterial({ color: '#ff8a2e', emissive: '#ff4d06', emissiveIntensity: 2.4, roughness: 0.4 }),
      liquid: new THREE.MeshPhysicalMaterial({
        color: '#ff6a1a',
        emissive: '#c22c02',
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.42,
        roughness: 0.15,
        depthWrite: false,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.14,
        roughness: 0.04,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 1.6,
        depthWrite: false,
      }),
    }),
    [m],
  )

  // metaball volume: a cube spanning -1..1 locally, scaled to sit inside the bottle
  const blobs = useMemo(() => {
    const mc = new MarchingCubes(32, mats.wax, false, false, 16000)
    mc.isolation = 80
    return mc
  }, [mats.wax])

  const light = useRef()
  useLayoutEffect(() => {
    lampRef.current = light.current
    light.current.userData.k = 1
  }, [lampRef])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    blobs.reset()
    // the warm pool resting on the heating coil
    blobs.addBall(0.5, 0.06, 0.5, 1.1, 12)
    blobs.addBall(0.5, 0.97, 0.5, 0.35, 12) // a little wax stuck under the cap
    for (const b of BLOBS) {
      // 0 = resting at the bottom, 1 = up near the cap; eased so it lingers at each end
      const cycle = 0.5 - 0.5 * Math.cos(t * b.speed + b.phase)
      const y = 0.13 + cycle * 0.66
      // rising wax stretches thin; sinking wax rounds out
      const strength = b.s * (0.72 - 0.18 * Math.sin(t * b.speed + b.phase))
      // keep blobs inside the narrower neck near the top
      const narrow = 1 - Math.max(0, y - 0.6) * 1.6
      const x = 0.5 + (b.x + Math.sin(t * 0.21 + b.phase) * 0.035) * narrow
      const z = 0.5 + (b.z + Math.cos(t * 0.17 + b.phase) * 0.035) * narrow
      blobs.addBall(x, y, z, strength, 12)
    }
    blobs.update()

    // the light breathes as wax moves past the bulb; the secret can stutter it via userData.k
    const k = light.current.userData.k ?? 1
    const breath = 0.93 + 0.05 * Math.sin(t * 0.37) + 0.02 * Math.sin(t * 1.3)
    light.current.intensity = LAVA_INTENSITY * breath * k
    mats.wax.emissiveIntensity = 2.4 * (0.35 + 0.65 * k) * breath
    mats.liquid.emissiveIntensity = 0.55 * (0.3 + 0.7 * k)
  })

  const mid = (BOTTLE_Y0 + BOTTLE_Y1) / 2
  const half = (BOTTLE_Y1 - BOTTLE_Y0) / 2

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo.base} material={mats.metal} castShadow receiveShadow />
      {/* switch on the base */}
      <mesh position={[0.05, 0.03, 0.022]} rotation={[0, 0.4, -0.35]} material={m.darkPlastic}>
        <boxGeometry args={[0.012, 0.006, 0.008]} />
      </mesh>
      <primitive object={blobs} position={[0, mid, 0]} scale={half} renderOrder={1} />
      <mesh geometry={geo.liquid} material={mats.liquid} renderOrder={2} />
      <mesh geometry={geo.bottle} material={mats.glass} renderOrder={3} />
      <mesh geometry={geo.cap} material={mats.metal} castShadow />
      <pointLight
        ref={light}
        position={[0, mid - 0.01, 0]}
        color="#ff8a3c"
        intensity={LAVA_INTENSITY}
        distance={2.6}
        decay={2}
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.002}
        shadow-normalBias={0.03}
        shadow-radius={8}
        shadow-camera-near={0.02}
      />
    </group>
  )
}
