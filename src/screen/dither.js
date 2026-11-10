// 1-bit Atkinson dither of a photo, rendered at the screen's native pixel size.
// Returns a data URL; scale it up with `image-rendering: pixelated`.

const INK = [4, 20, 10]
const PAPER = [109, 255, 142]

// `weights` picks how colour maps to grey; a red-heavy mix acts like a red filter
// on B&W film (darker blue sky, brighter clouds).
export function ditherImage(src, { w, h, focusX = 0.5, focusY = 0.5, zoom = 1, contrast = 1.2, gamma = 1, weights = [0.2126, 0.7152, 0.0722] }) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const g = c.getContext('2d', { willReadFrequently: true })
      // cover-crop around the focus point
      const target = w / h
      let cw = img.width
      let ch = img.width / target
      if (ch > img.height) {
        ch = img.height
        cw = ch * target
      }
      cw /= zoom
      ch /= zoom
      const cx = Math.min(img.width - cw, Math.max(0, img.width * focusX - cw / 2))
      const cy = Math.min(img.height - ch, Math.max(0, img.height * focusY - ch / 2))
      g.imageSmoothingQuality = 'high'
      g.drawImage(img, cx, cy, cw, ch, 0, 0, w, h)

      const data = g.getImageData(0, 0, w, h)
      const px = data.data
      const lum = new Float32Array(w * h)
      for (let i = 0; i < w * h; i++) {
        let l = (weights[0] * px[i * 4] + weights[1] * px[i * 4 + 1] + weights[2] * px[i * 4 + 2]) / 255
        l = Math.pow(l, gamma)
        lum[i] = Math.min(1, Math.max(0, (l - 0.5) * contrast + 0.5))
      }
      // Atkinson: diffuse 6/8 of the error, which keeps highlights clean like the original Mac
      const spread = [
        [1, 0],
        [2, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
        [0, 2],
      ]
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x
          const v = lum[i] < 0.5 ? 0 : 1
          const err = (lum[i] - v) / 8
          lum[i] = v
          for (const [dx, dy] of spread) {
            const nx = x + dx
            const ny = y + dy
            if (nx >= 0 && nx < w && ny < h) lum[ny * w + nx] += err
          }
        }
      }
      for (let i = 0; i < w * h; i++) {
        const col = lum[i] ? PAPER : INK
        px[i * 4] = col[0]
        px[i * 4 + 1] = col[1]
        px[i * 4 + 2] = col[2]
        px[i * 4 + 3] = 255
      }
      g.putImageData(data, 0, 0)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = src
  })
}
