import { onFirstView, svgEl } from './util.js'

// Hand-drawn ink over the page: red-pen marks around the strongest facts. Everything lives in
// one layer clipped to the page, and follows the text it annotates when layout changes (fonts, resizing, opened details).
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
