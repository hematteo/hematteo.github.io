// Light/dark toggle. Without a stored choice the page follows the system setting (latex.css);
// a stored choice is applied before first paint by each page's head script, then kept here.
const root = document.documentElement
const system = matchMedia('(prefers-color-scheme: dark)')
const current = () => root.dataset.theme || (system.matches ? 'dark' : 'light')
const buttons = new Set()

function sync () {
  const dark = current() === 'dark'
  for (const b of buttons) b.textContent = dark ? 'Light' : 'Dark'
}

export function themeToggle () {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'theme-toggle'
  b.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark'
    root.dataset.theme = next
    try { localStorage.setItem('theme', next) } catch {}
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
