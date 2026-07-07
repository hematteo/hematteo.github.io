// Fast, deterministic CI smoke test: does the built site boot without errors?
// Catches catastrophic regressions (blank page, init crash, missing objects)
// without the timing sensitivity of the full interaction suite in test.mjs.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const PORT = 5177
const BASE = `http://127.0.0.1:${PORT}/`
const CI = !!process.env.CI

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
  stdio: 'ignore',
})
async function waitForServer (url, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try { if ((await fetch(url)).ok) return } catch { /* not up */ }
    await new Promise(r => setTimeout(r, 250))
  }
  throw new Error('vite preview did not start in time')
}

let ok = true
const check = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  — ' + detail : ''))
  if (!cond) ok = false
}

let browser
try {
  await waitForServer(BASE)
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(CI ? {} : { channel: 'chrome' }) })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto(BASE)
  await page.waitForTimeout(4000)

  const jd = await page.evaluate(() => typeof window.__jd)
  check('app initialised (window.__jd present)', jd === 'object', 'typeof=' + jd)

  const allSpawned = await page.evaluate(() => {
    const ids = ['punt', 'plane', 'prism', 'joystick', 'mug', 'keyboard', 'gpu', 'dolphin', 'trophy', 'medal']
    return ids.every(id => {
      const p = window.__jd.pos(id)
      return p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)
    })
  })
  check('all 10 objects spawned', allSpawned)
  check('no runtime errors', errors.length === 0, errors.join(' | '))
} finally {
  if (browser) await browser.close()
  preview.kill('SIGTERM')
}

console.log('\n' + (ok ? 'smoke OK' : 'smoke FAILED'))
process.exit(ok ? 0 : 1)
