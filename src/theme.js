// Light/dark toggle. Without a stored choice the page follows the system setting (latex.css);
// a stored choice is applied before first paint by each page's head script, then kept here.
// Choosing what the system already prefers clears the choice, so the page follows the system again.
const root = document.documentElement
const system = matchMedia('(prefers-color-scheme: dark)')
const current = () => root.dataset.theme || (system.matches ? 'dark' : 'light')
const buttons = new Set()
const PAPER = { light: '#ffffff', dark: '#151618' } // --paper in latex.css, for the browser's own bars

function sync () {
  const dark = current() === 'dark'
  for (const b of buttons) b.textContent = dark ? 'Light' : 'Dark'
  for (const meta of document.querySelectorAll('meta[name="theme-color"][media]')) {
    const own = meta.media.includes('dark') ? PAPER.dark : PAPER.light
    meta.content = root.dataset.theme ? PAPER[root.dataset.theme] : own
  }
}

export function themeToggle () {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'theme-toggle'
  b.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark'
    const followsSystem = next === (system.matches ? 'dark' : 'light')
    if (followsSystem) delete root.dataset.theme
    else root.dataset.theme = next
    try {
      if (followsSystem) localStorage.removeItem('theme')
      else localStorage.setItem('theme', next)
    } catch {}
    sync()
  })
  buttons.add(b)
  sync()
  return b
}

// Plots drawn in script redraw when the theme changes.
export function onThemeChange (fn) {
  system.addEventListener('change', fn)
  new MutationObserver(fn).observe(root, { attributes: true, attributeFilter: ['data-theme'] })
}

system.addEventListener('change', sync)
document.querySelector('.masthead nav')?.append(themeToggle())
