import * as THREE from 'three'

// All textures are generated procedurally on a canvas, so the scene ships no image assets.

function rng(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

function finish(canvas, { srgb = true, repeat = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(canvas)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat[0], repeat[1])
  t.anisotropy = 8
  t.needsUpdate = true
  return t
}

function grain(g, w, h, r, amount, tint = [1, 0.85, 0.7]) {
  const img = g.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount
    d[i] += n * tint[0]
    d[i + 1] += n * tint[1]
    d[i + 2] += n * tint[2]
  }
  g.putImageData(img, 0, 0)
}

// Wood with grain running along U. Sine frequencies are whole cycles so it tiles.
function woodCanvas({ size = 1024, base, dark, light, seed, lines = 220, planks = 0 }) {
  const [c, g] = makeCanvas(size, size)
  const r = rng(seed)
  g.fillStyle = base
  g.fillRect(0, 0, size, size)
  const TAU = Math.PI * 2
  for (let i = 0; i < lines; i++) {
    const y = r() * size
    const amp = 1 + r() * 9
    const k1 = 1 + Math.floor(r() * 4)
    const k2 = 3 + Math.floor(r() * 6)
    const ph = r() * TAU
    g.strokeStyle = r() < 0.62 ? dark(r) : light(r)
    g.lineWidth = 0.6 + r() * 2.6
    g.beginPath()
    for (let x = 0; x <= size; x += 6) {
      const u = (x / size) * TAU
      const yy = y + Math.sin(u * k1 + ph) * amp + Math.sin(u * k2 + ph * 2) * amp * 0.25
      x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy)
    }
    g.stroke()
  }
  if (planks) {
    g.fillStyle = 'rgba(10,4,2,0.55)'
    for (let p = 0; p < planks; p++) g.fillRect(0, (p / planks) * size, size, 2)
  }
  grain(g, size, size, r, 16)
  return c
}

const cache = new Map()
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn())
  return cache.get(key)
}

export const deskWood = () =>
  cached('deskWood', () =>
    finish(
      woodCanvas({
        base: '#5a2e18',
        dark: (r) => `rgba(28,10,4,${0.1 + r() * 0.22})`,
        light: (r) => `rgba(170,96,52,${0.05 + r() * 0.12})`,
        seed: 11,
      }),
      { repeat: [1.4, 1] },
    ),
  )

export const darkWood = () =>
  cached('darkWood', () =>
    finish(
      woodCanvas({
        base: '#3a1f12',
        dark: (r) => `rgba(12,5,2,${0.12 + r() * 0.22})`,
        light: (r) => `rgba(120,70,40,${0.05 + r() * 0.1})`,
        seed: 23,
      }),
    ),
  )

export const floorWood = () =>
  cached('floorWood', () =>
    finish(
      woodCanvas({
        base: '#2c1a10',
        dark: (r) => `rgba(8,3,1,${0.12 + r() * 0.2})`,
        light: (r) => `rgba(110,66,38,${0.04 + r() * 0.08})`,
        seed: 5,
        planks: 6,
      }),
      { repeat: [3, 3] },
    ),
  )

// Greyscale value noise, used for roughness / bump imperfections.
export const noiseTex = (key, { size = 256, lo = 110, hi = 160, blotch = 40, seed = 3, repeat = [1, 1] } = {}) =>
  cached('noise:' + key, () => {
    const [c, g] = makeCanvas(size, size)
    const r = rng(seed)
    g.fillStyle = `rgb(${(lo + hi) / 2},${(lo + hi) / 2},${(lo + hi) / 2})`
    g.fillRect(0, 0, size, size)
    for (let i = 0; i < blotch; i++) {
      const x = r() * size
      const y = r() * size
      const rad = 6 + r() * size * 0.25
      const v = lo + r() * (hi - lo)
      const grd = g.createRadialGradient(x, y, 0, x, y, rad)
      grd.addColorStop(0, `rgba(${v},${v},${v},0.35)`)
      grd.addColorStop(1, `rgba(${v},${v},${v},0)`)
      g.fillStyle = grd
      g.fillRect(0, 0, size, size)
    }
    grain(g, size, size, r, 22, [1, 1, 1])
    return finish(c, { srgb: false, repeat })
  })

export const plaster = () =>
  cached('plaster', () => {
    const [c, g] = makeCanvas(512, 512)
    const r = rng(41)
    g.fillStyle = '#6a5f53'
    g.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 90; i++) {
      const x = r() * 512
      const y = r() * 512
      const rad = 20 + r() * 140
      const grd = g.createRadialGradient(x, y, 0, x, y, rad)
      const l = r() < 0.5 ? '255,240,220' : '20,12,6'
      grd.addColorStop(0, `rgba(${l},0.035)`)
      grd.addColorStop(1, `rgba(${l},0)`)
      g.fillStyle = grd
      g.fillRect(0, 0, 512, 512)
    }
    grain(g, 512, 512, r, 10)
    return finish(c, { repeat: [3, 2] })
  })

// Muted abstract print for the frame on the back wall.
export const printTex = () =>
  cached('print', () => {
    const [c, g] = makeCanvas(384, 512)
    const r = rng(77)
    g.fillStyle = '#d9cdb4'
    g.fillRect(0, 0, 384, 512)
    g.fillStyle = '#9a5a3a'
    g.beginPath()
    g.arc(200, 210, 96, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#34413a'
    g.fillRect(60, 300, 264, 120)
    g.fillStyle = '#c2a36a'
    g.fillRect(60, 300, 90, 120)
    grain(g, 384, 512, r, 18)
    return finish(c)
  })

// Faint ruled lines for loose paper on the desk.
export const paperTex = () =>
  cached('paper', () => {
    const [c, g] = makeCanvas(256, 362)
    const r = rng(9)
    g.fillStyle = '#e6dcc6'
    g.fillRect(0, 0, 256, 362)
    g.fillStyle = 'rgba(60,50,40,0.28)'
    for (let y = 40; y < 340; y += 14) {
      const len = 120 + r() * 100
      g.fillRect(24, y, len, 1.5)
    }
    grain(g, 256, 362, r, 10)
    return finish(c)
  })
