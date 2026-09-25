import { SPECTRUM, onFirstView, svgEl } from './util.js'

// Hand-drawn ink over the page: red-pen marks around the strongest facts, and line drawings of
// the junk drawer's objects in the right margin. Everything lives in one layer clipped to the
// page, and follows the text it annotates when layout changes (fonts, resizing, opened details).
const f1 = n => n.toFixed(1)
const seeded = seed => () => {
  seed = seed + 0x6D2B79F5 | 0
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
  return ((t ^ t >>> 14) >>> 0) / 4294967296
}
function smooth (pts) { // Catmull-Rom through the points, as cubic Béziers
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`
  }
  return d
}
const PEN = {
  circle (w, h, rand) { // a little more than one loop, like a real pen circle
    const cx = w / 2, cy = h / 2, rx = w / 2 + 12, ry = h / 2 + 9, pts = []
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * 0.92 + (i / 16) * (Math.PI * 2 + 0.45), j = 1 + (rand() - 0.5) * 0.08 - i * 0.004
      pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j])
    }
    return [smooth(pts)]
  },
  underline (w, h, rand) {
    const stroke = (dy, lift) => smooth([0, 0.25, 0.5, 0.75, 1].map(t => [-5 + t * (w + 12), h + dy + (rand() - 0.5) * 2.2 - t * lift]))
    return [stroke(3, 1.5), stroke(6.5, 2.5)]
  },
  box (w, h, rand) {
    const j = () => (rand() - 0.5) * 3, x0 = -9, y0 = -7, x1 = w + 9, y1 = h + 7
    return [
      `M${x0 - 4 + j()} ${y0 + j()}L${x1 + 5 + j()} ${y0 + j()}`, `M${x1 + j()} ${y0 - 5 + j()}L${x1 + j()} ${y1 + 4 + j()}`,
      `M${x1 + 5 + j()} ${y1 + j()}L${x0 - 4 + j()} ${y1 + j()}`, `M${x0 + j()} ${y1 + 5 + j()}L${x0 + j()} ${y0 - 4 + j()}`,
    ]
  },
}

const DRAWINGS = {
  plane: ['the paper airplane', '<g class="lift"><path class="ink" pathLength="1" d="M6 30 L64 10 L38 46 L30 33 Z"/><path class="ink" pathLength="1" d="M30 33 L64 10 M30 33 L27 43 L35 38"/></g>'],
  prism: ['the glass prism', '<path class="ink" pathLength="1" d="M8 34 L30 29"/><path class="ink" pathLength="1" d="M34 6 L56 44 L12 44 Z"/><path class="ink" pathLength="1" d="M34 6 L38 44"/><g class="spectrum">' +
    SPECTRUM.slice(0, 5).map((c, i) => `<line x1="45" y1="27" x2="70" y2="${24 + i * 5}" stroke="${c}"/>`).join('') + '</g>'],
  punt: ['the punt', '<g class="rock"><path class="ink" pathLength="1" d="M4 32 L66 32 L61 39 L9 39 Z"/><path class="ink" pathLength="1" d="M44 32 L57 3"/></g><path class="ink" pathLength="1" d="M2 46 q4 -3 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0"/>'],
  medal: ['the medal', '<g class="swing"><path class="ink" pathLength="1" d="M26 3 L36 23 L46 3"/><circle class="ink" pathLength="1" cx="36" cy="34" r="12"/><circle class="ink" pathLength="1" cx="36" cy="34" r="7"/></g>'],
  keyboard: ['the keyboard', '<rect class="ink" pathLength="1" x="5" y="14" width="62" height="28" rx="2"/><path class="ink" pathLength="1" d="M11 21h5m4 0h5m4 0h5m4 0h5m4 0h5m4 0h3 M13 28h5m4 0h5m4 0h5m4 0h5m4 0h5m4 0h2 M18 35h36"/>' +
    [[11, 19], [29, 26], [47, 19], [22, 33], [56, 26]].map(([x, y], i) => `<rect class="key" x="${x}" y="${y}" width="5" height="4" style="animation-delay:${i * 0.2}s"/>`).join('')],
  gpu: ['the GPU', '<rect class="ink" pathLength="1" x="4" y="12" width="64" height="28" rx="2"/><path class="ink" pathLength="1" d="M8 40 v7 h20 v-7"/>' +
    [22, 50].map(cx => `<circle class="ink" pathLength="1" cx="${cx}" cy="26" r="10"/><g class="fan"><path class="ink" pathLength="1" d="M${cx} 26 l0 -8 M${cx} 26 l7 4 M${cx} 26 l-7 4"/></g>`).join('')],
  mug: ['the coffee mug', '<path class="ink" pathLength="1" d="M16 16 h28 v22 a6 6 0 0 1 -6 6 h-16 a6 6 0 0 1 -6 -6 Z"/><path class="ink" pathLength="1" d="M44 21 h4 a6 6 0 0 1 0 12 h-4"/><path class="steam" d="M24 12 q-3 -4 0 -8"/><path class="steam" d="M34 12 q3 -4 0 -8"/>'],
}

export function mountInk () {
  const layer = document.createElement('div')
  layer.className = 'ink-layer'
  document.body.append(layer)
  const page = document.querySelector('.page')
  const placements = []

  // Red pen
  const strongs = [...document.querySelectorAll('#about strong')]
  const marks = [
    [document.querySelector('#learning-to-read-out .paper-meta span:nth-child(2)'), 'circle'],
    [strongs.find(s => s.textContent === 'Distinction'), 'underline'],
    [strongs.find(s => s.textContent === 'First Class'), 'underline'],
    [strongs.find(s => s.textContent.startsWith('GRE')), 'box'],
  ].filter(([target]) => target)
  marks.forEach(([target, kind], i) => {
    const svg = svgEl('svg', { class: 'pen-mark', 'aria-hidden': 'true' }, layer)
    const range = document.createRange()
    range.selectNodeContents(target) // the text itself, not the '·' drawn before it
    const rand = seeded(7 + i * 13)
    let size = ''
    placements.push(() => {
      const r = range.getBoundingClientRect()
      svg.style.left = `${r.left + scrollX}px`
      svg.style.top = `${r.top + scrollY}px`
      const next = `${Math.round(r.width)}x${Math.round(r.height)}`
      if (next === size) return
      size = next
      svg.setAttribute('width', r.width)
      svg.setAttribute('height', r.height)
      svg.replaceChildren()
      PEN[kind](r.width, r.height, rand).forEach((d, k) => {
        svgEl('path', { d, pathLength: 1, style: `transition-delay:${k * 0.18}s` }, svg)
      })
    })
    onFirstView(target, () => setTimeout(() => svg.classList.add('drawn'), i * 150), 0.9)
  })

  // Drawer marginalia
  const about = document.querySelectorAll('#about .cv-entry h3'), systems = document.querySelectorAll('#systems .cv-entry h3')
  const pairs = [
    [document.querySelector('#learning-to-read-out h3'), 'plane'], [document.querySelector('#sparse-readout-prism h3'), 'prism'],
    [about[0], 'punt'], [about[1], 'medal'], [systems[0], 'keyboard'], [systems[1], 'gpu'], [systems[2], 'mug'],
  ].filter(([heading]) => heading)
  for (const [heading, kind] of pairs) {
    const [name, art] = DRAWINGS[kind]
    const a = document.createElement('a')
    a.href = '/drawer/'
    a.className = `margin-object ${kind}`
    a.setAttribute('aria-label', `Find ${name} in the junk drawer`)
    a.innerHTML = `<svg viewBox="0 0 72 54" aria-hidden="true">${art}</svg><span class="margin-tip">${name} →</span>`
    layer.append(a)
    placements.push(() => {
      const wide = innerWidth >= 1180
      a.style.display = wide ? '' : 'none'
      if (!wide) return
      const h = heading.getBoundingClientRect(), p = page.getBoundingClientRect()
      a.style.left = `${p.right + scrollX + 44}px`
      a.style.top = `${h.top + scrollY - 14}px`
    })
    onFirstView(heading, () => a.classList.add('drawn'), 0.8)
  }

  let queued = false
  const place = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => { queued = false; placements.forEach(fn => fn()) })
  }
  placements.forEach(fn => fn())
  new ResizeObserver(place).observe(document.body)
  addEventListener('resize', place)
}
