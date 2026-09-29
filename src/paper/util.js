export const NS = 'http://www.w3.org/2000/svg'
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

export function svgEl (tag, attrs = {}, parent) {
  const node = document.createElementNS(NS, tag)
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
  parent?.appendChild(node)
  return node
}

// Runs fn once, the first time node is at least `threshold` visible.
export function onFirstView (node, fn, threshold = 0.35) {
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return
    observer.disconnect()
    fn()
  }, { threshold })
  observer.observe(node)
}

export const SPECTRUM = ['#e5484d', '#f76b15', '#e2a336', '#30a46c', '#0090ff', '#3e63dd', '#6e56cf']
