import { createFlight } from './flight.js'
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { lightPath, inSpectrum, canPerch } from './discovery-rules.js'

const COLORS = [0xff655c, 0xffb45c, 0xffe779, 0x8ce5ad, 0x77c8ff, 0xbc97ff]
const NOTES = [
  ['One beam, many features', 'The prism separates a single beam into a spectrum. A little nod to Sparse Readout Prism: looking inside a score.', 'Bring the glass prism close to the little desk light.'],
  ['A different readout', 'The paper keeps the colors it passes through. Two papers, one conversation about what a readout reveals.', 'Now let the paper airplane catch the spectrum.'],
  ['A place to land', 'Research meets the mug that fueled a browser-based language-learning project. Even a paper needs a coffee break.', 'Bring the colored airplane gently beside the upright mug.'],
  ['A little wind tunnel', 'The GPU lends its cooling fans to the paper. Move the GPU to move the updraft, or let the plane settle after its flight.', 'Bring the airplane beside the upright GPU. Its fans have another use.'],
  ['Writing in light', 'The airplane carries the spectrum into the air, leaving a ribbon that fades behind it.', 'Send the colored airplane through the GPU’s updraft.'],
  ['Three-way conversation', 'GPU for lift, paper for flight, joystick for direction. Use the on-screen controls or focus the drawer and press WASD.', 'Bring the joystick near the GPU while the airplane is flying.'],
]

export function buildDeskLight () {
  const g = new THREE.Group()
  const brass = new THREE.MeshStandardMaterial({ color: 0xa68d65, roughness: 0.4, metalness: 0.7 })
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.12, 20), brass)
  foot.position.y = 0.06
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.36, 12), brass)
  stem.position.y = 0.29
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), new THREE.MeshStandardMaterial({
    color: 0xfff5d9, emissive: 0xffe3a3, emissiveIntensity: 2, roughness: 0.25,
  }))
  bulb.position.y = 0.56; bulb.name = 'bulb'
  const lamp = new THREE.PointLight(0xffe3bb, 2, 4, 2)
  lamp.position.y = 0.7; lamp.name = 'desk-light'
  g.add(foot, stem, bulb, lamp)
  foot.castShadow = stem.castShadow = bulb.castShadow = true
  const body = new CANNON.Body({ mass: 2.2, angularDamping: 0.8 })
  body.addShape(new CANNON.Cylinder(0.3, 0.34, 0.12, 16), new CANNON.Vec3(0, 0.06, 0))
  body.addShape(new CANNON.Sphere(0.2), new CANNON.Vec3(0, 0.56, 0))
  return { g, body }
}

export function createDiscoveries ({ scene, objects, bounds, grabbed, wake, reduced, announce, sound }) {
  const get = id => objects.find(o => o.item.id === id)
  const light = get('light'), prism = get('prism'), plane = get('plane'), mug = get('mug'), gpu = get('gpu'), joystick = get('joystick')
  const found = new Set()
  let interacted = false
  let on = true, path = null, colored = false, perched = false, cooldown = 0
  let lightDwell = 0, colorDwell = 0, perchDwell = 0, fade = 0, tint = 0, perchTime = 0
  let perchStart = new THREE.Vector3(), perchRotation = new THREE.Quaternion()
  let toastTimer
  const up = new CANNON.Vec3(), axis = new CANNON.Vec3(0, 1, 0)
  const notes = document.getElementById('discovery-notes')
  const toggle = document.getElementById('discoveries-toggle')
  const toast = document.getElementById('discovery-toast')
  const title = document.getElementById('discovery-title')
  const clue = document.getElementById('discovery-clue')
  const list = document.getElementById('discovery-list')
  const arrangeButton = document.getElementById('discovery-arrange')

  // Each wing has its own tint, retained when it leaves the beam.
  const paper = plane.mesh.children[0]
  const positions = paper.geometry.attributes.position
  const neutralColors = new Float32Array(positions.count * 3).fill(1)
  const wingColors = Array.from({ length: positions.count }, (_, i) => {
    const mix = THREE.MathUtils.clamp((positions.getX(i) + 0.5) / 1, 0, 1) * 5
    return new THREE.Color(COLORS[Math.floor(mix)]).lerp(new THREE.Color(COLORS[Math.min(5, Math.ceil(mix))]), mix % 1)
  })
  paper.geometry.setAttribute('color', new THREE.BufferAttribute(neutralColors, 3))
  paper.material = new THREE.MeshPhysicalMaterial({ color: 0xf7f5ef, vertexColors: true, roughness: 0.65,
    side: THREE.DoubleSide, flatShading: true, iridescence: 0, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 450] })

  // A real beam between the two objects and six tapered bands on the mat.
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff5dd, transparent: true, opacity: 0, depthWrite: false }))
  scene.add(beam)
  const fadeCanvas = document.createElement('canvas')
  fadeCanvas.width = 2; fadeCanvas.height = 128
  const ctx = fadeCanvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, 128)
  gradient.addColorStop(0, '#ffffff00'); gradient.addColorStop(0.35, '#ffffffa0'); gradient.addColorStop(1, '#ffffffff')
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 2, 128)
  const fadeTexture = new THREE.CanvasTexture(fadeCanvas)
  const bands = COLORS.map(color => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0], 2))
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, map: fadeTexture, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }))
    mesh.frustumCulled = false
    scene.add(mesh)
    return mesh
  })
  const from = new THREE.Vector3(), to = new THREE.Vector3(), direction = new THREE.Vector3()
  const yAxis = new THREE.Vector3(0, 1, 0)

  function renderNotes () {
    toggle.textContent = found.size ? `Discoveries ${found.size}/${NOTES.length}` : 'Discoveries'
    title.textContent = found.size === NOTES.length ? 'A little world, connected.' : 'Some things belong together.'
    clue.textContent = found.size === NOTES.length ? 'Move them apart and bring them back. The paper remembers its colors until you dump the drawer again.' : NOTES[NOTES.findIndex((_, i) => !found.has(i))][2]
    list.replaceChildren(...[...found].sort((a, b) => a - b).map(id => {
      const item = document.createElement('li')
      const heading = document.createElement('strong')
      heading.textContent = NOTES[id][0]
      const detail = document.createElement('span')
      detail.textContent = NOTES[id][1]
      item.append(heading, detail)
      return item
    }))
    arrangeButton.textContent = found.size === NOTES.length ? 'Arrange them again' : 'Help me arrange this pair'
  }
  function discover (id) {
    if (found.has(id)) return
    found.add(id)
    renderNotes()
    toast.textContent = NOTES[id][0]
    toast.hidden = false
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toast.hidden = true }, 4200)
    announce(`Discovery ${found.size} of ${NOTES.length}. ${NOTES[id][0]}. ${NOTES[id][1]}`)
    sound()
  }
  function detach () {
    if (!perched) return
    perched = false
    plane.body.type = CANNON.Body.DYNAMIC
    plane.body.collisionFilterMask = -1
    plane.body.updateMassProperties()
    plane.body.wakeUp()
    cooldown = 1.2
    wake(120)
  }
  function setPosition (o, x, z, y = 0.03) {
    const b = bounds()
    o.body.position.set(THREE.MathUtils.clamp(x, b.xL + o.radius, b.xR - o.radius), y,
      THREE.MathUtils.clamp(z, b.zB + o.radius, b.zF - o.radius))
    o.body.quaternion.set(0, 0, 0, 1)
    o.body.velocity.set(0, 0, 0)
    o.body.angularVelocity.set(0, 0, 0)
    o.body.aabbNeedsUpdate = true
    o.body.wakeUp()
  }
  function arrange () {
    interacted = true
    detach()
    flight.reset()
    const next = NOTES.findIndex((_, i) => !found.has(i))
    const step = next < 0 ? NOTES.length : next
    const b = bounds(), cx = (b.xL + b.xR) / 2, cz = (b.zB + b.zF) / 2
    const horizontal = b.xR - b.xL > 8
    const along = horizontal ? [1, 0] : [0, 1]
    const origin = horizontal ? [cx - 1.5, cz] : [cx, cz - 1.5]
    const place = (o, distance) => setPosition(o, origin[0] + along[0] * distance, origin[1] + along[1] * distance)
    // Clear the small experiment area so a random pile cannot obstruct the pairing.
    const participants = new Set(['light', 'prism', 'plane', 'mug', ...(step >= 3 ? ['gpu', 'joystick'] : [])])
    objects.filter(o => !participants.has(o.item.id)).forEach((o, i) => {
      const row = Math.floor(i / 3), col = i % 3
      setPosition(o, b.xL + 1 + col * (b.xR - b.xL - 2) / 2, b.zB + 0.9 + row * 1.2, 0.15)
    })
    on = true
    place(light, -1.2)
    place(prism, 0.5)
    if (step >= 3) {
      setPosition(gpu, cx, cz + 0.3)
      setPosition(plane, cx + 0.8, cz, 0.7)
      setPosition(mug, cx - 1.4, cz + 2.5)
      setPosition(joystick, cx - 1, step >= 5 ? cz + 0.9 : b.zB + 0.9)
      colored = found.has(1)
      flight.prepare()
    } else if (step === 0) {
      setPosition(plane, cx + (horizontal ? 1.3 : 1.4), cz + (horizontal ? 2 : 0), 0.2)
      setPosition(mug, cx - (horizontal ? 0 : 1.5), cz + 2.1)
    } else {
      place(plane, 1.9)
      if (step >= 2) {
        // Approach the rim from the wing side, without starting intersecting
        // collision shapes (the nose-side overlap used to tip the mobile mug).
        setPosition(mug, plane.body.position.x + 0.85, plane.body.position.z)
        colored = true; cooldown = 0
      } else place(mug, 4.0)
    }
    closeNotes()
    wake(240)
    announce('Objects arranged. Watch what happens, or drag them to experiment.')
  }
  toggle.addEventListener('click', () => {
    notes.hidden = !notes.hidden
    toggle.setAttribute('aria-expanded', String(!notes.hidden))
    if (!notes.hidden) document.getElementById('discovery-close').focus()
  })
  function closeNotes () { notes.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.focus() }
  document.getElementById('discovery-close').addEventListener('click', closeNotes)
  notes.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeNotes() } })
  arrangeButton.addEventListener('click', arrange)
  renderNotes()
  const flight = createFlight({ scene, objects, bounds, grabbed, reduced, wake,
    colored: () => colored, detach, discover })

  return {
    toggleLight () { interacted = true; on = !on; wake(120); announce(on ? 'Desk light on. Bring the prism closer.' : 'Desk light off.'); return on },
    handleKey (ev) { return flight.handleKey(ev) },
    beforeGrab (o) { interacted = true; flight.beforeGrab(o); if (o === plane) detach() },
    reset () {
      flight.reset(); detach(); interacted = false; colored = false; on = true; path = null; lightDwell = colorDwell = perchDwell = 0
      cooldown = 2; wake(180)
    },
    state () { return { found: [...found], lightOn: on, spectrum: !!path, colored, perched, tint, flight: flight.state() } },
    active () { return flight.active() || Math.abs(fade - (path ? 1 : 0)) > 0.005 || Math.abs(tint - (colored ? 1 : 0)) > 0.005 ||
      (lightDwell > 0 && lightDwell < 0.7) || (colorDwell > 0 && colorDwell < 0.7) || (perchDwell > 0 && perchDwell < 0.5) || (perched && perchTime < 1) },
    update (dt) {
      cooldown = Math.max(0, cooldown - dt)
      const held = grabbed()
      light.body.quaternion.vmult(axis, up)
      const available = on && up.y > 0.65 && prism.mesh.visible && light.mesh.visible
      path = lightPath(light.body.position, prism.body.position, bounds(), available)
      const valid = interacted && !!path && held !== prism && held !== light && prism.body.velocity.lengthSquared() < 1
      lightDwell = valid ? Math.min(1, lightDwell + dt) : 0
      if (lightDwell >= 0.7) discover(0)
      const bulb = light.mesh.getObjectByName('bulb')
      bulb.material.emissiveIntensity = on ? 2 : 0
      light.mesh.getObjectByName('desk-light').intensity = on ? 2 : 0
      fade = reduced ? (path ? 1 : 0) : THREE.MathUtils.damp(fade, path ? 1 : 0, 7, dt)
      beam.material.opacity = path ? fade * 0.55 : 0
      if (path) {
        from.set(0, 0.56, 0).applyQuaternion(light.mesh.quaternion).add(light.mesh.position)
        to.set(prism.body.position.x, prism.body.position.y + 0.24, prism.body.position.z)
        direction.subVectors(to, from)
        beam.position.copy(from).add(to).multiplyScalar(0.5)
        beam.scale.y = direction.length()
        beam.quaternion.setFromUnitVectors(yAxis, direction.normalize())
        bands.forEach((band, i) => {
          const point = (d, offset) => [path.x + path.ux * d - path.uz * offset, 0.025, path.z + path.uz * d + path.ux * offset]
          const nearA = (i / 6 - 0.5) * 0.13, nearB = ((i + 1) / 6 - 0.5) * 0.13
          const width = 0.36 + path.length * 0.5
          const farA = (i / 6 - 0.5) * width, farB = ((i + 1) / 6 - 0.5) * width
          const a = point(0.1, nearA), b = point(path.length, farA), c = point(path.length, farB), d = point(0.1, nearB)
          band.geometry.attributes.position.array.set([...a, ...b, ...c, ...a, ...c, ...d])
          band.geometry.attributes.position.needsUpdate = true
        })
      }
      bands.forEach(band => { band.material.opacity = fade * 0.55 })
      colorDwell = interacted && found.has(0) && inSpectrum(plane.body.position, path) ? Math.min(1, colorDwell + dt) : 0
      if (colorDwell >= 0.7) { colored = true; discover(1) }
      tint = reduced ? (colored ? 1 : 0) : THREE.MathUtils.damp(tint, colored ? 1 : 0, 3, dt)
      const colors = paper.geometry.attributes.color
      wingColors.forEach((color, i) => colors.setXYZ(i, 1 + (color.r - 1) * tint, 1 + (color.g - 1) * tint, 1 + (color.b - 1) * tint))
      colors.needsUpdate = true
      paper.material.iridescence = tint
      paper.material.roughness = 0.65 - tint * 0.25
      mug.body.quaternion.vmult(axis, up)
      if (perched && (up.y < 0.8 || held === plane)) detach()
      const nearMug = !flight.isFlying() && !perched && held !== plane && held !== mug && cooldown === 0 && canPerch(plane.body.position, mug.body.position, up.y, colored, plane.body.velocity.length())
      perchDwell = nearMug ? Math.min(1, perchDwell + dt) : 0
      if (perchDwell >= 0.5 && !perched) {
        perched = true; perchTime = 0
        perchStart.copy(plane.body.position); perchRotation.copy(plane.body.quaternion)
        plane.body.type = CANNON.Body.KINEMATIC
        plane.body.collisionFilterMask = 0
        plane.body.velocity.set(0, 0, 0); plane.body.angularVelocity.set(0, 0, 0)
        plane.body.updateMassProperties()
        discover(2)
      }
      flight.update(dt)
      if (perched) {
        perchTime = Math.min(1, perchTime + dt * 1.5)
        const progress = reduced ? 1 : perchTime * perchTime * (3 - 2 * perchTime)
        const target = new THREE.Vector3(0.26, 0.48, 0).applyQuaternion(mug.mesh.quaternion).add(mug.mesh.position)
        const rotation = mug.mesh.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(yAxis, -Math.PI / 2))
        plane.mesh.position.lerpVectors(perchStart, target, progress)
        plane.mesh.quaternion.slerpQuaternions(perchRotation, rotation, progress)
        plane.body.position.copy(plane.mesh.position); plane.body.quaternion.copy(plane.mesh.quaternion)
        plane.body.aabbNeedsUpdate = true
        if (perchTime === 1) plane.body.sleep()
      }
    },
  }
}
