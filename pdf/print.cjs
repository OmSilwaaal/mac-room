// Prints pdf/portfolio.html to public/om-portfolio.pdf (served at /om-portfolio.pdf).
// Usage: node pdf/print.cjs   (needs Google Chrome installed)
const { chromium } = require('playwright-core')
const path = require('path')
;(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const p = await b.newPage()
  await p.goto('file://' + path.join(__dirname, 'portfolio.html'), { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.pdf({ path: path.join(__dirname, '..', 'public', 'om-portfolio.pdf'), width: '11in', height: '6.875in', printBackground: true, preferCSSPageSize: true })
  await b.close()
  console.log('wrote public/om-portfolio.pdf')
})()
