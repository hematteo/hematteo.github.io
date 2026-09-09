// End-to-end interaction tests for the junk drawer.
// Runs against the built site served by `vite preview`.
// Usage: npm test   (runs `vite build` first, then this file)
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const PORT = 5199
const BASE = `http://127.0.0.1:${PORT}/drawer/`
const CI = !!process.env.CI

// --- boot `vite preview` and wait for it to answer -------------------------
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
  stdio: 'ignore',
})
async function waitForServer (url, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url)
      if (r.ok) return
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 250))
  }
  throw new Error('vite preview did not start in time')
}

let pass = 0, fail = 0
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  — ' + detail : ''))
  ok ? pass++ : fail++
}

let browser
try {
  await waitForServer(BASE)
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
    ...(CI ? {} : { channel: 'chrome' }),
  })
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))

  await page.goto(BASE)
  await page.waitForTimeout(8000) // settle

  const IDS = ['punt', 'plane', 'prism', 'joystick', 'mug', 'keyboard', 'gpu', 'dolphin', 'trophy', 'medal']

  // --- 1. fling: something moves, nothing escapes
  const before = await page.evaluate((ids) => Object.fromEntries(ids.map(id => [id, window.__jd.pos(id)])), IDS)
  let p = await page.evaluate(() => window.__jd.screenPos('punt'))
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.mouse.move(p.x + 60, p.y, { steps: 3 })
  await page.mouse.move(p.x + 500, p.y - 60, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(2500)
  const after = await page.evaluate((ids) => Object.fromEntries(ids.map(id => [id, window.__jd.pos(id)])), IDS)
  const maxMove = Math.max(...IDS.map(id => Math.hypot(after[id].x - before[id].x, after[id].z - before[id].z)))
  const escaped = IDS.filter(id => Math.abs(after[id].x) > 12 || Math.abs(after[id].z) > 9 || after[id].y < -1)
  check('throw moves objects', maxMove > 0.5, 'max ' + maxMove.toFixed(2))
  check('nothing escapes tray', escaped.length === 0, escaped.join(','))

  // --- 2. hover: tooltip appears over an object
  p = await page.evaluate(() => window.__jd.screenPos('keyboard'))
  await page.mouse.move(p.x, p.y)
  await page.waitForTimeout(400)
  const tip = await page.evaluate(() => {
    const t = document.getElementById('tooltip')
    return { hidden: t.hidden, text: t.textContent }
  })
  check('hover tooltip shows', !tip.hidden && tip.text.length > 0, JSON.stringify(tip))

  // --- 3. examine all 10 -> completion funnel
  // Random piles and an airborne plane can cover other objects. Use the
  // public keyboard path for story completion; pointer throw/tap have their
  // own checks above and below.
  for (let index = 0; index < 11; index++) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(250)
    await page.locator('#scene').focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)
  }
  let st = await page.evaluate(() => window.__jd.state())
  check('all 10 examined', st.seen.length === 10, st.seen.length + ' seen')
  check('completed flag set', st.completed)
  const counterTxt = await page.evaluate(() => document.getElementById('counter').textContent)
  check('counter shows completion', /everything/.test(counterTxt), counterTxt)

  await page.keyboard.press('Escape')
  await page.waitForTimeout(1800)
  const finalCard = await page.evaluate(() => ({
    open: !document.getElementById('card').hidden,
    title: document.getElementById('card-title').textContent,
    actions: !document.getElementById('card-actions').hidden,
  }))
  check('final card appears', finalCard.open && /everything/i.test(finalCard.title), finalCard.title)
  check('final card has CV actions', finalCard.actions)

  // --- 4. keyboard navigation
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await page.evaluate(() => document.getElementById('scene').focus())
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(300)
  const kbTip = await page.evaluate(() => {
    const t = document.getElementById('tooltip')
    return { hidden: t.hidden, text: t.textContent }
  })
  check('keyboard focus shows tooltip', !kbTip.hidden && kbTip.text.length > 0, JSON.stringify(kbTip))
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  const kbCard = await page.evaluate(() => !document.getElementById('card').hidden)
  check('Enter opens card', kbCard)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  const kbClosed = await page.evaluate(() => document.getElementById('card').classList.contains('open'))
  check('Escape closes card', !kbClosed)

  // --- 5. idle pause: after everything settles, sim goes inactive
  await page.mouse.move(100, 850)
  let idleSeen = false
  try {
    await page.waitForFunction(() => {
      const state = window.__jd.state()
      return !state.simActive && state.renderPending === 0
    }, null, { timeout: 30000 })
    idleSeen = true
  } catch { /* report the current state below */ }
  st = await page.evaluate(() => window.__jd.state())
  check('idle pause engages', idleSeen, 'simActive=' + st.simActive + ' pending=' + st.renderPending)

  // --- 6. interaction wakes it back up
  p = await page.evaluate(() => window.__jd.screenPos('mug'))
  await page.mouse.move(p.x, p.y)
  await page.waitForTimeout(150)
  st = await page.evaluate(() => window.__jd.state())
  check('pointer wakes renderer', st.renderPending > 0 || st.simActive, 'pending=' + st.renderPending)

  // --- 7. mobile viewport: bottom sheet + touch targets
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const mobErrors = []
  mob.on('pageerror', e => mobErrors.push(e.message))
  await mob.goto(BASE)
  await mob.waitForTimeout(7000)
  const mp = await mob.evaluate(() => window.__jd.screenPos('keyboard'))
  await mob.touchscreen.tap(mp.x, mp.y)
  await mob.waitForTimeout(500)
  const sheet = await mob.evaluate(() => {
    const c = document.getElementById('card')
    const r = c.getBoundingClientRect()
    return { open: !c.hidden, left: r.left, right: innerWidth - r.right, bottom: innerHeight - r.bottom }
  })
  check('mobile tap opens card', sheet.open)
  check('mobile card is bottom sheet', sheet.left === 0 && sheet.right === 0 && sheet.bottom === 0, JSON.stringify(sheet))
  check('mobile no page errors', mobErrors.length === 0, mobErrors.join(' | '))

  // Discoveries must work through their public controls on desktop and touch,
  // including reduced motion. Debug hooks below only observe physical state.
  for (const mobile of [false, true]) {
    const discovery = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1400, height: 900 },
      hasTouch: mobile, isMobile: mobile, reducedMotion: mobile ? 'reduce' : 'no-preference',
    })
    const discoveryErrors = []
    discovery.on('pageerror', e => discoveryErrors.push(e.message))
    await discovery.goto(BASE)
    await discovery.waitForTimeout(2500)
    const label = mobile ? 'touch / reduced motion' : 'desktop'
    for (let step = 1; step <= 3; step++) {
      await discovery.locator('#discoveries-toggle').click()
      await discovery.locator('#discovery-arrange').click()
      await discovery.waitForFunction(n => window.__jd.state().discoveries.found.length >= n, step, { timeout: 8000 })
      check(`${label}: discovery ${step}`, true)
    }
    await discovery.waitForTimeout(1500)
    const combined = await discovery.evaluate(() => window.__jd.state())
    check(`${label}: colored paper perches`, combined.discoveries.colored && combined.discoveries.perched)
    check(`${label}: discoveries do not count as CV stories`, combined.seen.length === 0 && !combined.completed)
    const within = await discovery.evaluate(() => {
      const rect = document.getElementById('discoveries-toggle').getBoundingClientRect()
      return rect.left >= 0 && rect.right <= innerWidth && document.documentElement.scrollWidth === innerWidth
    })
    check(`${label}: controls fit viewport`, within)

    // Move the paper using the accessible keyboard interaction: it must detach.
    await discovery.locator('#scene').focus()
    for (let i = 0; i < 12; i++) {
      if (/paper airplane/.test(await discovery.locator('#tooltip').textContent())) break
      await discovery.keyboard.press('ArrowRight')
      await discovery.waitForTimeout(80)
    }
    for (let i = 0; i < 5; i++) await discovery.keyboard.press('Shift+ArrowDown')
    const released = await discovery.evaluate(() => window.__jd.state().discoveries)
    check(`${label}: moving paper releases perch, retains color`, !released.perched && released.colored)

    // Browse to the light and switch it: discovery prop is not an eleventh story.
    for (let i = 0; i < 12; i++) {
      if (/desk light/.test(await discovery.locator('#tooltip').textContent())) break
      await discovery.keyboard.press('ArrowRight')
      await discovery.waitForTimeout(80)
    }
    await discovery.keyboard.press('Enter')
    await discovery.waitForTimeout(150)
    const dark = await discovery.evaluate(() => window.__jd.state().discoveries)
    check(`${label}: light switch removes spectrum`, !dark.lightOn && !dark.spectrum)

    await discovery.locator('#dump').click()
    const reset = await discovery.evaluate(() => window.__jd.state().discoveries)
    check(`${label}: dump resets physics and keeps notes`, !reset.perched && !reset.colored && reset.found.length === 3)

    // The second chain builds on retained discoveries, through the same UI.
    await discovery.locator('#discoveries-toggle').click()
    await discovery.locator('#discovery-arrange').click()
    await discovery.waitForFunction(() => window.__jd.state().discoveries.found.includes(4), null, { timeout: 10000 })
    await discovery.locator('#discoveries-toggle').click()
    await discovery.locator('#discovery-arrange').click()
    await discovery.waitForFunction(() => window.__jd.state().discoveries.flight.controlled, null, { timeout: 10000 })
    let flight = await discovery.evaluate(() => window.__jd.state().discoveries)
    check(label + ': all six discoveries work', flight.found.length === 6 && flight.flight.flying)
    await discovery.getByRole('button', { name: 'Steer right', exact: true }).click()
    await discovery.waitForTimeout(300)
    flight = await discovery.evaluate(() => window.__jd.state().discoveries)
    check(label + ': joystick steers the flight', flight.flight.steerX > 0)
    await discovery.keyboard.press('w')
    flight = await discovery.evaluate(() => window.__jd.state().discoveries)
    check(label + ': WASD works from flight controls', flight.flight.steerZ < 0)
    check(label + ': rainbow trail respects reduced motion', mobile ? flight.flight.trailPoints === 0 : flight.flight.trailPoints > 1)
    await discovery.getByRole('button', { name: 'Land', exact: true }).click()
    await discovery.waitForTimeout(3600)
    flight = await discovery.evaluate(() => window.__jd.state().discoveries)
    check(label + ': landing stops lift without automatically restarting', !flight.flight.flying && flight.flight.spool < 0.02)
    await discovery.locator('#dump').click()
    flight = await discovery.evaluate(() => window.__jd.state().discoveries)
    check(label + ': reset clears flight and keeps six field notes', !flight.flight.flying && flight.flight.trailPoints === 0 && flight.found.length === 6)
    check(`${label}: no runtime errors`, discoveryErrors.length === 0, discoveryErrors.join(' | '))
    await discovery.close()
  }

  check('desktop no console errors', errors.length === 0, errors.join(' | '))
} finally {
  if (browser) await browser.close()
  preview.kill('SIGTERM')
}

console.log('\n' + pass + ' passed, ' + fail + ' failed')
process.exit(fail ? 1 : 0)
