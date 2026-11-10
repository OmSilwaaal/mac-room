// Renders source frames for the dithered PDF images into pdf/.frames/<name>/fNNN.png:
//   tennisbot (terminal), vitalis (ring), newthing (live site capture).
// Usage: node pdf/frames.cjs   (needs Google Chrome installed)
const { chromium } = require('playwright-core')
const fs = require('fs')
const path = require('path')
const OUT = path.join(__dirname, '.frames')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const term = (lines) => ({
  html: `<body style="margin:0;background:#0d0f0e;color:#e6eae4;font:700 84px/1.3 Menlo,monospace;padding:50px 60px;overflow:hidden;height:700px;display:flex;flex-direction:column;justify-content:flex-end"><pre id=o style="margin:0;white-space:pre-wrap"></pre></body>`,
  n: 60,
  step: (i) => {
    const text = lines.join('\n')
    const k = Math.min(text.length, Math.floor((i / 48) * text.length))
    return `document.getElementById('o').textContent = ${JSON.stringify(text)}.slice(0, ${k}) + (${i} % 6 < 3 ? '█' : ' ')`
  },
})

const jobs = {
  tennisbot: term(['$ tennisbot', '> ATP 50y data', '> GBM + LSTM', '> scan Kalshi', '> edge found', '> order placed', '> match live']),
  vitalis: {
    html: `<body style="margin:0;background:#0b0b0c;color:#f2f2f2;font-family:-apple-system,Helvetica,sans-serif;height:800px;display:flex;align-items:center;justify-content:center;gap:120px">
      <svg width="440" height="440" viewBox="0 0 440 440"><circle cx="220" cy="220" r="180" fill="none" stroke="#2a2a2c" stroke-width="34"/>
      <circle id="ring" cx="220" cy="220" r="180" fill="none" stroke="#f2f2f2" stroke-width="34" stroke-linecap="round" transform="rotate(-90 220 220)" stroke-dasharray="1131" stroke-dashoffset="1131"/>
      <text x="220" y="270" text-anchor="middle" font-size="170" font-weight="300" fill="#f2f2f2">ᛉ</text></svg>
      <div style="font-size:120px;font-weight:700;letter-spacing:-2px">VITALIS</div></body>`,
    n: 56,
    step: (i) => `document.getElementById('ring').setAttribute('stroke-dashoffset', 1131 * (1 - 0.82 * (1 - Math.pow(1 - Math.min(1, ${i} / 40), 3))))`,
  },
  newthing: { url: 'https://newthing-five.vercel.app', n: 48 },
}

;(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true })
  for (const [name, job] of Object.entries(jobs)) {
    const dir = path.join(OUT, name)
    fs.mkdirSync(dir, { recursive: true })
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
    if (job.url) {
      await p.goto(job.url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
      await p.waitForTimeout(2500)
    } else await p.setContent(job.html)
    for (let i = 0; i < job.n; i++) {
      if (job.step) await p.evaluate(job.step(i))
      else await p.waitForTimeout(90)
      await p.screenshot({ path: path.join(dir, `f${String(i).padStart(3, '0')}.png`) })
    }
    await p.close()
    console.log(name, 'ok')
  }
  await b.close()
})()
