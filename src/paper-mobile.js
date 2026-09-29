// Phone navigation and figure zoom. Without this script the plain nav stays visible.
import { themeToggle } from './theme.js'

const phone = matchMedia('(max-width:640px)')

function buildRunningHead () {
  const masthead = document.querySelector('.masthead')
  const main = document.querySelector('main')
  if (!masthead || !main) return

  // Section and entry numbers, matching the CSS counters in paper.css
  const marks = []
  let rows = ''
  const sections = [...main.querySelectorAll(':scope > .section')]
  sections.forEach((section, i) => {
    const h2 = section.querySelector('.section-heading h2')
    if (!h2) return
    const n = `${i + 1}`
    marks.push({ el: section, n, text: h2.textContent })
    rows += `<a class="toc-section" href="#${section.id}"><span class="n">${n}</span><span class="t">${h2.textContent}</span></a>`
    section.querySelectorAll('.cv-entry').forEach((entry, j) => {
      const h3 = entry.querySelector('h3')
      if (!h3) return
      if (!entry.id) entry.id = `${section.id}-${j + 1}`
      const year = entry.querySelector('.entry-date')?.textContent.match(/\d{4}(–\d{4})?/)?.[0] ?? ''
      marks.push({ el: entry, n: `${n}.${j + 1}`, text: h3.textContent })
      rows += `<a class="toc-entry" href="#${entry.id}"><span class="n">${n}.${j + 1}</span><span class="t">${h3.textContent}</span>${year ? `<span class="fill" aria-hidden="true"></span><span class="yr">${year}</span>` : ''}</a>`
    })
  })
  const contact = main.querySelector('#contact')
  if (contact) {
    marks.push({ el: contact, n: '', text: 'Contact' })
    rows += '<a class="toc-section" href="#contact"><span class="n"></span><span class="t">Contact</span></a>'
  }
  const cv = masthead.querySelector('a[href$=".pdf"]')?.getAttribute('href')
  const extras = [cv && `<a href="${cv}"><span class="n"></span><span class="t">CV (PDF)</span></a>`].filter(Boolean).join('')

  const bar = document.createElement('div')
  bar.className = 'running-head'
  bar.innerHTML = `
    <button type="button" class="rh-toggle" aria-expanded="false" aria-controls="rh-contents">
      <span class="rh-label">Contents</span><span class="rh-caret" aria-hidden="true">▾</span>
    </button>
    ${cv ? `<a href="${cv}"><span>CV</span></a>` : ''}
    <button type="button" class="rh-top" aria-label="Back to top" hidden>↑</button>
    <nav class="rh-contents" id="rh-contents" aria-label="Contents" hidden>
      <p>Contents</p>${rows}${extras ? `<div class="toc-extra">${extras}</div>` : ''}
    </nav>`
  masthead.after(bar)
  bar.querySelector('.rh-top').before(themeToggle())
  document.documentElement.classList.add('has-running-head')

  const toggle = bar.querySelector('.rh-toggle')
  const label = bar.querySelector('.rh-label')
  const contents = bar.querySelector('.rh-contents')
  const top = bar.querySelector('.rh-top')
  const setOpen = open => {
    contents.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
  }
  toggle.addEventListener('click', () => setOpen(contents.hidden))
  contents.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false) })
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !contents.hidden) { setOpen(false); toggle.focus() } })
  document.addEventListener('click', e => { if (!contents.hidden && !bar.contains(e.target)) setOpen(false) })
  top.addEventListener('click', () => { setOpen(false); scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) })

  // Border once stuck; label follows the last heading scrolled past
  const intro = document.querySelector('.intro h1')
  let queued = false
  const update = () => {
    queued = false
    if (!phone.matches) return
    // Entries land at the scroll margin (just under the bar) after a contents jump
    const offset = bar.getBoundingClientRect().bottom + 12
    bar.classList.toggle('stuck', bar.getBoundingClientRect().top <= 0.5)
    let current = null
    for (const mark of marks) if (mark.el && mark.el.getBoundingClientRect().top < offset) current = mark
    const past = intro ? intro.getBoundingClientRect().bottom < 0 : scrollY > 200
    top.hidden = !past
    label.innerHTML = current && past ? `${current.n ? `<b>${current.n}</b>` : ''}${current.text}` : 'Contents'
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update) } }
  addEventListener('scroll', queue, { passive: true })
  addEventListener('resize', queue)
  update()
}

function enableFigureZoom () {
  const dialog = document.getElementById('figure-dialog')
  const img = document.getElementById('expanded-figure')
  if (!dialog || !img) return
  const frame = document.createElement('div')
  frame.className = 'zoom-frame'
  img.before(frame)
  frame.append(img)
  const hint = document.createElement('p')
  hint.className = 'zoom-hint'
  hint.textContent = 'Tap the figure to zoom; drag to pan.'
  frame.after(hint)
  img.addEventListener('click', e => {
    const zooming = !img.classList.contains('zoomed')
    const box = img.getBoundingClientRect()
    const fx = (e.clientX - box.left) / box.width, fy = (e.clientY - box.top) / box.height
    img.classList.toggle('zoomed', zooming)
    // Keep the tapped point under the finger
    if (zooming) frame.scrollTo({ left: fx * frame.scrollWidth - frame.clientWidth / 2, top: fy * frame.scrollHeight - frame.clientHeight / 2 })
  })
  dialog.addEventListener('close', () => img.classList.remove('zoomed'))
}

buildRunningHead()
enableFigureZoom()
