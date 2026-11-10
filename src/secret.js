import { useSyncExternalStore } from 'react'

// The "Clean Up" secret. One clock drives the screen glitch, the camera move,
// the paint on the blinds and the lights, so every part stays in sync.
//
// Times in seconds from the trigger.
export const TL = {
  glitchEnd: 1.7, // hard screen glitch, lamp stutters
  outStart: 1.25, // camera leaves the screen...
  outEnd: 3.7, // ...and settles on the blinds
  paintStart: 3.3,
  paintEnd: 7.9, // circle, then the star, one stroke
  fadeStart: 10.2,
  fadeEnd: 11.6, // paint dissolves, room warms back up
  backStart: 11.0,
  backEnd: 13.6, // camera returns to the screen
  recoverEnd: 14.4, // last glitch on the screen, then normal
}

const state = {
  active: false,
  start: 0,
  t: 0, // seconds since trigger
  w: 0, // 0 = normal camera, 1 = looking at the blinds
}
export const secret = state

const listeners = new Set()
const emit = () => listeners.forEach((f) => f())

function lockScroll(on) {
  document.documentElement.style.overflow = on ? 'hidden' : ''
}

export function triggerSecret() {
  if (state.active) return
  state.active = true
  state.start = performance.now()
  state.t = 0
  lockScroll(true)
  emit()
}

// Called every frame from the render loop.
export function tickSecret() {
  if (!state.active) return
  state.t = (performance.now() - state.start) / 1000
  if (state.t >= TL.recoverEnd) {
    state.active = false
    state.t = 0
    state.w = 0
    lockScroll(false)
    emit()
  }
}

export function useSecretActive() {
  return useSyncExternalStore(
    (f) => (listeners.add(f), () => listeners.delete(f)),
    () => state.active,
  )
}

export const clamp01 = (x) => Math.min(1, Math.max(0, x))
export const smooth = (a, b, t) => {
  const x = clamp01((t - a) / (b - a))
  return x * x * x * (x * (x * 6 - 15) + 10) // smootherstep
}
