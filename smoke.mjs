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

  const initialResponse = await page.goto(BASE)
  const initialHtml = await initialResponse.text()
  check('research email is available in static HTML', initialHtml.includes('mailto:matteohe.research@gmail.com'))
  check('research profile renders', await page.locator('h1').textContent() === 'Matteo He')
  check('selected research is visible', await page.locator('#research h3').count() === 3)
  check('profile does not load the 3D renderer', await page.evaluate(() => typeof window.__jd) === 'undefined')
  const cv = await page.request.get(new URL(await page.locator('.profile-links a').last().getAttribute('href'), BASE).href)
  check('CV PDF is available', cv.ok() && cv.headers()['content-type']?.includes('application/pdf'))
  check('contact email is correct', await page.locator('#contact .contact-link').getAttribute('href') === 'mailto:matteohe.research@gmail.com')
  check('no form or reveal controls remain', await page.locator('.contact-form, [data-email-reveal]').count() === 0)
  await page.locator('.figure-link').first().click()
  check('research figure opens', await page.locator('#figure-dialog').evaluate(el => el.open))
  await page.keyboard.press('Escape')
  check('Escape closes the figure', !(await page.locator('#figure-dialog').evaluate(el => el.open)))
  await page.locator('#sparse-readout-prism summary').click()
  check('research method expands', await page.locator('#sparse-readout-prism details').evaluate(el => el.open))
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    check(`profile fits ${width}px viewport`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  }
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.locator('footer a[href="/drawer/"]').click()
  check('drawer link navigates', new URL(page.url()).pathname === '/drawer/')
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
  check('drawer contact points to contact section', await page.locator('footer a[href="/#contact"]').count() === 1)
  const noScript = await browser.newContext({ javaScriptEnabled: false })
  const staticPage = await noScript.newPage()
  await staticPage.goto(BASE)
  check('contact email is available without JavaScript', await staticPage.locator('#contact a[href="mailto:matteohe.research@gmail.com"]').isVisible())
  await noScript.close()
  check('no runtime errors', errors.length === 0, errors.join(' | '))
} finally {
  if (browser) await browser.close()
  preview.kill('SIGTERM')
}

console.log('\n' + (ok ? 'smoke OK' : 'smoke FAILED'))
process.exit(ok ? 0 : 1)
