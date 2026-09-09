const palette = [[68,1,84],[71,44,122],[59,81,139],[44,113,142],[33,144,141],[39,173,129],[92,200,99],[170,220,50],[253,231,37]]
const format = n => n.toLocaleString('en-GB')
const compact = n => n >= 1000 ? `${n / 1000}k` : String(n)
function colour(peak) {
  const position = Math.log10(peak + 1) / Math.log10(928001) * (palette.length - 1)
  const index = Math.min(palette.length - 2, Math.floor(position))
  const t = position - index
  return `rgb(${palette[index].map((v, i) => Math.round(v + t * (palette[index + 1][i] - v))).join(',')})`
}

export async function mountTrajectories(root) {
  const response = await fetch('/research/trajectories.json')
  if (!response.ok) return
  const { models } = await response.json()
  const interactive = root.querySelector('.trajectory-interactive')
  const fallback = root.querySelector('.trajectory-fallback')
  const canvas = root.querySelector('canvas')
  const context = canvas.getContext('2d')
  if (!context) return
  const slider = root.querySelector('input')
  const stepLabel = root.querySelector('output')
  const sample = root.querySelector('.trajectory-sample')
  const readout = root.querySelector('.curve-readout')
  const play = root.querySelector('.trajectory-play')
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  let modelIndex = 1, checkpoint = 31, selected = null, hoverStep = null, timer = null
  let width = 0, height = 0, left = 0, right = 0, top = 0, bottom = 0
  let xs = [], ys = [], colours = []
  const model = () => models[modelIndex]
  const firstCheckpoint = () => model().steps[0] === 0 ? 1 : 0
  const currentModelButtons = root.querySelectorAll('[data-model]')

  function stop() {
    clearInterval(timer)
    timer = null
    updateMotionLabel()
  }

  function setReadout() {
    if (selected === null) {
      readout.textContent = 'Hover or tap a curve to inspect it. Use arrow keys when the chart is focused.'
      return
    }
    const curve = model().curves[selected]
    const step = Math.min(hoverStep ?? checkpoint, checkpoint)
    readout.textContent = `Feature ${format(curve.id)} · peak at step ${format(curve.peak)} · relative norm ${curve.v[step].toFixed(3)} at step ${format(model().steps[step])}`
  }

  function draw() {
    const m = model()
    const ctx = context
    ctx.clearRect(0, 0, width, height)
    ctx.font = '12px "DM Sans", sans-serif'
    ctx.lineWidth = 1
    ctx.textAlign = 'right'
    for (const value of [0, .25, .5, .75, 1]) {
      const y = bottom - value * (bottom - top)
      ctx.strokeStyle = '#e8ece6'
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke()
      ctx.fillStyle = '#727b74'
      ctx.fillText(value === 0 || value === 1 ? String(value) : value.toFixed(2), left - 12, y + 4)
    }
    ctx.textAlign = 'left'; ctx.fillStyle = '#58665e'
    ctx.fillText('Decoder norm / own peak', left, 17)
    const ticks = m.name.startsWith('OLMo') ? [150,1000,14000,110000,928000] : [1,10,100,1000,14000,143000]
    const xFor = step => left + (Math.log10(step) - Math.log10(m.steps[firstCheckpoint()])) /
      (Math.log10(m.steps.at(-1)) - Math.log10(m.steps[firstCheckpoint()])) * (right - left)
    ticks.forEach((tick, i) => {
      if (width < 440 && tick === 10) return
      const x = xFor(tick)
      ctx.textAlign = i === 0 ? 'left' : i === ticks.length - 1 ? 'right' : 'center'
      ctx.fillStyle = '#727b74'; ctx.fillText(compact(tick), x, bottom + 23)
    })
    ctx.textAlign = 'right'; ctx.fillText('Training step · log scale', right, height - 4)
    ctx.save()
    ctx.beginPath(); ctx.rect(left, top, Math.max(1, xs[checkpoint] - left), bottom - top); ctx.clip()
    ctx.globalAlpha = selected === null ? .12 : .045
    ctx.lineWidth = .8
    for (let j = 0; j < m.curves.length; j++) {
      ctx.strokeStyle = colours[j]; ctx.beginPath()
      for (let k = firstCheckpoint(); k < xs.length; k++) {
        if (k === firstCheckpoint()) ctx.moveTo(xs[k], ys[j][k]); else ctx.lineTo(xs[k], ys[j][k])
      }
      ctx.stroke()
    }
    if (selected !== null) {
      ctx.globalAlpha = 1; ctx.lineWidth = 2.5; ctx.strokeStyle = colours[selected]
      ctx.beginPath()
      for (let k = firstCheckpoint(); k < xs.length; k++) {
        if (k === firstCheckpoint()) ctx.moveTo(xs[k], ys[selected][k]); else ctx.lineTo(xs[k], ys[selected][k])
      }
      ctx.stroke()
    }
    ctx.restore()
    const marker = Math.min(hoverStep ?? checkpoint, checkpoint)
    if (checkpoint < 31 || selected !== null) {
      const x = xs[marker]
      ctx.strokeStyle = '#4b6b5a'; ctx.lineWidth = 1; ctx.setLineDash([3,4])
      ctx.beginPath(); ctx.moveTo(x,top); ctx.lineTo(x,bottom); ctx.stroke(); ctx.setLineDash([])
      if (selected !== null) {
        ctx.fillStyle = colours[selected]; ctx.beginPath(); ctx.arc(x,ys[selected][marker],4,0,Math.PI*2); ctx.fill()
      }
    }
    slider.value = String(checkpoint)
    stepLabel.textContent = format(m.steps[checkpoint])
    slider.setAttribute('aria-valuetext', `Training step ${format(m.steps[checkpoint])} of ${format(m.steps.at(-1))}`)
    setReadout()
  }

  function resize() {
    width = canvas.parentElement.clientWidth
    height = width < 450 ? 270 : 350
    const dpr = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`
    context.setTransform(dpr,0,0,dpr,0,0)
    left = width < 450 ? 39 : 48; right = width - 12; top = 35; bottom = height - 48
    const m = model(), start = Math.log10(m.steps[firstCheckpoint()]), end = Math.log10(m.steps.at(-1))
    xs = m.steps.map(step => left + (Math.log10(Math.max(step,1)) - start) / (end - start) * (right - left))
    ys = m.curves.map(curve => curve.v.map(v => bottom - v * (bottom - top)))
    colours = m.curves.map(curve => colour(curve.peak))
    draw()
  }

  function chooseModel(index) {
    stop(); modelIndex = index; selected = null; hoverStep = null; checkpoint = 31
    currentModelButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.model) === index)))
    slider.min = String(firstCheckpoint())
    sample.textContent = `${format(model().curves.length)} sampled curves from ${format(model().total)} active features. Measured checkpoints; straight lines join observations.`
    canvas.setAttribute('aria-label', `${model().name} feature trajectories. Use left and right arrow keys to inspect sampled features; use the training slider to inspect checkpoints.`)
    resize()
  }
  currentModelButtons.forEach(button => button.addEventListener('click', () => chooseModel(Number(button.dataset.model))))
  slider.addEventListener('input', () => { stop(); checkpoint = Number(slider.value); hoverStep = null; draw() })
  play.addEventListener('click', () => {
    if (timer) { stop(); return }
    if (reducedMotion.matches) { checkpoint = Math.min(31, checkpoint < 31 ? checkpoint + 1 : firstCheckpoint()); draw(); return }
    if (checkpoint === 31) checkpoint = firstCheckpoint()
    selected = null; hoverStep = null
    play.innerHTML = 'Ⅱ <span>Pause replay</span>'; play.setAttribute('aria-label','Pause training replay')
    draw()
    timer = setInterval(() => {
      checkpoint++; draw()
      if (checkpoint >= 31) stop()
    }, 220)
  })
  canvas.tabIndex = 0
  canvas.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault(); stop(); readout.setAttribute('aria-live','polite')
    const direction = event.key === 'ArrowLeft' ? -1 : 1
    selected = ((selected ?? (direction === 1 ? -1 : 0)) + direction + model().curves.length) % model().curves.length
    hoverStep = null; draw()
  })
  canvas.addEventListener('pointermove', event => {
    if (timer) return
    readout.setAttribute('aria-live','off')
    const bounds = canvas.getBoundingClientRect(), px = event.clientX - bounds.left, py = event.clientY - bounds.top
    if (px < left || px > xs[checkpoint] || py < top || py > bottom) return
    let nearest = firstCheckpoint()
    for (let k = nearest; k <= checkpoint; k++) if (Math.abs(xs[k] - px) < Math.abs(xs[nearest] - px)) nearest = k
    hoverStep = nearest
    let distance = Infinity
    ys.forEach((curve, index) => { const d = Math.abs(curve[nearest] - py); if (d < distance) {distance = d; selected = index} })
    draw()
  })
  canvas.addEventListener('pointerdown', event => {
    // Touch browsers do not consistently emit a hover move before a tap.
    if (event.pointerType === 'touch') canvas.dispatchEvent(new PointerEvent('pointermove', {
      clientX: event.clientX, clientY: event.clientY, pointerType: 'touch'
    }))
  })
  canvas.addEventListener('pointerleave', event => {
    if (event.pointerType === 'touch') return
    selected = null; hoverStep = null; draw()
  })
  canvas.addEventListener('blur', () => { selected = null; hoverStep = null; draw() })
  reducedMotion.addEventListener('change', () => { stop(); updateMotionLabel() })
  function updateMotionLabel() {
    play.innerHTML = reducedMotion.matches ? '→ <span>Next checkpoint</span>' : '▶ <span>Replay training</span>'
    play.setAttribute('aria-label', reducedMotion.matches ? 'Show next training checkpoint' : 'Play training replay')
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop() })
  new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop() }).observe(root)
  interactive.hidden = false; fallback.hidden = true
  chooseModel(1); updateMotionLabel()
  new ResizeObserver(resize).observe(canvas.parentElement)
}
