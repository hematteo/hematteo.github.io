import { SPECTRUM, reducedMotion, svgEl } from './util.js'

// A readout query q_α refracting through a prism: feature contributions fan out as a spectrum
// and the residual r_α leaves as the reflected ray (notation from the Sparse Readout Prism
// figure). Real refraction with exaggerated dispersion. The pointer, a sideways touch drag or
// tilting a phone changes the angle; far enough one way, colours drop out by total internal
// reflection until only red is left.
const W = 700, H = 210, DEG = Math.PI / 180
const RANGE = [-16, 20] // degrees either side of minimum deviation; at +20 only red still exits
const TILT = 14 * DEG, BASE = (30 - 14 - 49) * DEG

const add = (a, b) => [a[0] + b[0], a[1] + b[1]]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
const mul = (a, s) => [a[0] * s, a[1] * s]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1]
const unit = a => mul(a, 1 / Math.hypot(a[0], a[1]))

// Snell's law in vector form; n is the unit normal facing the incoming ray.
function refract (d, n, eta) {
  const cosi = -dot(n, d), k = 1 - eta * eta * (1 - cosi * cosi)
  return k < 0 ? null : add(mul(d, eta), mul(n, eta * cosi - Math.sqrt(k)))
}
function hit (p, d, a, b) {
  const e = sub(b, a), den = d[0] * e[1] - d[1] * e[0]
  if (Math.abs(den) < 1e-9) return null
  const w = sub(a, p), t = (w[0] * e[1] - w[1] * e[0]) / den, u = (w[0] * d[1] - w[1] * d[0]) / den
  return t > 1e-6 && u >= 0 && u <= 1 ? { t, point: add(p, mul(d, t)) } : null
}

// Maths labels in Latin Modern Math italic; parts are [text, isSubscript].
function label (parent, parts) {
  const text = svgEl('text', { class: 'prism-label' }, parent)
  let shift = 0
  for (const [content, isSub] of parts) {
    const next = isSub ? 0.25 : 0 // em, so subscripts scale with the label
    const tspan = svgEl('tspan', { dy: `${next - shift}em`, ...(isSub ? { 'font-size': '0.7em' } : {}) }, text)
    tspan.textContent = content
    shift = next
  }
  return text
}

export function mountPrism (slot) {
  if (!slot) return
  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': 'Diagram: a readout query enters a prism and splits into coloured feature contributions, while the residual is reflected.',
  })
  const grad = svgEl('linearGradient', { id: 'prism-glass', x1: 0, y1: 0, x2: 1, y2: 1 }, svgEl('defs', {}, svg))
  svgEl('stop', { offset: 0, class: 'glass-a' }, grad)
  svgEl('stop', { offset: 1, class: 'glass-b' }, grad)

  const G = [318, 112], radius = 132 / Math.sqrt(3)
  const corner = a => [G[0] + radius * Math.cos(a - TILT), G[1] + radius * Math.sin(a - TILT)]
  const A = corner(-Math.PI / 2), B = corner(Math.PI * 5 / 6), C = corner(Math.PI / 6)
  const faces = [[A, B], [A, C], [B, C]]
  const outward = ([a, b]) => {
    const e = sub(b, a)
    const n = unit([e[1], -e[0]])
    return dot(n, sub(mul(add(a, b), 0.5), G)) < 0 ? mul(n, -1) : n
  }
  const E = add(A, mul(sub(B, A), 0.52)) // entry point on the left face
  const entryNormal = outward(faces[0])

  const residual = svgEl('path', { class: 'prism-residual' }, svg)
  const inside = SPECTRUM.map(colour => svgEl('path', { class: 'prism-inside', stroke: colour }, svg))
  svgEl('path', { d: `M${A}L${B}L${C}Z`, class: 'prism-body', fill: 'url(#prism-glass)', 'stroke-width': 1.3, 'stroke-linejoin': 'round' }, svg)
  const beam = svgEl('path', { class: 'prism-beam' }, svg)
  const beamFlow = svgEl('path', { class: 'prism-flow' }, svg)
  const rays = SPECTRUM.map(colour => svgEl('path', { class: 'prism-ray', stroke: colour }, svg))
  const flows = SPECTRUM.map(() => svgEl('path', { class: 'prism-flow' }, svg))
  const q = label(svg, [['𝑞'], ['𝛼', true]])
  const r = label(svg, [['𝑟'], ['𝛼', true]])
  const beta = label(svg, [['𝛽'], ['𝑖', true], ['(𝛼) 𝑑'], ['𝑖', true]])
  const place = (node, [x, y]) => { node.setAttribute('x', x.toFixed(1)); node.setAttribute('y', y.toFixed(1)) }

  function draw (theta) {
    const d = [Math.cos(theta), Math.sin(theta)], source = sub(E, mul(d, 420))
    beam.setAttribute('d', `M${source}L${E}`)
    beamFlow.setAttribute('d', `M${source}L${E}`)
    place(q, add(sub(E, mul(d, 120)), [-4, -12]))
    const reflected = sub(d, mul(entryNormal, 2 * dot(d, entryNormal)))
    residual.setAttribute('d', `M${E}L${add(E, mul(reflected, 110))}`)
    place(r, add(add(E, mul(reflected, 62)), [8, 0]))
    let betaAt = null
    SPECTRUM.forEach((_, i) => {
      const n = 1.5 + i * 0.028 // refractive index, red to violet
      const t = refract(d, entryNormal, 1 / n)
      let exit = null
      if (t) {
        for (const face of faces.slice(1)) {
          const h = hit(E, t, ...face)
          if (h && (!exit || h.t < exit.t)) exit = { ...h, face }
        }
      }
      const out = exit && refract(t, mul(outward(exit.face), -1), n)
      const ray = out ? `M${exit.point}L${add(exit.point, mul(out, 520))}` : ''
      inside[i].setAttribute('d', out ? `M${E}L${exit.point}` : '')
      rays[i].setAttribute('d', ray)
      flows[i].setAttribute('d', ray)
      if (out && !betaAt) betaAt = add(exit.point, mul(out, 150))
    })
    if (betaAt) place(beta, add(betaAt, [4, -14]))
  }

  // Angle sources, in priority order: pointer or touch drag, phone tilt, idle drift.
  const toAngle = f => BASE + (RANGE[0] + Math.min(1, Math.max(0, f)) * (RANGE[1] - RANGE[0])) * DEG
  let theta = BASE, pointerAngle = null, tiltAngle = null, visible = false, raf = 0
  const start = performance.now()
  const target = now => pointerAngle ?? tiltAngle ?? (reducedMotion.matches ? BASE : BASE + 4 * DEG * Math.sin((now - start) / 1700))
  function frame (now) {
    const goal = target(now)
    theta += (goal - theta) * 0.12
    draw(theta)
    const settled = Math.abs(goal - theta) < 1e-4 && (reducedMotion.matches || pointerAngle !== null || tiltAngle !== null)
    raf = visible && !settled ? requestAnimationFrame(frame) : 0
  }
  const wake = () => { if (visible && !raf) raf = requestAnimationFrame(frame) }

  svg.addEventListener('pointermove', e => {
    const box = svg.getBoundingClientRect()
    pointerAngle = toAngle(e.pointerType === 'touch' ? (e.clientX - box.left) / box.width : (e.clientY - box.top) / box.height)
    wake()
  })
  svg.addEventListener('pointerleave', () => { pointerAngle = null; wake() })
  svg.addEventListener('pointercancel', () => { pointerAngle = null; wake() })

  const onTilt = e => {
    if (e.gamma == null) return
    tiltAngle = toAngle((e.gamma + 40) / 80) // left-right tilt of about ±40° spans the range
    wake()
  }
  if (matchMedia('(pointer: coarse)').matches && 'DeviceOrientationEvent' in window) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS only grants motion access in response to a tap
      svg.addEventListener('click', () => {
        DeviceOrientationEvent.requestPermission()
          .then(state => { if (state === 'granted') addEventListener('deviceorientation', onTilt) })
          .catch(() => {})
      }, { once: true })
    } else {
      addEventListener('deviceorientation', onTilt)
    }
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) wake()
    else { cancelAnimationFrame(raf); raf = 0 }
  }).observe(svg)
  draw(BASE)
  slot.append(svg)
}
