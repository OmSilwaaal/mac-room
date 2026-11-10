import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { Bloom, DepthOfField, EffectComposer, N8AO, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import Room from './Room'
import Macintosh from './Macintosh'
import { SCREEN, SCREEN_WORLD, WINDOW_WORLD } from '../config'
import { scrollState } from '../scrollState'
import { secret, smooth, tickSecret, TL } from '../secret'

RectAreaLightUniformsLib.init()

const START_POS = new THREE.Vector3(0.2, 1.07, 1.08)
const START_LOOK = new THREE.Vector3(-0.02, 0.9, -0.05)
const SCREEN_V = new THREE.Vector3(...SCREEN_WORLD)
const WINDOW_V = new THREE.Vector3(...WINDOW_WORLD)
// where the camera stands to watch the blinds: up and to the left of the screen,
// high enough to look over the lamp shade
const SECRET_POS = new THREE.Vector3(-0.28, 1.4, 0.42)
const SECRET_DOLLY = new THREE.Vector3(-0.4, 1.42, 0.2)
// shared focus point for depth of field
export const focusPoint = SCREEN_V.clone()

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const ARRIVE_AT = 0.985

function CameraRig({ onArrivedChange, onNearChange, reducedMotion }) {
  const { camera, size } = useThree()
  const damped = useRef(scrollState.progress)
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 })
  const arrived = useRef(false)
  const near = useRef(false)
  const tmp = useMemo(
    () => ({ s: new THREE.Vector3(), e: new THREE.Vector3(), c: new THREE.Vector3(), p: new THREE.Vector3(), look: new THREE.Vector3(), sp: new THREE.Vector3() }),
    [],
  )

  useEffect(() => {
    const move = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05)
    damped.current = reducedMotion ? scrollState.progress : THREE.MathUtils.damp(damped.current, scrollState.progress, 3.2, d)
    // the last ~8% of the page is a hold at the screen
    const t = easeInOutCubic(clamp01(damped.current / 0.92))
    scrollState.travel = t

    const aspect = size.width / size.height
    const vfov = THREE.MathUtils.degToRad(camera.fov)
    const tanH = Math.tan(vfov / 2)

    // start: widen on portrait screens so the desk still reads as a room
    const back = THREE.MathUtils.clamp(1.55 / aspect, 1, 2.4)
    tmp.s.copy(START_POS).sub(START_LOOK).multiplyScalar(back).add(START_LOOK)

    // end: the 3:2 screen almost fills whichever viewport dimension is limiting
    const fill = 1.035
    const dist = Math.max(SCREEN.height / 2 / tanH, SCREEN.width / 2 / (tanH * aspect)) * fill
    tmp.e.set(SCREEN_V.x, SCREEN_V.y, SCREEN_V.z + dist)

    // quadratic bezier: swing to centre early, then push straight in
    tmp.c.set(SCREEN_V.x, THREE.MathUtils.lerp(tmp.s.y, tmp.e.y, 0.55), THREE.MathUtils.lerp(tmp.s.z, tmp.e.z, 0.42))
    const u = 1 - t
    tmp.p
      .copy(tmp.s)
      .multiplyScalar(u * u)
      .addScaledVector(tmp.c, 2 * u * t)
      .addScaledVector(tmp.e, t * t)

    // handheld feel + pointer parallax, fading out on approach
    const free = reducedMotion ? 0 : Math.pow(1 - t, 2)
    const p = pointer.current
    p.sx = THREE.MathUtils.damp(p.sx, p.x, 2.5, d)
    p.sy = THREE.MathUtils.damp(p.sy, p.y, 2.5, d)
    const time = state.clock.elapsedTime
    tmp.p.x += (p.sx * 0.15 + Math.sin(time * 0.35) * 0.006) * free
    tmp.p.y += (-p.sy * 0.075 + Math.sin(time * 0.5) * 0.004) * free

    // focus locks onto the screen faster than the camera travels
    const lt = 1 - Math.pow(1 - t, 2.2)
    tmp.look.copy(START_LOOK).lerp(SCREEN_V, lt)
    // the gaze drifts a little toward the cursor too, like turning your head
    tmp.look.x += p.sx * 0.06 * free
    tmp.look.y -= p.sy * 0.035 * free

    // --- Clean Up secret: leave the screen, watch the blinds, come back ---
    tickSecret()
    if (secret.active) {
      const st = secret.t
      const w = smooth(TL.outStart, TL.outEnd, st) * (1 - smooth(TL.backStart, TL.backEnd, st))
      secret.w = w
      // a slow push-in while the paint goes on
      tmp.sp.copy(SECRET_POS).lerp(SECRET_DOLLY, smooth(TL.outEnd - 0.4, TL.backStart, st))
      // arc the move upward a little so it reads as a head turn, not a slide
      const lift = Math.sin(Math.PI * w) * 0.035
      tmp.p.lerp(tmp.sp, w)
      tmp.p.y += lift
      tmp.look.lerp(WINDOW_V, w)
      // screen-shake while the machine glitches
      const shake = (st < TL.glitchEnd ? 1 - st / TL.glitchEnd : 0) + (st > TL.backEnd - 0.3 && st < TL.recoverEnd ? 0.5 : 0)
      if (shake > 0 && !reducedMotion) {
        tmp.p.x += (Math.sin(st * 97) + Math.sin(st * 41)) * 0.0012 * shake
        tmp.p.y += Math.sin(st * 73 + 1) * 0.0012 * shake
      }
    } else {
      secret.w = 0
    }
    focusPoint.copy(SCREEN_V).lerp(WINDOW_V, secret.w)

    camera.position.copy(tmp.p)
    camera.lookAt(tmp.look)

    const isNear = t > 0.8
    if (isNear !== near.current) {
      near.current = isNear
      onNearChange(isNear)
    }

    const isArrived = t > ARRIVE_AT && !secret.active
    if (isArrived !== arrived.current) {
      arrived.current = isArrived
      onArrivedChange(isArrived)
    }
  })
  return null
}

function Lights() {
  return (
    <>
      {/* blue hour: deep saturated blue fills the whole room, shadows included */}
      <hemisphereLight args={['#2c4dff', '#0e1a5c', 1.05]} />
      {/* moonlight through the window */}
      <directionalLight
        position={[-1.6, 2.2, -1.2]}
        color="#3f5ff5"
        intensity={0.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-1}
        shadow-camera-right={1}
        shadow-camera-top={1}
        shadow-camera-bottom={-1}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      {/* faint fill from the viewer side so the beige case still reads */}
      <directionalLight position={[0.8, 1.6, 2.2]} color="#4a66e6" intensity={0.07} />
      {/* reflections: the glowing screen, and the moonlit window behind */}
      <Environment resolution={256} frames={1} environmentIntensity={0.22}>
        <Lightformer form="rect" intensity={2.5} color="#cfdcf2" position={[0, 0.98, 0.1]} scale={[0.18, 0.12, 1]} target={[0, 0.9, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#3552e8" position={[-1, 1.4, -1.5]} scale={[1, 1, 1]} target={[0, 0.8, 0]} />
        <Lightformer form="rect" intensity={0.3} color="#5a73e8" position={[0, 3, 1]} scale={[3, 1, 1]} target={[0, 0.8, 0]} />
      </Environment>
    </>
  )
}

function Effects({ high }) {
  const dof = useRef()
  useFrame(() => {
    if (dof.current?.target) dof.current.target.copy(focusPoint)
  })
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO halfRes aoRadius={0.18} distanceFalloff={0.6} intensity={2.2} quality={high ? 'medium' : 'low'} />
      {high ? <DepthOfField ref={dof} target={SCREEN_WORLD} worldFocusRange={0.9} bokehScale={3.2} /> : null}
      <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.55} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.62} />
      {/* film grain: overlay blend keeps it in the darks and mids, like low-light film */}
      <Noise premultiply={false} blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.75} />
      <SMAA />
    </EffectComposer>
  )
}

export default function Experience({ onArrivedChange, onApproach, arrived, setDpr, portal }) {
  const [high, setHigh] = useState(true)
  const [near, setNear] = useState(false)
  const reducedMotion = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, [])
  return (
    <>
      <color attach="background" args={['#0d1a66']} />
      <fog attach="fog" args={['#13227a', 1.3, 6.2]} />
      <PerformanceMonitor
        onDecline={() => {
          setHigh(false)
          setDpr(1)
        }}
      />
      <CameraRig onArrivedChange={onArrivedChange} onNearChange={setNear} reducedMotion={reducedMotion} />
      <Lights />
      <Room />
      <Macintosh arrived={arrived} near={near} onApproach={onApproach} portal={portal} />
      <Effects high={high} />
    </>
  )
}
