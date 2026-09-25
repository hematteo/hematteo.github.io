// The bottom-right corner of the page lifts on hover to show the junk drawer underneath.
export function mountPeel () {
  const peel = document.createElement('a')
  peel.href = '/drawer/'
  peel.className = 'page-peel'
  peel.setAttribute('aria-label', 'Lift the page corner: open the junk drawer')
  peel.innerHTML = '<span class="peel-under"><span class="peel-label">the junk drawer →</span></span><span class="peel-flap"></span>'
  // The drawer image loads once the page is idle, or as soon as someone reaches for the corner
  const load = () => peel.classList.add('loaded')
  peel.addEventListener('pointerenter', load, { once: true })
  peel.addEventListener('focus', load, { once: true })
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 4000 })
  else setTimeout(load, 3000)
  document.body.append(peel)
}
