import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { secret } from '../secret'
import { storm, playThunder } from '../storm'

// A storm outside the window. Strikes come every 12–35 s as a short stutter of
// flashes; the light comes in through the blinds (slat shadows on the desk and
// floor) and the thunder follows after a delay set by the strike's distance.

const SKY_W = 0.92
const SKY_H = 1.06

function rand(a, b) {
  return a + Math.random() * (b - a)
}

// A strike: 2–4 pulses with near-instant attack and fast decay.
function makeStrike() {
  const distance = Math.random() // 0 = overhead, 1 = far away
  const pulses = []
  let t = 0
  const n = 2 + Math.floor(Math.random() * 3)
  for (let i = 0; i < n; i++) {
    pulses.push({ at: t, amp: (i === 1 ? 1 : rand(0.45, 0.85)) * (1 - distance * 0.55), decay: rand(0.05, 0.12) })
    t += rand(0.06, 0.22)
  }
  // a dimmer afterglow as the cloud stays lit
  pulses.push({ at: t + 0.05, amp: 0.3 * (1 - distance * 0.5), decay: 0.35 })
  return { pulses, distance, bolt: distance < 0.6 && Math.random() < 0.75 }
}

// Sky behind the blinds: dark storm clouds, lit up during a flash, with a bolt.
function useSky() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 384
    c.height = 448
    const g = c.getContext('2d')
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    const draw = (withBolt) => {
      g.clearRect(0, 0, c.width, c.height)
      // cloud masses: brighter at the base where the flash lights them
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * c.width
        const y = Math.random() * c.height * 0.8
        const r = rand(30, 110)
        const grd = g.createRadialGradient(x, y, 0, x, y, r)
        const a = rand(0.08, 0.22)
        grd.addColorStop(0, `rgba(205,215,255,${a})`)
        grd.addColorStop(1, 'rgba(205,215,255,0)')
        g.fillStyle = grd
        g.fillRect(x - r, y - r, r * 2, r * 2)
      }
      if (withBolt) {
        // a jagged bolt with a couple of forks, drawn glow-first
        const x0 = rand(70, c.width - 70)
        const segs = []
        let x = x0
        let y = rand(0, 40)
        while (y < c.height) {
          const nx = x + rand(-26, 26)
          const ny = y + rand(14, 34)
          segs.push([x, y, nx, ny, 1])
          if (Math.random() < 0.12) {
            let fx = nx
            let fy = ny
            for (let k = 0; k < 4; k++) {
              const gx = fx + rand(-30, 30) + (nx > x0 ? 10 : -10)
              const gy = fy + rand(12, 26)
              segs.push([fx, fy, gx, gy, 0.5])
              fx = gx
              fy = gy
            }
          }
          x = nx
          y = ny
        }
        for (const [w, a] of [
          [14, 0.12],
          [6, 0.35],
          [2.2, 1],
        ]) {
          g.lineCap = 'round'
          g.strokeStyle = `rgba(235,240,255,${a})`
          for (const [ax, ay, bx, by, k] of segs) {
            g.lineWidth = w * k
            g.beginPath()
            g.moveTo(ax, ay)
            g.lineTo(bx, by)
            g.stroke()
          }
        }
      }
      tex.needsUpdate = true
    }
    draw(false)
    return { tex, draw }
  }, [])
}

export default function Storm({ windowPos }) {
  const spot = useRef()
  const fill = useRef()
  const skyMat = useRef()
  const sky = useSky()
  const state = useRef({ next: 5 + Math.random() * 4, strike: null, start: 0 })

  // the light sits outside, above and behind the window, aimed into the room
  const target = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(-0.1, 0.72, 0.25)
    return o
  }, [])
  useLayoutEffect(() => {
    spot.current.target = target
  }, [target])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const s = state.current
    let flash = 0

    if (secret.active) {
      // the storm holds its breath during the secret
      s.strike = null
      s.next = t + rand(8, 14)
    } else {
      if (storm.force) {
        storm.force = false
        s.next = t
      }
      if (!s.strike && t >= s.next) {
        s.strike = makeStrike()
        s.start = t
        sky.draw(s.strike.bolt)
        // sound travels slower than light: ~3 s per km, scaled for drama
        playThunder({ distance: s.strike.distance, delay: 0.35 + s.strike.distance * 3.2 })
      }
      if (s.strike) {
        const lt = t - s.start
        for (const p of s.strike.pulses) {
          const d = lt - p.at
          if (d >= 0) flash = Math.max(flash, p.amp * Math.exp(-d / p.decay))
        }
        if (lt > 2.5) {
          s.strike = null
          s.next = t + rand(12, 35)
        }
      }
    }
    if (storm.hold != null) flash = storm.hold // test hook: freeze a flash level
    storm.flash = flash

    // moonlight through the slats at rest, lightning on top
    spot.current.intensity = 0.7 + flash * 26
    spot.current.color.setRGB(0.24 + flash * 0.66, 0.36 + flash * 0.56, 1)
    fill.current.intensity = flash * 0.55
    skyMat.current.opacity = Math.min(1, flash * 1.4)
  })

  return (
    <group>
      {/* storm sky, lit only during a flash; sits just in front of the night backdrop */}
      <mesh position={[windowPos[0], windowPos[1], windowPos[2] - 0.035]}>
        <planeGeometry args={[SKY_W, SKY_H]} />
        <meshBasicMaterial ref={skyMat} map={sky.tex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <primitive object={target} />
      <spotLight
        ref={spot}
        position={[windowPos[0] - 0.33, windowPos[1] + 0.27, windowPos[2] - 0.65]}
        color="#9fb3ff"
        intensity={0.9}
        angle={0.62}
        penumbra={0.25}
        distance={7}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-radius={2}
        shadow-camera-near={0.2}
      />
      {/* a flash also lifts the whole room a little: light bouncing off every wall */}
      <hemisphereLight ref={fill} args={['#c9d4ff', '#1a1a22', 0]} />
    </group>
  )
}
