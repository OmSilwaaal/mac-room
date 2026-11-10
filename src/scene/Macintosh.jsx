import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Html, RoundedBox, useCursor } from '@react-three/drei'
import { MAC, SCREEN, SCREEN_PX } from '../config'
import { getMaterials, legendAtlas, LEGEND_COLS, LEGEND_ROWS, plasticMaps } from './materials'
import MacOS from '../screen/MacOS'

function roundedRect(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

// The sloped bezel that makes the CRT read as recessed into the case.
function useBezelGeometry() {
  return useMemo(() => {
    const outer = roundedRect(0.214, 0.176, 0.012)
    const hole = roundedRect(0.198, 0.158, 0.014)
    outer.holes.push(hole)
    const g = new THREE.ExtrudeGeometry(outer, {
      depth: 0.006,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.005,
      bevelSegments: 4,
      curveSegments: 10,
    })
    return g
  }, [])
}

// Gently convex CRT glass.
function useCrtGeometry() {
  return useMemo(() => {
    const w = 0.2
    const h = 0.16
    const g = new THREE.PlaneGeometry(w, h, 32, 24)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / (w / 2)
      const y = p.getY(i) / (h / 2)
      p.setZ(i, 0.0055 * (1 - 0.5 * x * x - 0.5 * y * y))
    }
    g.computeVertexNormals()
    return g
  }, [])
}

function Case({ plastic }) {
  const bezel = useBezelGeometry()
  const crt = useCrtGeometry()
  const front = MAC.d / 2
  const lib = getMaterials()
  const dark = lib.slot
  const surround = lib.recess
  const glass = lib.crtGlass
  const vents = useMemo(() => Array.from({ length: 9 }, (_, i) => i), [])

  return (
    <group>
      {/* main shell */}
      <RoundedBox args={[MAC.w, MAC.h, MAC.d]} radius={0.011} smoothness={5} position={[0, MAC.h / 2, 0]} castShadow receiveShadow material={plastic} />

      {/* screen recess */}
      <mesh position={[0, SCREEN.y, front + 0.0005]} material={surround}>
        <shapeGeometry args={[roundedRect(0.2, 0.16, 0.014)]} />
      </mesh>
      <mesh geometry={crt} position={[0, SCREEN.y, front + 0.001]} material={glass} />
      <mesh geometry={bezel} position={[0, SCREEN.y, front]} material={plastic} castShadow receiveShadow />

      {/* floppy drive */}
      <RoundedBox args={[0.1, 0.017, 0.004]} radius={0.0018} smoothness={3} position={[0.045, 0.082, front + 0.001]} material={plastic} />
      <mesh position={[0.045, 0.082, front + 0.0032]} material={dark}>
        <boxGeometry args={[0.088, 0.0045, 0.002]} />
      </mesh>
      <mesh position={[0.084, 0.0835, front + 0.0034]} material={lib.darkPlastic}>
        <boxGeometry args={[0.012, 0.0055, 0.002]} />
      </mesh>

      {/* chin groove */}
      <mesh position={[0, 0.034, front + 0.0004]} material={dark}>
        <boxGeometry args={[MAC.w - 0.02, 0.0012, 0.001]} />
      </mesh>

      {/* small embossed badge plate (left of the drive) */}
      <RoundedBox args={[0.034, 0.008, 0.0012]} radius={0.0005} smoothness={2} position={[-0.068, 0.082, front + 0.0004]} material={lib.recess} />

      {/* side vents (right) */}
      {vents.map((i) => (
        <mesh key={i} position={[MAC.w / 2 + 0.0004, 0.022, 0.03 + i * 0.011]} material={dark}>
          <boxGeometry args={[0.001, 0.022, 0.0032]} />
        </mesh>
      ))}

      {/* carry handle recess on top */}
      <mesh position={[0, MAC.h + 0.0004, -MAC.d / 2 + 0.03]} material={dark}>
        <boxGeometry args={[0.16, 0.001, 0.022]} />
      </mesh>
    </group>
  )
}

function Screen({ arrived, near, portal }) {
  // drei maps 1 CSS px to distanceFactor / 400 world units in transform mode.
  const distanceFactor = (SCREEN.width * 400) / SCREEN_PX.w
  return (
    <group position={[0, SCREEN.y, MAC.d / 2 + SCREEN.z]}>
      {/* the screen glows on its own; it no longer lights the keyboard or desk */}
      <Html portal={portal} transform distanceFactor={distanceFactor} zIndexRange={[20, 0]} pointerEvents={arrived ? 'auto' : 'none'}>
        <MacOS arrived={arrived} near={near} />
      </Html>
    </group>
  )
}

// printed legends, in the same order as ROWS (+ keypad below)
const LEGENDS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'delete'],
  ['tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
  ['caps lock', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'return'],
  ['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'shift'],
  ['option', '⌘', '~', '', '\\', '←', '→', '↓'],
]
const KEYPAD = [
  ['clear', '=', '/', '*'],
  ['7', '8', '9', '-'],
  ['4', '5', '6', '+'],
  ['1', '2', '3', 'enter'],
  ['0', '0', '.', 'enter'],
]

const ROWS = [
  // [width in key units, isModifier]
  [[1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1.5, 1]],
  [[1.5, 1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1]],
  [[1.75, 1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1.75, 1]],
  [[2.25, 1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [1], [2.25, 1]],
  [[1.25, 1], [1.25, 1], [1.25, 1], [5.75], [1.25, 1], [1.25, 1], [1.25, 1], [1.25, 1]],
]

function Keyboard({ plastic }) {
  const keys = useMemo(() => {
    const u = 0.0186
    const out = []
    const mainW = 14.5 * u
    const totalW = mainW + 0.5 * u + 4 * u
    const x0 = -totalW / 2
    ROWS.forEach((row, ri) => {
      let x = x0
      row.forEach(([w, mod], ki) => {
        out.push({ x: x + (w * u) / 2, z: -0.045 + ri * u, w: w * u - 0.0028, mod: !!mod, label: LEGENDS[ri][ki] })
        x += w * u
      })
    })
    // numeric keypad
    const kx = x0 + mainW + 0.5 * u
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 4; c++) out.push({ x: kx + (c + 0.5) * u, z: -0.045 + r * u, w: u - 0.0028, mod: r === 0 || c === 3, label: KEYPAD[r][c] })
    return out
  }, [])

  // unique labels -> atlas cells
  const { atlas, cells } = useMemo(() => {
    const uniq = [...new Set(keys.map((k) => k.label))]
    return { atlas: legendAtlas(uniq), cells: keys.map((k) => uniq.indexOf(k.label)) }
  }, [keys])

  const keyMat = useMemo(() => {
    // key faces are ~19 mm of a 0..1 UV; plastic tiles are ~0.4 m
    const mat = new THREE.MeshPhysicalMaterial({ ...plasticMaps(0.05), roughness: 1, clearcoat: 0.1, sheen: 0.2, normalScale: new THREE.Vector2(0.08, 0.08) })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uLegend = { value: atlas }
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute float aLegend;
          varying vec2 vLegUV;
          varying float vLegMask;`,
        )
        .replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>
          {
            // keep glyphs undistorted on wide keys: rescale u by the key's aspect
            float sx = length(instanceMatrix[0].xyz);
            float sz = length(instanceMatrix[2].xyz);
            vec2 luv = vec2((uv.x - 0.5) * sx / sz + 0.5, uv.y);
            float col = mod(aLegend, ${LEGEND_COLS}.0);
            float row = floor(aLegend / ${LEGEND_COLS}.0);
            vLegUV = vec2((col + luv.x) / ${LEGEND_COLS}.0, (${LEGEND_ROWS - 1}.0 - row + luv.y) / ${LEGEND_ROWS}.0);
            // top faces only, and only inside the glyph's own cell
            vLegMask = step(0.5, normal.y) * step(0.0, luv.x) * step(luv.x, 1.0);
          }`,
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform sampler2D uLegend;
          varying vec2 vLegUV;
          varying float vLegMask;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float legend = texture2D(uLegend, vLegUV).a * vLegMask;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.11, 0.10), legend * 0.9);`,
        )
    }
    mat.customProgramCacheKey = () => 'keycap-legends'
    return mat
  }, [atlas])

  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1)
    g.setAttribute('aLegend', new THREE.InstancedBufferAttribute(new Float32Array(cells), 1))
    return g
  }, [cells])

  const ref = (mesh) => {
    if (!mesh) return
    const m = new THREE.Matrix4()
    const c = new THREE.Color()
    keys.forEach((k, i) => {
      m.compose(new THREE.Vector3(k.x, 0, k.z), new THREE.Quaternion(), new THREE.Vector3(k.w, 0.0085, 0.0158))
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, c.set(k.mod ? '#b9af98' : '#ddd5c2'))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }

  return (
    <group position={[-0.01, 0, 0.255]} rotation={[0.05, 0.02, 0]}>
      <RoundedBox args={[0.41, 0.026, 0.146]} radius={0.008} smoothness={4} position={[0, 0.013, 0]} material={plastic} castShadow receiveShadow />
      <instancedMesh ref={ref} args={[geo, keyMat, keys.length]} position={[0, 0.03, 0.002]} castShadow receiveShadow />
    </group>
  )
}

function Mouse({ plastic }) {
  const cable = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      [
        [0.3, 0.008, 0.215],
        [0.33, 0.003, 0.14],
        [0.28, 0.003, 0.06],
        [0.21, 0.003, -0.02],
        [0.17, 0.004, -0.11],
        [0.124, 0.01, -0.15],
      ].map((p) => new THREE.Vector3(...p)),
    )
    return new THREE.TubeGeometry(curve, 80, 0.0021, 8, false)
  }, [])
  return (
    <group>
      <group position={[0.3, 0, 0.27]} rotation={[0, -0.12, 0]}>
        <RoundedBox args={[0.058, 0.03, 0.1]} radius={0.011} smoothness={4} position={[0, 0.015, 0]} material={plastic} castShadow receiveShadow />
        <RoundedBox args={[0.048, 0.004, 0.034]} radius={0.0018} smoothness={3} position={[0, 0.0305, -0.03]} material={getMaterials().mouseButton} />
      </group>
      <mesh geometry={cable} material={getMaterials().cable} castShadow />
    </group>
  )
}

export default function Macintosh({ arrived, near, onApproach, portal }) {
  const { macPlastic: plastic, keyboardPlastic: keyPlastic } = getMaterials()
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && !arrived)

  return (
    <group position={MAC.pos}>
      <group
        onPointerOver={(e) => (e.stopPropagation(), setHovered(true))}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation()
          if (!arrived) onApproach?.()
        }}
      >
        <Case plastic={plastic} />
      </group>
      <Screen arrived={arrived} near={near} portal={portal} />
      <Keyboard plastic={keyPlastic} />
      <Mouse plastic={plastic} />
    </group>
  )
}
