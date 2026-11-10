import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { SCREEN } from '../config'
import { secret, smooth, TL } from '../secret'

// The CRT is the only lamp in the room. Its glow is three lights:
//  - an area light the size of the screen (soft, wraps the bezel and keyboard)
//  - a wide shadow-casting spot (keyboard, mouse and the case cast real shadows)
//  - a faint bounce off the desk that lifts the front of the case
// Shared with the Clean Up secret, which stutters it through userData.k.
export const screenLightRef = { current: null }

const PHOSPHOR = '#5dff86'
const AREA = 2.2
const SPOT = 0.18
const BOUNCE = 0.02

export default function ScreenGlow() {
  const area = useRef()
  const spot = useRef()
  const bounce = useRef()
  const target = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(0, -0.12, 1)
    return o
  }, [])

  useLayoutEffect(() => {
    spot.current.target = target
    // the secret writes its flicker into userData.k on this object
    screenLightRef.current = spot.current
    spot.current.userData.k = 1
  }, [target])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    let k = spot.current.userData.k ?? 1
    // while the screen is black during the secret, the room goes with it
    if (secret.active) {
      const st = secret.t
      const off = smooth(TL.glitchEnd - 0.15, TL.glitchEnd + 0.05, st) * (1 - smooth(TL.backEnd - 0.55, TL.backEnd - 0.4, st))
      k *= 1 - off * 0.9
    }
    // a CRT never quite holds still
    const hum = 0.985 + 0.01 * Math.sin(t * 9.1) + 0.005 * Math.sin(t * 23.7)
    area.current.intensity = AREA * k * hum
    spot.current.intensity = SPOT * k * hum
    bounce.current.intensity = BOUNCE * k
  })

  return (
    <group>
      <rectAreaLight ref={area} args={[PHOSPHOR, AREA, SCREEN.width, SCREEN.height]} position={[0, 0, 0.004]} rotation={[0, Math.PI, 0]} />
      <primitive object={target} />
      <spotLight
        ref={spot}
        position={[0, 0, 0.012]}
        color={PHOSPHOR}
        intensity={SPOT}
        angle={1.05}
        penumbra={1}
        distance={3.5}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-radius={10}
        shadow-camera-near={0.01}
      />
      {/* light coming back off the desk */}
      <pointLight ref={bounce} position={[0, -0.215, 0.42]} color="#b9c4d6" intensity={BOUNCE} distance={1.2} decay={2} />
    </group>
  )
}
