// Hover previews for in-text references, as in arXiv's HTML papers: the footnote mark and the
// abstract's links show what they point to. Mouse hover and keyboard focus only; taps follow the link.
function entryPreview (entry) {
  const section = entry.closest('.section')
  const number = `${[...document.querySelectorAll('main > .section')].indexOf(section) + 1}.${[...section.querySelectorAll('.cv-entry')].indexOf(entry) + 1}`
  const card = document.createElement('div')
  const title = document.createElement('p')
  title.className = 'ref-title'
  title.textContent = `${number}  ${entry.querySelector('h3').textContent}`
  card.append(title)
  for (const selector of ['.paper-subtitle', '.authors']) {
    const node = entry.querySelector(selector)
    if (node) card.append(node.cloneNode(true))
  }
  const meta = entry.querySelector('.paper-meta')
  if (meta) {
    const line = document.createElement('p')
    line.className = 'ref-meta'
    line.textContent = [...meta.children].map(span => span.textContent).join(' · ') || meta.textContent
    card.append(line)
  }
  const figure = entry.querySelector('.research-preview')
  const thumbnail = figure?.dataset.thumbnail || figure?.querySelector('img')?.src
  if (thumbnail) {
    const img = document.createElement('img')
    img.src = thumbnail
    img.alt = ''
    card.append(img)
  }
  return card
}

function sectionPreview (section) {
  const card = document.createElement('div')
  const title = document.createElement('p')
  title.className = 'ref-title'
  title.textContent = section.querySelector('h2')?.textContent ?? ''
  card.append(title)
  for (const node of section.querySelectorAll('p, .contact-link')) card.append(node.cloneNode(true))
  return card
}

function previewFor (target) {
  if (target.matches('.cv-entry')) return entryPreview(target)
  if (target.matches('section')) return sectionPreview(target)
  const clone = target.cloneNode(true)
  clone.removeAttribute('id')
  return clone
}

export function mountPreviews () {
  const card = document.createElement('div')
  card.className = 'ref-preview'
  card.id = 'ref-preview'
  card.setAttribute('role', 'tooltip')
  card.hidden = true
  card.inert = true
  document.body.append(card)
  let timer = 0, owner = null

  const show = link => {
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)))
    if (!target) return
    card.replaceChildren(previewFor(target))
    card.hidden = false
    const r = link.getBoundingClientRect(), width = card.offsetWidth, height = card.offsetHeight
    const left = Math.min(Math.max(8, r.left + r.width / 2 - width / 2), innerWidth - width - 8)
    const top = r.bottom + 10 + height > innerHeight - 8 ? r.top - height - 10 : r.bottom + 10
    card.style.left = `${left + scrollX}px`
    card.style.top = `${top + scrollY}px`
    owner?.removeAttribute('aria-describedby')
    owner = link
    link.setAttribute('aria-describedby', card.id)
  }
  const hide = () => {
    clearTimeout(timer)
    card.hidden = true
    owner?.removeAttribute('aria-describedby')
    owner = null
  }

  for (const link of document.querySelectorAll('.footnote-ref, .abstract a[href^="#"]')) {
    link.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse') return
      clearTimeout(timer)
      timer = setTimeout(() => show(link), 250)
    })
    link.addEventListener('pointerleave', hide)
    link.addEventListener('focus', () => { if (link.matches(':focus-visible')) show(link) })
    link.addEventListener('blur', hide)
    link.addEventListener('click', hide)
  }
  addEventListener('keydown', e => { if (e.key === 'Escape') hide() })
}
