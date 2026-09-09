// All three examples are available in static HTML without JavaScript.
const controls = document.querySelector('.feature-example-controls')
const cards = [...document.querySelectorAll('.feature-example')]
if (controls && cards.length) {
  const select = id => {
    cards.forEach(card => { card.hidden = card.id !== 'feature-' + id })
    controls.querySelectorAll('button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.feature === id))
    })
  }
  controls.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => select(button.dataset.feature))
  })
  select('1227')
  controls.hidden = false
  cards.forEach(card => {
    const marker = card.querySelector('svg circle')
    const guide = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    guide.setAttribute('y1', '39'); guide.setAttribute('y2', '223')
    guide.setAttribute('stroke', '#9fb6a8'); guide.setAttribute('stroke-dasharray', '4 4')
    marker.before(guide)
    const stages = [...card.querySelectorAll('.stage-button')]
    const activate = button => {
      stages.forEach(stage => {
        const active = stage === button
        stage.setAttribute('aria-pressed', String(active))
        stage.closest('section').classList.toggle('is-active', active)
      })
      marker.setAttribute('cx', button.dataset.x); marker.setAttribute('cy', button.dataset.y)
      marker.setAttribute('r', '5')
      guide.setAttribute('x1', button.dataset.x); guide.setAttribute('x2', button.dataset.x)
      card.querySelector('.stage-readout').textContent = `${button.dataset.stage} · step ${Number(button.dataset.step).toLocaleString('en-GB')} · relative norm ${button.dataset.value}`
    }
    stages.forEach(button => {
      button.hidden = false
      button.previousElementSibling.hidden = true
      button.addEventListener('click', () => activate(button))
    })
    activate(stages[1])
  })
}
