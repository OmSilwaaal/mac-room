// Shared storm state, and synthesized thunder (Web Audio, no sound files).
//
// Browsers only allow audio after a click or key press, so the audio context is
// created on the first interaction; strikes before that are silent.

export const storm = {
  flash: 0, // 0..1, written every frame by <Storm>
  sound: readPref(),
  force: false, // set true to strike on the next frame
  hold: null, // dev: freeze the flash at this level
}

// dev-only console hooks: __strike() fires a strike, __storm.hold = 0..1 freezes a flash
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__strike = () => (storm.force = true)
  window.__storm = storm
}

function readPref() {
  try {
    return localStorage.getItem('thunder-sound') !== 'off'
  } catch {
    return true
  }
}

export function setThunderSound(on) {
  storm.sound = on
  try {
    localStorage.setItem('thunder-sound', on ? 'on' : 'off')
  } catch {
    /* storage blocked: keep the in-memory value */
  }
}

let ctx = null
let master = null
let noise = null

function unlock() {
  if (ctx) return
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0.55
  master.connect(ctx.destination)
  // 10 s of brown noise, reused by every clap
  const len = ctx.sampleRate * 10
  noise = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = noise.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    d[i] = last * 3.5
  }
}

if (typeof window !== 'undefined') {
  const once = () => {
    unlock()
    ctx?.resume?.()
  }
  window.addEventListener('pointerdown', once, { passive: true })
  window.addEventListener('keydown', once)
}

const rand = (a, b) => a + Math.random() * (b - a)

export function playThunder({ distance = 0.5, delay = 1 } = {}) {
  if (!ctx || !storm.sound || ctx.state !== 'running') return
  const t0 = ctx.currentTime + delay
  const dur = 4 + distance * 4

  const src = ctx.createBufferSource()
  src.buffer = noise
  // far thunder loses its high end
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 900 - distance * 650
  lp.Q.value = 0.6
  const body = ctx.createBiquadFilter()
  body.type = 'lowshelf'
  body.frequency.value = 110
  body.gain.value = 6
  const env = ctx.createGain()
  env.gain.value = 0
  src.connect(lp).connect(body).connect(env).connect(master)

  const peak = 1 - distance * 0.55
  const g = env.gain
  g.setValueAtTime(0, t0)
  if (distance < 0.35) {
    // close strike: a sharp crack first
    g.linearRampToValueAtTime(peak, t0 + 0.02)
    g.setTargetAtTime(peak * 0.45, t0 + 0.05, 0.15)
  } else {
    g.linearRampToValueAtTime(peak * 0.6, t0 + 0.4)
  }
  // the rumble rolls: a few swells as the sound arrives from different parts of the bolt
  let t = t0 + 0.5
  while (t < t0 + dur - 1) {
    g.setTargetAtTime(peak * rand(0.3, 0.85), t, rand(0.12, 0.35))
    t += rand(0.35, 0.9)
  }
  g.setTargetAtTime(0, t0 + dur - 1, 0.6)

  src.start(t0, rand(0, 4))
  src.stop(t0 + dur + 2)
}
