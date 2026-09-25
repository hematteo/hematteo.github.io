// Renders public/share.png, the homepage's link-preview image (1200x630, light theme): the name,
// research statement and prism figure, enlarged so they read at preview size. Run after
// `npm run build` whenever the title block or the figure changes.
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const PORT = 5180
const BASE = `http://127.0.0.1:${PORT}/`
const OUT = 'public/share.png'

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(BASE)).ok) break } catch {}
    if (i > 50) throw new Error('vite preview did not start in time')
    await new Promise(r => setTimeout(r, 200))
  }
  const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch())
  // a 960x504 window at 1.25x gives 1200x630 with everything a quarter larger
  const page = await browser.newPage({ viewport: { width: 960, height: 504 }, deviceScaleFactor: 1.25, colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto(BASE)
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: `.masthead,.arxiv-stamp,.abstract,.profile-links,.footnote,.footnote-ref,.ink-layer,.latex-log,main > :not(.intro),.page > footer {display:none !important}
    .intro {padding-top:84px} .prism-slot {margin-top:18px !important}` })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: OUT })
  await browser.close()
  console.log('wrote', OUT)
} finally {
  preview.kill('SIGTERM')
}
