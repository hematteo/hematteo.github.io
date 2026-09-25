import { onFirstView, reducedMotion } from './util.js'

// Sparse Readout Prism figure: plays once when first seen (the query enters, each feature arrow
// leaves the prism and its bar grows as it lands, the residual comes last) and links each arrow to
// its bar on hover. Without JavaScript, or with reduced motion, it is simply the finished figure.
export function mountSrp (svg) {
  if (!svg) return
  // thin arrows get a wider invisible stroke, so they are easy to hover
  for (const arrow of svg.querySelectorAll('.srp-arrow[data-k]')) {
    const hit = arrow.cloneNode()
    hit.setAttribute('class', 'srp-hit')
    hit.removeAttribute('marker-end')
    arrow.after(hit)
  }
  svg.addEventListener('pointerover', e => {
    const k = e.target.closest('[data-k]')?.dataset.k
    if (k) svg.dataset.focus = k
    else delete svg.dataset.focus
  })
  svg.addEventListener('pointerleave', () => delete svg.dataset.focus)

  if (reducedMotion.matches) return
  svg.classList.add('armed')
  onFirstView(svg, () => {
    requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('play')))
    // afterwards the staggered delays would slow the hover dimming, so drop them
    setTimeout(() => svg.classList.remove('armed', 'play'), 2200)
  }, 0.5)
}
