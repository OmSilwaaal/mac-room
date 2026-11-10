import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { secret, smooth, TL } from '../secret'
import { getMaterials } from './materials'
import { storm } from '../storm'

// ---------------------------------------------------------------------------
// Paint: a canvas the size of the window, projected onto the blind slats in
// world space, so the pentagram breaks across the slats like real paint would.
// ---------------------------------------------------------------------------

const PAINT_PX = 768
export const BLIND_W = 0.92
export const BLIND_H = 1.06

function pentagramPath(size) {
  // circle + inverted (point-down) star, proportions traced from the reference
  const cx = size * 0.5
  const cy = size * 0.47
  const R = size * 0.34
  const pts = []
  const circleSteps = 160
  // start at the top and run clockwise, like a hand would
  for (let i = 0; i <= circleSteps; i++) {
    const a = -Math.PI / 2 + (i / circleSteps) * Math.PI * 2
    pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0])
  }
  // star vertices on the circle; canvas y points down so +90° is the bottom point
  const vr = R * 0.985
  const v = Array.from({ length: 5 }, (_, k) => {
    const a = Math.PI / 2 + (k * 2 * Math.PI) / 5
    return [cx + Math.cos(a) * vr, cy + Math.sin(a) * vr]
  })
  const order = [0, 2, 4, 1, 3, 0]
  // lift the brush between the circle and the star
  for (let i = 0; i < order.length - 1; i++) {
    const [x0, y0] = v[order[i]]
    const [x1, y1] = v[order[i + 1]]
    const steps = 60
    for (let s = i === 0 ? 0 : 1; s <= steps; s++) {
      const t = s / steps
      pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, i === 0 && s === 0 ? 1 : 0])
    }
  }
  // cumulative length (brush lifts don't count)
  const len = [0]
  for (let i = 1; i < pts.length; i++) {
    const d = pts[i][2] ? 0 : Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    len.push(len[i - 1] + d)
  }
  return { pts, len, total: len[len.length - 1] }
}

function rand(seed) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

class Painter {
  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.canvas.height = PAINT_PX
    this.g = this.canvas.getContext('2d')
    this.tex = new THREE.CanvasTexture(this.canvas)
    this.tex.colorSpace = THREE.SRGBColorSpace
    this.tex.anisotropy = 8
    this.path = pentagramPath(PAINT_PX)
    this.reset()
  }

  reset() {
    this.g.clearRect(0, 0, PAINT_PX, PAINT_PX)
    this.drawn = 0
    this.drips = []
    this.r = rand(1337)
    this.dirty = true
  }

  pointAt(l) {
    const { pts, len } = this.path
    let i = 1
    while (i < len.length - 1 && len[i] < l) i++
    const a = pts[i - 1]
    const b = pts[i]
    const span = len[i] - len[i - 1] || 1
    const t = Math.min(1, Math.max(0, (l - len[i - 1]) / span))
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  }

  stamp(x, y, l) {
    const g = this.g
    const r = this.r
    // pressure wobbles along the stroke
    const w = 7.2 + Math.sin(l * 0.045) * 1.4 + Math.sin(l * 0.17) * 0.6
    g.fillStyle = 'rgba(150, 4, 6, 0.6)'
    g.beginPath()
    g.arc(x, y, w, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = 'rgba(200, 10, 10, 0.62)'
    g.beginPath()
    g.arc(x + (r() - 0.5) * 1.5, y + (r() - 0.5) * 1.5, w * 0.72, 0, Math.PI * 2)
    g.fill()
    // bristle speckle at the edges
    for (let k = 0; k < 3; k++) {
      const a = r() * Math.PI * 2
      const d = w * (0.85 + r() * 0.5)
      g.fillStyle = `rgba(110, 4, 6, ${0.25 + r() * 0.4})`
      g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.2 + r() * 1.6, 1.2 + r() * 1.6)
    }
    // the brush is overloaded: paint runs
    if (r() < 0.011) {
      this.drips.push({ x: x + (r() - 0.5) * w, y: y + w * 0.6, len: 0, max: 18 + r() * 90, speed: 20 + r() * 34, w: 2.2 + r() * 3.2 })
    }
  }

  paintTo(fraction) {
    const target = this.path.total * Math.min(1, Math.max(0, fraction))
    if (target <= this.drawn) return
    const step = 1.6
    for (let l = this.drawn; l < target; l += step) {
      const [x, y] = this.pointAt(l)
      this.stamp(x, y, l)
    }
    this.drawn = target
    this.dirty = true
  }

  runDrips(dt) {
    const g = this.g
    for (const d of this.drips) {
      if (d.len >= d.max - 0.5) continue
      const grow = d.speed * dt * (1 - d.len / d.max)
      const y0 = d.y + d.len
      d.len = Math.min(d.max, d.len + grow)
      const y1 = d.y + d.len
      g.strokeStyle = 'rgba(120, 6, 8, 0.85)'
      g.lineCap = 'round'
      g.lineWidth = d.w * (1 - (d.len / d.max) * 0.35)
      g.beginPath()
      g.moveTo(d.x, y0)
      g.lineTo(d.x + Math.sin(y1 * 0.08) * 0.4, y1)
      g.stroke()
      g.fillStyle = 'rgba(105, 4, 6, 0.9)'
      g.beginPath()
      g.arc(d.x, y1, d.w * 0.75, 0, Math.PI * 2)
      g.fill()
      this.dirty = true
    }
  }

  upload() {
    if (this.dirty) {
      this.tex.needsUpdate = true
      this.dirty = false
    }
  }
}

function usePaintMaterial(painter, center) {
  return useMemo(() => {
    const uniforms = {
      uPaint: { value: painter.tex },
      uPaintOpacity: { value: 0 },
      uPaintGlow: { value: 0 },
      uCenter: { value: new THREE.Vector2(center[0], center[1]) },
      uSize: { value: new THREE.Vector2(BLIND_W, BLIND_H) },
    }
    const v = getMaterials().vinyl
    const mat = new THREE.MeshStandardMaterial({ ...v, color: '#c4b392', roughness: 1, normalScale: new THREE.Vector2(0.4, 0.4) })
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vPaintW;')
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
          #ifdef USE_INSTANCING
            vPaintW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
          #else
            vPaintW = (modelMatrix * vec4(transformed, 1.0)).xyz;
          #endif`,
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vPaintW;
          uniform sampler2D uPaint;
          uniform float uPaintOpacity;
          uniform float uPaintGlow;
          uniform vec2 uCenter;
          uniform vec2 uSize;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          vec2 puv = (vPaintW.xy - uCenter) / uSize + 0.5;
          float inside = step(0.0, puv.x) * step(puv.x, 1.0) * step(0.0, puv.y) * step(puv.y, 1.0);
          vec4 paint = texture2D(uPaint, puv);
          float paintA = clamp(paint.a * 1.25, 0.0, 1.0) * uPaintOpacity * inside;
          diffuseColor.rgb = mix(diffuseColor.rgb, paint.rgb, paintA);`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.28, paintA); // wet paint`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          totalEmissiveRadiance += paint.rgb * paintA * uPaintGlow; // fresh paint catches the red light`,
        )
    }
    mat.userData.uniforms = uniforms
    return mat
  }, [painter, center])
}

const TILT_OPEN = 0.42
const TILT_SHUT = 1.32

export function PaintedBlinds({ center }) {
  const ref = useRef()
  const painter = useMemo(() => new Painter(), [])
  const mat = usePaintMaterial(painter, center)
  const count = 26
  const phase = useRef('idle')

  // slat tilt: open (room edge down, lets the storm in) at rest; swung shut for the secret
  const tilt = useRef(null)
  const setTilt = (a) => {
    if (tilt.current !== null && Math.abs(tilt.current - a) < 1e-4) return
    tilt.current = a
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(a, 0, 0))
    for (let i = 0; i < count; i++) {
      m.compose(new THREE.Vector3(0, 0.5 - (i + 0.5) * (1 / count), 0), q, new THREE.Vector3(1, 1, 1))
      ref.current.setMatrixAt(i, m)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }
  useLayoutEffect(() => setTilt(TILT_OPEN), [])

  useFrame((_, dt) => {
    const u = mat.userData.uniforms
    const st = secret.active ? secret.t : 0
    const shut = secret.active ? smooth(TL.glitchEnd - 0.2, TL.outEnd - 0.6, st) * (1 - smooth(TL.fadeEnd - 0.2, TL.backEnd - 0.6, st)) : 0
    setTilt(TILT_OPEN + (TILT_SHUT - TILT_OPEN) * shut)
    if (!secret.active) {
      if (phase.current !== 'idle') {
        painter.reset()
        painter.upload()
        u.uPaintOpacity.value = 0
        phase.current = 'idle'
      }
      return
    }
    phase.current = 'on'
    const t = secret.t
    if (t >= TL.paintStart) {
      // one continuous stroke; a slight ease so the hand starts deliberately
      const p = (t - TL.paintStart) / (TL.paintEnd - TL.paintStart)
      painter.paintTo(p < 1 ? 1 - Math.pow(1 - p, 1.35) : 1)
      painter.runDrips(Math.min(dt, 0.05))
      painter.upload()
    }
    u.uPaintOpacity.value = t < TL.paintStart ? 0 : 1 - smooth(TL.fadeStart, TL.fadeEnd, t)
    // a slow, uneven pulse, like something breathing behind the blinds
    const pulse = 0.85 + 0.15 * Math.sin(t * 2.1) * Math.sin(t * 0.7 + 1)
    u.uPaintGlow.value = 0.7 * pulse * u.uPaintOpacity.value
  })

  return (
    <instancedMesh ref={ref} args={[undefined, mat, count]} castShadow>
      <boxGeometry args={[0.86, 0.003, 0.046]} />
    </instancedMesh>
  )
}

// ---------------------------------------------------------------------------
// Room lighting during the sequence: the lamp stutters, the window turns red.
// ---------------------------------------------------------------------------

const NIGHT = new THREE.Color('#1d36c4')
const LIGHTNING = new THREE.Color('#c9d6ff')
const BLOOD = new THREE.Color('#2a0403')
const WIN_LIGHT = new THREE.Color('#3d5cf0')
const WIN_RED = new THREE.Color('#ff2a12')

// Deterministic flicker: mostly on, with hard drop-outs.
function flicker(t) {
  const n = Math.sin(t * 61.7) * Math.sin(t * 23.3 + 1.7) * Math.sin(t * 7.1)
  return n > 0.28 ? 0.08 : 1
}

export function useSecretLights({ lampRef, windowLightRef, backdropRef, redSpotRef }) {
  useFrame(() => {
    const t = secret.active ? secret.t : 0
    const red = secret.active ? smooth(TL.paintStart - 0.6, TL.paintStart + 1.2, t) * (1 - smooth(TL.fadeStart, TL.fadeEnd, t)) : 0
    if (lampRef.current) {
      let k = 1
      if (secret.active) {
        if (t < TL.glitchEnd + 0.2 || (t > TL.backEnd - 0.4 && t < TL.recoverEnd)) k = flicker(t)
        k *= 1 - red * 0.45
      }
      lampRef.current.userData.k = k
    }
    if (windowLightRef.current) {
      windowLightRef.current.color.copy(WIN_LIGHT).lerp(WIN_RED, red)
      windowLightRef.current.intensity = 0.9 + red * 2.4 + storm.flash * 9
    }
    if (backdropRef.current) backdropRef.current.color.copy(NIGHT).lerp(BLOOD, red).lerp(LIGHTNING, Math.min(1, storm.flash * 1.2))
    if (redSpotRef.current) redSpotRef.current.intensity = red * 9
  })
}
