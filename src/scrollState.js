// Mutable, render-free scroll state shared between the DOM and the R3F loop.
export const scrollState = {
  progress: 0, // raw page scroll 0..1
  travel: 0, // damped + eased camera travel 0..1
}

export function readScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  scrollState.progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
  return scrollState.progress
}

export function scrollToEnd(smooth = true) {
  const max = document.documentElement.scrollHeight - window.innerHeight
  window.scrollTo({ top: max, behavior: smooth ? 'smooth' : 'instant' })
}

export function scrollToStart() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
