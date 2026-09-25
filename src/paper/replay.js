import { onFirstView, reducedMotion, svgEl } from './util.js'

// Figure 1 redrawn from all 1,200 measured Pythia-1B curves (public/research/trajectory-replay.json,
// built by scripts/build-replay-data.py). It replays training once when scrolled into view; the
// static image stays if the data cannot load.
const PALETTE = [[68, 1, 84], [71, 44, 122], [59, 81, 139], [44, 113, 142], [33, 144, 141], [39, 173, 129], [92, 200, 99], [170, 220, 50], [253, 231, 37]]

// Same palette and log-step mapping as the trajectory explorer
function peakColour (peak) {
  const position = Math.log10(peak + 1) / Math.log10(928001) * (PALETTE.length - 1)
  const i = Math.min(PALETTE.length - 2, Math.floor(position)), t = position - i
  return `rgb(${PALETTE[i].map((v, k) => Math.round(v + t * (PALETTE[i + 1][k] - v))).join(',')})`
}
const compact = n => n < 1000 ? String(n) : n < 10000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : `${Math.round(n / 1000)}k`

export async function mountReplay (figure) {
  const link = figure?.querySelector('a'), img = link?.querySelector('img')
  if (!img) return
  let data
  try {
    data = await (await fetch('/research/trajectory-replay.json')).json()
  } catch {
    return
  }
  const values = Uint8Array.from(atob(data.values), c => c.charCodeAt(0))
  const { steps } = data, n = steps.length, last = steps.at(-1)
  const W = 250, H = 155, L = 20, R = 244, T = 32, B = 128 // same aspect ratio as the static image
  const x = step => L + Math.log10(step) / Math.log10(last) * (R - L) // from step 1; step 0 has no log position
  const y = v => B - v * (B - T)

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'replay-figure', role: 'img', 'aria-label': img.alt })
  const clip = svgEl('rect', { x: L - 2, y: 0, width: 0, height: H }, svgEl('clipPath', { id: 'replay-clip' }, svgEl('defs', {}, svg)))
  for (const v of [0, 0.5, 1]) {
    svgEl('line', { x1: L, x2: R, y1: y(v), y2: y(v), class: 'replay-grid' }, svg)
    svgEl('text', { x: L - 5, y: y(v) + 3, 'text-anchor': 'end' }, svg).textContent = v
  }
  for (const s of [1, 100, 10000, last]) {
    svgEl('text', { x: x(s), y: B + 12, 'text-anchor': s === 1 ? 'start' : s === last ? 'end' : 'middle' }, svg).textContent = compact(s)
  }
  svgEl('text', { x: R, y: H - 3, 'text-anchor': 'end' }, svg).textContent = 'Training step · log scale'
  svgEl('text', { x: L, y: 11, class: 'replay-title' }, svg).textContent = data.name
  svgEl('text', { x: L, y: 24 }, svg).textContent = 'Decoder norm / own peak'
  const stepLabel = svgEl('text', { x: R, y: 11, 'text-anchor': 'end', class: 'replay-step' }, svg)
  const curves = svgEl('g', { 'clip-path': 'url(#replay-clip)', class: 'replay-curves' }, svg)
  for (let j = 0; j < data.peaks.length; j++) {
    let d = ''
    for (let k = 1; k < n; k++) d += `${k === 1 ? 'M' : 'L'}${x(steps[k]).toFixed(1)} ${y(values[j * n + k] / 255).toFixed(1)}`
    svgEl('path', { d, stroke: peakColour(data.peaks[j]) }, curves)
  }
  const cursor = svgEl('line', { class: 'replay-cursor', x1: L, x2: L, y1: T - 4, y2: B }, svg)

  figure.dataset.thumbnail = img.currentSrc || img.src // for the hover preview
  img.replaceWith(svg)
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'replay-button'
  button.textContent = 'Replay training ↻'
  link.after(button)

  let raf = 0
  const show = e => { // e: eased progress through training, 0 to 1
    const cx = L + e * (R - L)
    clip.setAttribute('width', cx - L + 2)
    cursor.setAttribute('x1', cx)
    cursor.setAttribute('x2', cx)
    stepLabel.textContent = `step ${compact(Math.max(1, Math.round(10 ** (e * Math.log10(last)))))}`
  }
  const play = () => {
    cancelAnimationFrame(raf)
    if (reducedMotion.matches) { show(1); cursor.style.opacity = 0; return }
    const t0 = performance.now(), duration = 4200
    cursor.style.opacity = 1
    const frame = now => {
      const p = Math.min(1, (now - t0) / duration)
      show(p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2)
      if (p < 1) raf = requestAnimationFrame(frame)
      else cursor.style.opacity = 0
    }
    raf = requestAnimationFrame(frame)
  }
  button.addEventListener('click', play)
  onFirstView(svg, play, 0.5)
}
