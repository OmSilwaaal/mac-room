import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Procedural PBR texture library. Every surface in the room gets a colour map,
// a roughness map and a normal map generated on a canvas at startup, so the
// scene ships no image files and nothing is a flat colour.
//
// UV conventions in this scene:
//   - drei <RoundedBox> (ExtrudeGeometry) has object-space UVs: 1 unit = 1 metre.
//   - BoxGeometry / PlaneGeometry / cylinders use 0..1 per face.
// Each material sets its own repeat so detail lands at a believable scale.
// ---------------------------------------------------------------------------

function rng(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

function canvas(w, h = w) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d', { willReadFrequently: true })]
}

const cache = new Map()
const once = (key, fn) => {
  if (!cache.has(key)) cache.set(key, fn())
  return cache.get(key)
}

// --- tileable value noise / fBm -------------------------------------------

function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

// fbm(w, h, { cells, octaves, seed, stretch }) -> Float32Array in ~[0,1], tiles seamlessly.
function fbm(w, h, { cells = 8, octaves = 4, seed = 1, gain = 0.5, stretchX = 1, stretchY = 1 } = {}) {
  const out = new Float32Array(w * h)
  let amp = 1
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    const cx = Math.max(1, Math.round(cells * stretchX * 2 ** o))
    const cy = Math.max(1, Math.round(cells * stretchY * 2 ** o))
    const s = seed * 131 + o * 7919
    for (let y = 0; y < h; y++) {
      const fy = (y / h) * cy
      const iy = Math.floor(fy)
      let ty = fy - iy
      ty = ty * ty * (3 - 2 * ty)
      const y0 = iy % cy
      const y1 = (iy + 1) % cy
      for (let x = 0; x < w; x++) {
        const fx = (x / w) * cx
        const ix = Math.floor(fx)
        let tx = fx - ix
        tx = tx * tx * (3 - 2 * tx)
        const x0 = ix % cx
        const x1 = (ix + 1) % cx
        const a = hash2(x0, y0, s)
        const b = hash2(x1, y0, s)
        const c = hash2(x0, y1, s)
        const d = hash2(x1, y1, s)
        out[y * w + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty)
      }
    }
    norm += amp
    amp *= gain
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm
  return out
}

// --- converters ------------------------------------------------------------

function grayToCanvas(field, w, h, lo = 0, hi = 255) {
  const [c, g] = canvas(w, h)
  const img = g.createImageData(w, h)
  for (let i = 0; i < w * h; i++) {
    const v = lo + Math.min(1, Math.max(0, field[i])) * (hi - lo)
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  g.putImageData(img, 0, 0)
  return c
}

function luminance(c) {
  const g = c.getContext('2d', { willReadFrequently: true })
  const d = g.getImageData(0, 0, c.width, c.height).data
  const out = new Float32Array(c.width * c.height)
  for (let i = 0; i < out.length; i++) out[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255
  return out
}

// Sobel height -> tangent-space normal map (wraps at the edges so it tiles).
function normalFromHeight(field, w, h, strength = 2) {
  const [c, g] = canvas(w, h)
  const img = g.createImageData(w, h)
  const at = (x, y) => field[((y + h) % h) * w + ((x + w) % w)]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
      const dy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
      let nx = -dx * strength
      let ny = dy * strength // canvas rows run down, texture v runs up
      let nz = 1
      const l = Math.hypot(nx, ny, nz)
      nx /= l
      ny /= l
      nz /= l
      const i = (y * w + x) * 4
      img.data[i] = (nx * 0.5 + 0.5) * 255
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  return c
}

function toTex(c, { srgb = false, repeat = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat[0], repeat[1])
  t.anisotropy = 8
  t.needsUpdate = true
  return t
}

// Build a {map, roughnessMap, normalMap} set from canvases.
function pbr({ color, rough, height, w, h, strength = 2 }) {
  return {
    map: color ? toTex(color, { srgb: true }) : null,
    roughnessMap: rough ? toTex(rough) : null,
    normalMap: height ? toTex(normalFromHeight(height, w, h, strength)) : null,
  }
}

// Same images, own repeat (textures share their source, so this is cheap).
function withRepeat(set, rx, ry = rx) {
  const out = {}
  for (const k of Object.keys(set)) {
    if (!set[k]) continue
    const t = set[k].clone()
    t.repeat.set(rx, ry)
    t.needsUpdate = true
    out[k] = t
  }
  return out
}

function addGrain(g, w, h, r, amount, tint = [1, 1, 1]) {
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

// --- generators -------------------------------------------------------------

function woodSet(key, { size = 1024, base, dark, light, seed, planks = 0, lines = 240 }) {
  return once('wood:' + key, () => {
    const [c, g] = canvas(size)
    const r = rng(seed)
    g.fillStyle = base
    g.fillRect(0, 0, size, size)
    // broad figure first so the grain sits on uneven tone
    const figure = fbm(size, size, { cells: 3, octaves: 3, seed, stretchX: 0.4, stretchY: 2.5 })
    const img = g.getImageData(0, 0, size, size)
    for (let i = 0; i < figure.length; i++) {
      const k = 0.82 + figure[i] * 0.36
      img.data[i * 4] *= k
      img.data[i * 4 + 1] *= k
      img.data[i * 4 + 2] *= k
    }
    g.putImageData(img, 0, 0)
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
      g.fillStyle = 'rgba(8,3,1,0.65)'
      for (let p = 0; p < planks; p++) g.fillRect(0, (p / planks) * size, size, 2)
      // staggered butt joints
      for (let p = 0; p < planks; p++) g.fillRect(((p * 0.37 + 0.13) % 1) * size, (p / planks) * size, 2, size / planks)
    }
    addGrain(g, size, size, r, 14, [1, 0.85, 0.7])

    // height: grain lines are grooves, plus fine pores
    const lum = luminance(c)
    const pores = fbm(size, size, { cells: 64, octaves: 2, seed: seed + 3, stretchX: 0.25, stretchY: 2 })
    const height = new Float32Array(lum.length)
    for (let i = 0; i < lum.length; i++) height[i] = lum[i] * 0.8 + pores[i] * 0.2
    if (planks) {
      for (let p = 0; p < planks; p++) {
        const row = Math.floor((p / planks) * size)
        for (let x = 0; x < size; x++) for (let k = 0; k < 2; k++) height[((row + k) % size) * size + x] = 0
      }
    }
    // roughness: worn (smoother) patches + rougher in the grain
    const wear = fbm(size, size, { cells: 4, octaves: 3, seed: seed + 9 })
    const rough = new Float32Array(lum.length)
    for (let i = 0; i < lum.length; i++) rough[i] = 0.35 + wear[i] * 0.4 + (1 - lum[i]) * 0.25
    return pbr({ color: c, rough: grayToCanvas(rough, size, size), height, w: size, h: size, strength: 3 })
  })
}

// Grey (near-white) so material.color tints it; carries orange peel, yellowing and smudges.
function plasticSet() {
  return once('plastic', () => {
    const size = 1024
    const r = rng(17)
    const tone = fbm(size, size, { cells: 4, octaves: 4, seed: 4 })
    const peel = fbm(size, size, { cells: 384, octaves: 2, seed: 5, gain: 0.5 })
    const [c, g] = canvas(size)
    const img = g.createImageData(size, size)
    for (let i = 0; i < size * size; i++) {
      // gentle yellowing in the low frequencies
      const t = tone[i]
      img.data[i * 4] = 236 + t * 14
      img.data[i * 4 + 1] = 234 + t * 10
      img.data[i * 4 + 2] = 226 - t * 6
      img.data[i * 4 + 3] = 255
    }
    g.putImageData(img, 0, 0)
    // dust and dirt specks
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(70,58,40,${0.05 + r() * 0.18})`
      const s = 0.6 + r() * 1.6
      g.fillRect(r() * size, r() * size, s, s)
    }
    addGrain(g, size, size, r, 5)

    // roughness: satin base, fingerprint smudges are glossier
    const [rc, rg] = canvas(size)
    const rough = grayToCanvas(
      peel.map((v, i) => 0.42 + v * 0.12 + tone[i] * 0.12),
      size,
      size,
    )
    rg.drawImage(rough, 0, 0)
    for (let i = 0; i < 26; i++) {
      const x = r() * size
      const y = r() * size
      const rad = 14 + r() * 34
      const grd = rg.createRadialGradient(x, y, 0, x, y, rad)
      grd.addColorStop(0, 'rgba(60,60,60,0.45)')
      grd.addColorStop(1, 'rgba(60,60,60,0)')
      rg.fillStyle = grd
      rg.save()
      rg.translate(x, y)
      rg.scale(1, 0.7 + r() * 0.4)
      rg.translate(-x, -y)
      rg.fillRect(x - rad, y - rad, rad * 2, rad * 2)
      rg.restore()
    }
    return pbr({ color: c, rough: rc, height: peel, w: size, h: size, strength: 0.8 })
  })
}

function brushedMetalSet() {
  return once('brushed', () => {
    const size = 512
    const r = rng(29)
    const streak = fbm(size, size, { cells: 2, octaves: 5, seed: 8, stretchX: 0.5, stretchY: 40, gain: 0.6 })
    const patina = fbm(size, size, { cells: 5, octaves: 4, seed: 9 })
    const [c, g] = canvas(size)
    const img = g.createImageData(size, size)
    for (let i = 0; i < size * size; i++) {
      // tarnish: darker, slightly greener patches
      const p = Math.max(0, patina[i] - 0.55) * 2.2
      const s = 0.9 + streak[i] * 0.1
      img.data[i * 4] = 255 * s * (1 - p * 0.45)
      img.data[i * 4 + 1] = 255 * s * (1 - p * 0.38)
      img.data[i * 4 + 2] = 255 * s * (1 - p * 0.5)
      img.data[i * 4 + 3] = 255
    }
    g.putImageData(img, 0, 0)
    addGrain(g, size, size, r, 6)
    const rough = streak.map((v, i) => 0.22 + v * 0.18 + Math.max(0, patina[i] - 0.5) * 0.6)
    return pbr({ color: c, rough: grayToCanvas(rough, size, size), height: streak, w: size, h: size, strength: 1.2 })
  })
}

function glassShadeSet() {
  return once('shadeGlass', () => {
    const size = 512
    const ripple = fbm(size, size, { cells: 3, octaves: 3, seed: 12, stretchX: 6, stretchY: 0.4 })
    const tone = fbm(size, size, { cells: 6, octaves: 3, seed: 13 })
    const c = grayToCanvas(
      tone.map((v) => 0.86 + v * 0.14),
      size,
      size,
    )
    const rough = tone.map((v, i) => 0.08 + Math.max(0, v - 0.6) * 0.18 + ripple[i] * 0.03)
    return pbr({ color: c, rough: grayToCanvas(rough, size, size), height: ripple, w: size, h: size, strength: 0.9 })
  })
}

// Book cloth / linen: woven threads, grey so each cover tints it.
function clothSet() {
  return once('cloth', () => {
    const size = 512
    const r = rng(41)
    const slub = fbm(size, size, { cells: 32, octaves: 2, seed: 15, stretchX: 0.2, stretchY: 1 })
    const height = new Float32Array(size * size)
    const period = 4
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const warp = 0.5 + 0.5 * Math.cos(((x % period) / period) * Math.PI * 2)
        const weft = 0.5 + 0.5 * Math.cos(((y % period) / period) * Math.PI * 2)
        const over = (Math.floor(x / period) + Math.floor(y / period)) % 2 ? warp : weft
        height[y * size + x] = over * 0.7 + slub[y * size + x] * 0.3
      }
    }
    const c = grayToCanvas(
      height.map((v) => 0.78 + v * 0.22),
      size,
      size,
    )
    const g = c.getContext('2d')
    addGrain(g, size, size, r, 10)
    // scuffs
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.06})`
      g.fillRect(r() * size, r() * size, 6 + r() * 40, 1 + r() * 2)
    }
    const rough = height.map((v) => 0.72 + v * 0.2)
    return pbr({ color: c, rough: grayToCanvas(rough, size, size), height, w: size, h: size, strength: 1.6 })
  })
}

function leatherSet() {
  return once('leather', () => {
    const size = 512
    const pebble = fbm(size, size, { cells: 48, octaves: 3, seed: 21 })
    const crease = fbm(size, size, { cells: 6, octaves: 4, seed: 22 })
    const height = pebble.map((v, i) => v * 0.7 + Math.abs(crease[i] - 0.5) * 0.6)
    const c = grayToCanvas(
      height.map((v) => 0.75 + v * 0.25),
      size,
      size,
    )
    const rough = height.map((v) => 0.55 + (1 - v) * 0.25)
    return pbr({ color: c, rough: grayToCanvas(rough, size, size), height, w: size, h: size, strength: 2.2 })
  })
}

function ceramicSet() {
  return once('ceramic', () => {
    const size = 512
    const r = rng(51)
    const pool = fbm(size, size, { cells: 4, octaves: 4, seed: 31, stretchX: 0.6, stretchY: 1.6 })
    const c = grayToCanvas(
      pool.map((v) => 0.8 + v * 0.2),
      size,
      size,
    )
    const g = c.getContext('2d')
    // iron speckle in the glaze
    for (let i = 0; i < 700; i++) {
      g.fillStyle = `rgba(40,30,20,${0.2 + r() * 0.45})`
      const s = 0.8 + r() * 1.8
      g.beginPath()
      g.arc(r() * size, r() * size, s, 0, Math.PI * 2)
      g.fill()
    }
    const rough = pool.map((v) => 0.12 + v * 0.22)
    const height = fbm(size, size, { cells: 40, octaves: 2, seed: 33 })
    return pbr({ color: c, rough: grayToCanvas(rough, size, size), height, w: size, h: size, strength: 0.8 })
  })
}

function plasterSet() {
  return once('plaster', () => {
    const size = 1024
    const r = rng(41)
    const [c, g] = canvas(size)
    g.fillStyle = '#6a5f53'
    g.fillRect(0, 0, size, size)
    const tone = fbm(size, size, { cells: 4, octaves: 5, seed: 61 })
    const img = g.getImageData(0, 0, size, size)
    for (let i = 0; i < tone.length; i++) {
      const k = 0.86 + tone[i] * 0.28
      img.data[i * 4] *= k
      img.data[i * 4 + 1] *= k
      img.data[i * 4 + 2] *= k
    }
    g.putImageData(img, 0, 0)
    addGrain(g, size, size, r, 8)
    const trowel = fbm(size, size, { cells: 10, octaves: 4, seed: 62, gain: 0.6 })
    const sand = fbm(size, size, { cells: 160, octaves: 1, seed: 63 })
    const height = trowel.map((v, i) => v * 0.75 + sand[i] * 0.25)
    const rough = height.map((v) => 0.82 + v * 0.15)
    return pbr({ color: c, rough: grayToCanvas(rough, size, size), height, w: size, h: size, strength: 1.4 })
  })
}

function paperFiberSet() {
  return once('paperFiber', () => {
    const size = 512
    const fiber = fbm(size, size, { cells: 64, octaves: 3, seed: 71, stretchX: 3, stretchY: 0.4 })
    const cockle = fbm(size, size, { cells: 3, octaves: 3, seed: 72 })
    const height = fiber.map((v, i) => v * 0.4 + cockle[i] * 0.6)
    const rough = fiber.map((v) => 0.82 + v * 0.15)
    return { roughnessMap: toTex(grayToCanvas(rough, size, size)), normalMap: toTex(normalFromHeight(height, size, size, 1.6)) }
  })
}

function rubberSet() {
  return once('rubber', () => {
    const size = 256
    const n = fbm(size, size, { cells: 32, octaves: 3, seed: 81 })
    const c = grayToCanvas(
      n.map((v) => 0.88 + v * 0.12),
      size,
      size,
    )
    return pbr({ color: c, rough: grayToCanvas(n.map((v) => 0.5 + v * 0.25), size, size), height: n, w: size, h: size, strength: 1 })
  })
}

function vinylSet() {
  return once('vinyl', () => {
    const size = 512
    const streak = fbm(size, size, { cells: 2, octaves: 4, seed: 91, stretchX: 0.3, stretchY: 24 })
    const dust = fbm(size, size, { cells: 6, octaves: 3, seed: 92 })
    const c = grayToCanvas(
      streak.map((v, i) => 0.84 + v * 0.1 + dust[i] * 0.06),
      size,
      size,
    )
    const rough = dust.map((v) => 0.45 + v * 0.3)
    return pbr({ color: c, rough: grayToCanvas(rough, size, size), height: streak, w: size, h: size, strength: 0.8 })
  })
}

// CRT glass: mostly mirror, with dust and a couple of finger smears.
function crtGlassRoughness() {
  return once('crtRough', () => {
    const size = 512
    const r = rng(101)
    const n = fbm(size, size, { cells: 8, octaves: 4, seed: 102 })
    const [c, g] = [grayToCanvas(n.map((v) => 0.04 + Math.max(0, v - 0.55) * 0.3), size, size), null]
    const gg = c.getContext('2d')
    for (let i = 0; i < 5; i++) {
      const x = r() * size
      const y = r() * size
      gg.strokeStyle = 'rgba(90,90,90,0.25)'
      gg.lineWidth = 10 + r() * 14
      gg.lineCap = 'round'
      gg.beginPath()
      gg.moveTo(x, y)
      gg.quadraticCurveTo(x + (r() - 0.5) * 120, y + (r() - 0.5) * 60, x + (r() - 0.5) * 160, y + (r() - 0.5) * 90)
      gg.stroke()
    }
    for (let i = 0; i < 400; i++) {
      gg.fillStyle = `rgba(200,200,200,${0.2 + r() * 0.5})`
      gg.fillRect(r() * size, r() * size, 1, 1)
    }
    void g
    return toTex(c)
  })
}

// --- one-off printed / painted surfaces -------------------------------------

export function spineTexture(i, hex) {
  return once('spine:' + i, () => {
    const [c, g] = canvas(512, 128)
    const r = rng(200 + i)
    g.fillStyle = hex
    g.fillRect(0, 0, 512, 128)
    const gilt = '#c9a45c'
    // raised bands and a title block, gilt
    g.fillStyle = gilt
    const bands = [0.08, 0.14, 0.86, 0.92]
    for (const b of bands) g.fillRect(b * 512, 10, 3, 108)
    g.fillRect(0.3 * 512, 48, (0.25 + r() * 0.15) * 512, 9)
    g.fillRect(0.3 * 512, 70, (0.12 + r() * 0.1) * 512, 6)
    g.globalAlpha = 0.25
    g.fillStyle = '#000'
    g.fillRect(0, 0, 512, 6)
    g.fillRect(0, 122, 512, 6)
    g.globalAlpha = 1
    addGrain(g, 512, 128, r, 20)
    return toTex(c, { srgb: true })
  })
}

export function pageEdgeTexture() {
  return once('pageEdge', () => {
    const [c, g] = canvas(256, 256)
    const r = rng(300)
    g.fillStyle = '#d6c8a6'
    g.fillRect(0, 0, 256, 256)
    for (let y = 0; y < 256; y += 1.5) {
      g.fillStyle = `rgba(90,70,40,${0.05 + r() * 0.12})`
      g.fillRect(0, y, 256, 0.7)
    }
    // foxing toward the edges
    for (let i = 0; i < 20; i++) {
      const x = r() * 256
      const y = r() * 256
      const grd = g.createRadialGradient(x, y, 0, x, y, 8 + r() * 30)
      grd.addColorStop(0, 'rgba(120,80,30,0.12)')
      grd.addColorStop(1, 'rgba(120,80,30,0)')
      g.fillStyle = grd
      g.fillRect(0, 0, 256, 256)
    }
    return toTex(c, { srgb: true })
  })
}

export function typedPageTexture() {
  return once('typed', () => {
    const [c, g] = canvas(512, 724)
    const r = rng(400)
    g.fillStyle = '#e4dac3'
    g.fillRect(0, 0, 512, 724)
    g.fillStyle = 'rgba(35,30,28,0.78)'
    let y = 80
    // heading
    g.fillRect(56, 50, 180, 8)
    while (y < 660) {
      if (r() < 0.12) {
        y += 18
        continue
      }
      let x = 56
      const end = 56 + (r() < 0.2 ? 200 + r() * 150 : 400)
      while (x < end) {
        const wlen = 10 + r() * 34
        g.fillRect(x, y, Math.min(wlen, end - x), 4)
        x += wlen + 6
      }
      y += 13
    }
    addGrain(g, 512, 724, r, 10)
    return toTex(c, { srgb: true })
  })
}

export function floppyLabelTexture() {
  return once('floppyLabel', () => {
    const [c, g] = canvas(256, 160)
    const r = rng(500)
    g.fillStyle = '#ebe5d6'
    g.fillRect(0, 0, 256, 160)
    g.strokeStyle = 'rgba(120,140,180,0.5)'
    g.lineWidth = 1
    for (let y = 40; y < 160; y += 22) {
      g.beginPath()
      g.moveTo(10, y)
      g.lineTo(246, y)
      g.stroke()
    }
    g.fillStyle = 'rgba(30,40,90,0.85)'
    g.font = 'italic 26px "Marker Felt", "Comic Sans MS", cursive'
    g.fillText('om — backup', 18, 34)
    g.font = 'italic 18px "Marker Felt", "Comic Sans MS", cursive'
    g.fillText('do not erase', 22, 58)
    addGrain(g, 256, 160, r, 12)
    return toTex(c, { srgb: true })
  })
}

export function coffeeTexture() {
  return once('coffee', () => {
    const [c, g] = canvas(256)
    const grd = g.createRadialGradient(128, 128, 20, 128, 128, 128)
    grd.addColorStop(0, '#2a150a')
    grd.addColorStop(0.82, '#1c0e06')
    grd.addColorStop(0.92, '#5a3418')
    grd.addColorStop(1, '#3a200e')
    g.fillStyle = grd
    g.fillRect(0, 0, 256, 256)
    addGrain(g, 256, 256, rng(600), 10)
    return toTex(c, { srgb: true })
  })
}

// Key legends: 16 x 8 atlas, white glyphs on transparent.
export const LEGEND_COLS = 16
export const LEGEND_ROWS = 8
export function legendAtlas(labels) {
  return once('legends', () => {
    const cell = 64
    const [c, g] = canvas(LEGEND_COLS * cell, LEGEND_ROWS * cell)
    g.clearRect(0, 0, c.width, c.height)
    g.fillStyle = '#fff'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    labels.forEach((label, i) => {
      if (!label) return
      const col = i % LEGEND_COLS
      const row = Math.floor(i / LEGEND_COLS)
      const short = label.length <= 2
      g.font = `${short ? 600 : 500} ${short ? 26 : 13}px "Helvetica Neue", Helvetica, Arial, sans-serif`
      // legends sit high on the cap, like the originals
      g.fillText(label, col * cell + cell / 2, row * cell + cell * (short ? 0.42 : 0.4))
    })
    const t = toTex(c)
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
    return t
  })
}

// --- material library -------------------------------------------------------

export function getMaterials() {
  return once('materials', () => {
    const desk = woodSet('desk', {
      base: '#5a2e18',
      dark: (r) => `rgba(28,10,4,${0.1 + r() * 0.22})`,
      light: (r) => `rgba(170,96,52,${0.05 + r() * 0.12})`,
      seed: 11,
    })
    const dark = woodSet('dark', {
      base: '#3a1f12',
      dark: (r) => `rgba(12,5,2,${0.12 + r() * 0.22})`,
      light: (r) => `rgba(120,70,40,${0.05 + r() * 0.1})`,
      seed: 23,
    })
    const ebony = woodSet('ebony', {
      size: 512,
      base: '#24160d',
      dark: (r) => `rgba(6,3,1,${0.15 + r() * 0.2})`,
      light: (r) => `rgba(90,55,30,${0.05 + r() * 0.1})`,
      seed: 37,
    })
    const floor = woodSet('floor', {
      base: '#2c1a10',
      dark: (r) => `rgba(8,3,1,${0.12 + r() * 0.2})`,
      light: (r) => `rgba(110,66,38,${0.04 + r() * 0.08})`,
      seed: 5,
      planks: 6,
    })
    const plaster = plasterSet()
    const plastic = plasticSet()
    const brushed = brushedMetalSet()
    const cloth = clothSet()
    const leather = leatherSet()
    const ceramic = ceramicSet()
    const rubber = rubberSet()
    const fiber = paperFiberSet()
    const vinyl = vinylSet()
    const glass = glassShadeSet()

    // RoundedBox UVs are metres: these repeats give ~0.4 m plastic tiles etc.
    const P = (rep) => withRepeat(plastic, rep)

    const m = {
      // wood
      desk: new THREE.MeshPhysicalMaterial({ ...withRepeat(desk, 1.4, 1), roughness: 1, clearcoat: 0.35, clearcoatRoughness: 0.3, normalScale: new THREE.Vector2(0.6, 0.6) }),
      deskSide: new THREE.MeshStandardMaterial({ ...dark, roughness: 1, normalScale: new THREE.Vector2(0.5, 0.5) }),
      deskSideRB: new THREE.MeshStandardMaterial({ ...withRepeat(dark, 2.2), roughness: 1, normalScale: new THREE.Vector2(0.5, 0.5) }),
      floor: new THREE.MeshStandardMaterial({ ...withRepeat(floor, 3, 3), roughness: 1, normalScale: new THREE.Vector2(0.8, 0.8) }),
      trim: new THREE.MeshStandardMaterial({ ...ebony, roughness: 1, normalScale: new THREE.Vector2(0.5, 0.5) }),
      wall: new THREE.MeshStandardMaterial({ ...withRepeat(plaster, 3, 1.2), roughness: 1, normalScale: new THREE.Vector2(0.4, 0.4) }),

      // metal
      brass: new THREE.MeshPhysicalMaterial({ ...brushed, color: '#c09656', metalness: 1, roughness: 1, clearcoat: 0.15 }),
      brassRB: new THREE.MeshPhysicalMaterial({ ...withRepeat(brushed, 4), color: '#c09656', metalness: 1, roughness: 1, clearcoat: 0.15 }),
      steel: new THREE.MeshStandardMaterial({ ...withRepeat(brushed, 0.5), color: '#b4b8bd', metalness: 1, roughness: 1 }),

      // plastics (case is a RoundedBox in metres; floppy/keys are unit boxes)
      macPlastic: new THREE.MeshPhysicalMaterial({ ...P(2.5), color: '#e0d6bd', roughness: 1, clearcoat: 0.18, clearcoatRoughness: 0.55, sheen: 0.15, sheenColor: new THREE.Color('#fff6e4'), normalScale: new THREE.Vector2(0.1, 0.1) }),
      keyboardPlastic: new THREE.MeshPhysicalMaterial({ ...P(2.5), color: '#d3cab3', roughness: 1, clearcoat: 0.12, clearcoatRoughness: 0.6, normalScale: new THREE.Vector2(0.1, 0.1) }),
      mouseButton: new THREE.MeshPhysicalMaterial({ ...P(3), color: '#c4ad7c', roughness: 1, clearcoat: 0.3, normalScale: new THREE.Vector2(0.1, 0.1) }),
      darkPlastic: new THREE.MeshStandardMaterial({ ...P(0.3), color: '#2a2622', roughness: 1, normalScale: new THREE.Vector2(0.4, 0.4) }),
      recess: new THREE.MeshStandardMaterial({ ...P(2.5), color: '#4a4740', roughness: 1, normalScale: new THREE.Vector2(0.1, 0.1) }),
      slot: new THREE.MeshStandardMaterial({ ...P(1), color: '#141210', roughness: 1 }),
      floppy: new THREE.MeshStandardMaterial({ ...P(0.25), color: '#2b2c30', roughness: 1, normalScale: new THREE.Vector2(0.4, 0.4) }),
      cable: new THREE.MeshStandardMaterial({ ...withRepeat(rubber, 40, 1), color: '#d2c9b2', roughness: 1 }),

      crtGlass: new THREE.MeshPhysicalMaterial({
        color: '#1a1d1b',
        roughness: 1,
        roughnessMap: crtGlassRoughness(),
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        emissive: '#3fae5c',
        emissiveIntensity: 0.05,
      }),

      // lamp
      shadeGlass: new THREE.MeshPhysicalMaterial({ ...withRepeat(glass, 1, 1), color: '#1d5a2e', roughness: 1, clearcoat: 1, clearcoatRoughness: 0.05, emissive: '#2e7a3c', emissiveIntensity: 0.25 }),
      shadeInner: new THREE.MeshStandardMaterial({ map: withRepeat(glass, 1).map, color: '#fff1d2', emissive: '#ffd9a0', emissiveIntensity: 1.6, side: THREE.BackSide }),
      linenShade: new THREE.MeshStandardMaterial({ ...withRepeat(cloth, 3, 1), color: '#f4d9a8', emissive: '#ffb766', emissiveMap: withRepeat(cloth, 3, 1).map, emissiveIntensity: 0.25, side: THREE.DoubleSide, roughness: 1 }),

      // books, paper
      pages: new THREE.MeshStandardMaterial({ map: pageEdgeTexture(), roughness: 0.9, normalMap: fiber.normalMap, normalScale: new THREE.Vector2(0.4, 0.4) }),
      paperTyped: new THREE.MeshStandardMaterial({ map: typedPageTexture(), roughnessMap: fiber.roughnessMap, roughness: 1, normalMap: fiber.normalMap, normalScale: new THREE.Vector2(0.5, 0.5) }),
      notebook: new THREE.MeshPhysicalMaterial({ ...withRepeat(leather, 5), color: '#34465c', roughness: 1, sheen: 0.3, normalScale: new THREE.Vector2(0.6, 0.6) }),
      floppyLabel: new THREE.MeshStandardMaterial({ map: floppyLabelTexture(), roughness: 0.85, normalMap: fiber.normalMap, normalScale: new THREE.Vector2(0.3, 0.3) }),

      // ceramics
      mug: new THREE.MeshPhysicalMaterial({ ...withRepeat(ceramic, 2, 1), color: '#5f7a58', roughness: 1, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
      vase: new THREE.MeshPhysicalMaterial({ ...withRepeat(ceramic, 1.5, 1), color: '#8a7860', roughness: 1, clearcoat: 0.6 }),
      coffee: new THREE.MeshPhysicalMaterial({ map: coffeeTexture(), roughness: 0.08, clearcoat: 1 }),

      // blinds use the vinyl set (the paint shader is layered on top)
      vinyl,
      cloth,
      fiber,
    }
    return m
  })
}

// Per-book cover material: cloth tinted with the book's colour.
export function bookCover(hex) {
  return once('cover:' + hex, () => {
    const cloth = clothSet()
    return new THREE.MeshPhysicalMaterial({ ...withRepeat(cloth, 2, 2), color: hex, roughness: 1, sheen: 0.35, sheenColor: new THREE.Color('#ffffff'), normalScale: new THREE.Vector2(0.7, 0.7) })
  })
}

export function bookSpine(i, hex) {
  return once('spineMat:' + i, () => {
    const cloth = clothSet()
    return new THREE.MeshPhysicalMaterial({
      map: spineTexture(i, hex),
      roughnessMap: cloth.roughnessMap,
      normalMap: cloth.normalMap,
      roughness: 1,
      sheen: 0.3,
      normalScale: new THREE.Vector2(0.6, 0.6),
    })
  })
}

export function printMaterial(map) {
  const fiber = paperFiberSet()
  return new THREE.MeshStandardMaterial({ map, roughnessMap: fiber.roughnessMap, roughness: 1, normalMap: fiber.normalMap, normalScale: new THREE.Vector2(0.4, 0.4) })
}

// Plastic maps at a given repeat (for unit-UV meshes like the instanced keycaps).
export function plasticMaps(rep) {
  return withRepeat(plasticSet(), rep)
}
