// The inline script in <head> shows "??" for section and figure numbers once per visit. This
// "reruns LaTeX": LaTeX's own warning appears, the references resolve, and the visit is remembered.
export function finishCompile () {
  const root = document.documentElement
  if (!root.classList.contains('compiling')) return
  const log = document.createElement('div')
  log.className = 'latex-log'
  log.setAttribute('aria-hidden', 'true')
  log.textContent = 'LaTeX Warning: Label(s) may have changed. Rerun to get cross-references right.'
  document.body.append(log)
  requestAnimationFrame(() => log.classList.add('show'))
  setTimeout(() => root.classList.remove('compiling'), 1300)
  setTimeout(() => {
    log.classList.remove('show')
    setTimeout(() => log.remove(), 400)
  }, 2300)
  try { sessionStorage.setItem('compiled', '1') } catch {}
}
