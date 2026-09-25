// Progressive enhancement: figure links remain usable without JavaScript.
const explorer = document.getElementById('trajectory-explorer')
if (explorer) {
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return
    observer.disconnect()
    import('./trajectories.js').then(module => module.mountTrajectories(explorer)).catch(() => {
      // The paper figure remains available if the interactive module cannot load.
    })
  }, { rootMargin: '300px' })
  observer.observe(explorer)
}

const dialog = document.getElementById('figure-dialog')
const expandedFigure = document.getElementById('expanded-figure')
const description = document.getElementById('figure-description')
let trigger = null
let nativeCopy = null // an inline SVG figure is shown as a copy, so it keeps following the theme

if (typeof dialog.showModal === 'function') {
  document.querySelectorAll('.figure-link').forEach(link => {
    link.addEventListener('click', event => {
      // Preserve opening figures in a new tab with modifier keys.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      trigger = link
      const source = link.querySelector('img, svg')
      const alt = source.getAttribute('alt') ?? source.getAttribute('aria-label') ?? ''
      nativeCopy?.remove()
      nativeCopy = null
      if (source.tagName === 'svg') {
        nativeCopy = source.cloneNode(true)
        nativeCopy.classList.remove('armed', 'play')
        nativeCopy.removeAttribute('data-focus')
        expandedFigure.hidden = true
        expandedFigure.after(nativeCopy)
      } else {
        expandedFigure.hidden = false
        expandedFigure.src = link.href
        expandedFigure.alt = alt
      }
      description.textContent = alt
      dialog.showModal()
    })
  })
  document.getElementById('close-figure').addEventListener('click', () => dialog.close())
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const bounds = dialog.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close()
  })
  dialog.addEventListener('close', () => trigger?.focus({ preventScroll: true }))
}
