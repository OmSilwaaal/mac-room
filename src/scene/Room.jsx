import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { DESK_Y, WINDOW_WORLD } from '../config'
import { PaintedBlinds, useSecretLights } from './Possession'
import { screenLightRef } from './ScreenGlow'
import Storm from './Storm'
import { paperTex, printTex } from './textures'
import { bookCover, bookSpine, getMaterials, printMaterial } from './materials'

const BACK_Z = -1.55

// every surface comes from the procedural PBR library in ./materials
const useMats = () => getMaterials()

function Desk({ m }) {
  const W = 1.7
  const D = 0.8
  const T = 0.045
  const knobs = [-0.62, 0, 0.62]
  return (
    <group>
      <RoundedBox args={[W, T, D]} radius={0.008} smoothness={3} position={[0, DESK_Y - T / 2, 0]} material={m.desk} receiveShadow castShadow />
      {/* pedestals */}
      {[-0.62, 0.62].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, (DESK_Y - T) / 2, -0.02]} material={m.deskSide} castShadow receiveShadow>
            <boxGeometry args={[0.42, DESK_Y - T, D - 0.08]} />
          </mesh>
          {[0.16, 0.38, 0.58].map((y) => (
            <group key={y} position={[0, y, D / 2 - 0.058]}>
              <RoundedBox args={[0.38, y > 0.5 ? 0.14 : 0.2, 0.02]} radius={0.004} smoothness={2} material={m.deskSideRB} castShadow receiveShadow />
              <mesh position={[0, 0, 0.016]} material={m.brass}>
                <sphereGeometry args={[0.011, 16, 12]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* centre drawer / apron */}
      <RoundedBox args={[0.8, 0.09, 0.02]} radius={0.004} smoothness={2} position={[0, DESK_Y - T - 0.05, D / 2 - 0.058]} material={m.deskSideRB} castShadow />
      <mesh position={[knobs[1], DESK_Y - T - 0.05, D / 2 - 0.042]} material={m.brass}>
        <sphereGeometry args={[0.01, 16, 12]} />
      </mesh>
    </group>
  )
}

const BOOKS = [
  { w: 0.215, h: 0.038, d: 0.27, c: '#5a3226', r: 0.04 },
  { w: 0.2, h: 0.032, d: 0.255, c: '#2f3b47', r: -0.06 },
  { w: 0.205, h: 0.044, d: 0.262, c: '#7c5b2f', r: 0.02 },
  { w: 0.19, h: 0.03, d: 0.24, c: '#3f4a36', r: 0.09 },
  { w: 0.18, h: 0.036, d: 0.235, c: '#6e2d27', r: -0.03 },
  { w: 0.17, h: 0.028, d: 0.225, c: '#4b5a44', r: 0.05 },
]

function Books({ position = [-0.4, DESK_Y, -0.1], rotation = Math.PI / 2 + 0.22 }) {
  const pages = getMaterials().pages
  let y = 0
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {BOOKS.map((b, i) => {
        const cover = bookCover(b.c)
        // box faces: +x, -x (spine), +y, -y, +z, -z
        const mats = [pages, bookSpine(i, b.c), cover, cover, pages, pages]
        const py = y + b.h / 2
        y += b.h
        return <mesh key={i} position={[0, py, 0]} rotation={[0, b.r, 0]} material={mats} castShadow receiveShadow geometry={new THREE.BoxGeometry(b.w, b.h, b.d)} />
      })}
    </group>
  )
}

function Mug() {
  const geo = useMemo(() => {
    const pts = [
      [0, 0],
      [0.036, 0],
      [0.039, 0.004],
      [0.04, 0.095],
      [0.037, 0.095],
      [0.036, 0.008],
      [0, 0.008],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, 48)
  }, [])
  const { mug: ceramic, coffee } = getMaterials()
  return (
    <group position={[0.64, DESK_Y, 0.12]} rotation={[0, -0.6, 0]}>
      <mesh geometry={geo} material={ceramic} castShadow receiveShadow />
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} material={coffee}>
        <circleGeometry args={[0.036, 32]} />
      </mesh>
      <mesh position={[0.044, 0.05, 0]} material={ceramic} castShadow>
        <torusGeometry args={[0.022, 0.0055, 12, 24, Math.PI * 1.2]} />
      </mesh>
    </group>
  )
}

function Papers() {
  const map = paperTex()
  const lib = getMaterials()
  return (
    <group>
      <mesh position={[0.52, DESK_Y + 0.0008, 0.3]} rotation={[-Math.PI / 2, 0, -0.32]} receiveShadow>
        <planeGeometry args={[0.21, 0.297]} />
        <meshStandardMaterial map={map} roughnessMap={lib.fiber.roughnessMap} roughness={1} normalMap={lib.fiber.normalMap} normalScale={[0.5, 0.5]} />
      </mesh>
      <mesh position={[0.56, DESK_Y + 0.0016, 0.27]} rotation={[-Math.PI / 2, 0, -0.18]} material={lib.paperTyped} receiveShadow>
        <planeGeometry args={[0.21, 0.297]} />
      </mesh>
      {/* small notebook */}
      <RoundedBox args={[0.14, 0.012, 0.2]} radius={0.002} smoothness={2} position={[0.66, DESK_Y + 0.008, 0.31]} rotation={[0, 0.25, 0]} material={lib.notebook} castShadow receiveShadow />
      {/* 3.5" floppy */}
      <group position={[0.44, DESK_Y + 0.0022, 0.07]} rotation={[0, 0.5, 0]}>
        <mesh material={lib.floppy} castShadow receiveShadow>
          <boxGeometry args={[0.09, 0.0033, 0.094]} />
        </mesh>
        <mesh position={[0, 0.0018, -0.03]} material={lib.steel}>
          <boxGeometry args={[0.05, 0.0005, 0.03]} />
        </mesh>
        <mesh position={[0, 0.0018, 0.02]} material={lib.floppyLabel}>
          <boxGeometry args={[0.07, 0.0004, 0.04]} />
        </mesh>
      </group>
    </group>
  )
}

const WINDOW_POS = [-1.0, 1.42, BACK_Z + 0.02]

// 8 × 3 m wall with the window cut out; UVs stay 0..1 like the plane it replaced
const backWall = (() => {
  const W = 8
  const H = 3
  const s = new THREE.Shape()
  s.moveTo(-W / 2, -H / 2)
  s.lineTo(W / 2, -H / 2)
  s.lineTo(W / 2, H / 2)
  s.lineTo(-W / 2, H / 2)
  s.closePath()
  const hx = WINDOW_POS[0]
  const hy = WINDOW_POS[1] - 1.5
  const hole = new THREE.Path()
  hole.moveTo(hx - 0.48, hy - 0.55)
  hole.lineTo(hx - 0.48, hy + 0.55)
  hole.lineTo(hx + 0.48, hy + 0.55)
  hole.lineTo(hx + 0.48, hy - 0.55)
  hole.closePath()
  s.holes.push(hole)
  const g = new THREE.ShapeGeometry(s)
  const p = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + W / 2) / W, (p.getY(i) + H / 2) / H)
  return g
})()
const BLIND_CENTER = [WINDOW_POS[0], WINDOW_POS[1]]

function Window({ m, windowLightRef, backdropRef }) {
  return (
    <group position={WINDOW_POS}>
      {/* night outside */}
      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[0.92, 1.06]} />
        <meshBasicMaterial ref={backdropRef} color="#1d36c4" toneMapped={false} />
      </mesh>
      <PaintedBlinds center={BLIND_CENTER} />
      {/* frame */}
      {[
        [0, 0.55, 1.0, 0.05],
        [0, -0.55, 1.04, 0.07],
        [-0.48, 0, 0.05, 1.12],
        [0.48, 0, 0.05, 1.12],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.02]} material={m.trim} castShadow receiveShadow>
          <boxGeometry args={[w, h, 0.06]} />
        </mesh>
      ))}
      {/* RectAreaLight emits along its local -Z, so turn it to face the room */}
      <rectAreaLight ref={windowLightRef} args={['#3d5cf0', 0.9, 0.9, 1.0]} position={[0, 0, 0.06]} rotation={[0, Math.PI, 0]} />
    </group>
  )
}

function Cabinet({ m }) {
  return (
    <group position={[1.05, 0, BACK_Z + 0.24]}>
      <mesh position={[0, 0.46, 0]} material={m.deskSide} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.92, 0.44]} />
      </mesh>
      {[0.22, 0.52, 0.78].map((y) =>
        [-0.29, 0.29].map((x) => (
          <group key={`${x}${y}`} position={[x, y, 0.225]}>
            <RoundedBox args={[0.54, y > 0.7 ? 0.2 : 0.26, 0.02]} radius={0.004} smoothness={2} material={m.deskSideRB} />
            <mesh position={[0, 0, 0.016]} material={m.brass}>
              <sphereGeometry args={[0.012, 16, 12]} />
            </mesh>
          </group>
        )),
      )}
      {/* a few objects on top, out of focus from the desk */}
      <Books position={[-0.35, 0.92, 0]} rotation={1.4} />
      <mesh position={[0.15, 0.92 + 0.09, 0.02]} material={m.vase} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.18, 32]} />
      </mesh>
      {/* small warm table lamp → soft bokeh in the background */}
      <group position={[0.4, 0.92, -0.02]}>
        <mesh position={[0, 0.12, 0]} material={m.trim}>
          <cylinderGeometry args={[0.012, 0.03, 0.24, 16]} />
        </mesh>
        <mesh position={[0, 0.3, 0]} material={m.linenShade}>
          <cylinderGeometry args={[0.06, 0.1, 0.12, 32, 1, true]} />
        </mesh>
        <pointLight position={[0, 0.28, 0.05]} color="#ffad5c" intensity={0.12} distance={1.5} decay={2} />
      </group>
      {/* framed print above */}
      <group position={[0, 1.55, -0.21]}>
        <mesh material={m.trim} castShadow>
          <boxGeometry args={[0.5, 0.64, 0.03]} />
        </mesh>
        <mesh position={[0, 0, 0.016]} material={printMaterial(printTex())}>
          <planeGeometry args={[0.4, 0.54]} />
        </mesh>
      </group>
    </group>
  )
}

export default function Room() {
  const m = useMats()
  // the secret's flicker drives the computer screen's glow
  const lampRef = screenLightRef
  const windowLightRef = useRef()
  const backdropRef = useRef()
  const redSpotRef = useRef()
  const redTarget = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(...WINDOW_WORLD)
    return o
  }, [])
  useLayoutEffect(() => {
    redSpotRef.current.target = redTarget
  }, [redTarget])
  useSecretLights({ lampRef, windowLightRef, backdropRef, redSpotRef })
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={m.floor} receiveShadow>
        <planeGeometry args={[8, 8]} />
      </mesh>
      {/* walls */}
      <mesh position={[0, 1.5, BACK_Z]} geometry={backWall} material={m.wall} castShadow receiveShadow />
      <mesh position={[-2.2, 1.5, 0.5]} rotation={[0, Math.PI / 2, 0]} material={m.wall} receiveShadow>
        <planeGeometry args={[5, 3]} />
      </mesh>
      <mesh position={[2.4, 1.5, 0.5]} rotation={[0, -Math.PI / 2, 0]} material={m.wall} receiveShadow>
        <planeGeometry args={[5, 3]} />
      </mesh>
      {/* baseboard */}
      <mesh position={[0, 0.05, BACK_Z + 0.01]} material={m.trim}>
        <boxGeometry args={[8, 0.1, 0.02]} />
      </mesh>
      <Desk m={m} />
      <Books />
      <Mug />
      <Papers />
      <Window m={m} windowLightRef={windowLightRef} backdropRef={backdropRef} />
      <Storm windowPos={WINDOW_POS} />
      {/* off until the secret: a cold key light so the paint reads against the slats */}
      <primitive object={redTarget} />
      <spotLight ref={redSpotRef} position={[-0.25, 2.2, 0.7]} color="#ffe2c8" intensity={0} angle={0.36} penumbra={0.95} distance={6} decay={2} />
      <Cabinet m={m} />
    </group>
  )
}
