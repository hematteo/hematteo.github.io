// Discourage basic address harvesting; this is obfuscation, not access control.
// Build mail links only after a visitor activates a contact button.
document.querySelectorAll('[data-email-reveal]').forEach(button => {
  button.addEventListener('click', () => {
    const address = ['hcet.ehoettam', 'liamg', 'moc']
      .map(part => [...part].reverse().join(''))
    const email = `${address[0]}@${address[1]}.${address[2]}`
    const link = document.createElement('a')
    link.href = `mailto:${email}`
    link.textContent = email
    link.className = button.className
    button.replaceWith(link)
    link.focus({ preventScroll: true })
  }, { once: true })
})

// Progressive enhancement: figure links remain usable without JavaScript.
const dialog = document.getElementById('figure-dialog')
const expandedFigure = document.getElementById('expanded-figure')
const description = document.getElementById('figure-description')
let trigger = null

if (typeof dialog.showModal === 'function') {
  document.querySelectorAll('.figure-link').forEach(link => {
    link.addEventListener('click', event => {
      // Preserve opening figures in a new tab with modifier keys.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      trigger = link
      const source = link.querySelector('img')
      expandedFigure.src = link.href
      expandedFigure.alt = source.alt
      description.textContent = source.alt
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
