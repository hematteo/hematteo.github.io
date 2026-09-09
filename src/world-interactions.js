import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { reflectedRay, rayHit } from './discovery-rules.js'

// Short-lived effects share the drawer's render/sleep lifecycle.
export function createWorldInteractions ({ scene, objects, grabbed, wake, reduced, announce, discover, lightOn }) {
  const get = id => objects.find(o => o.item.id === id)
  const dolphin = get('dolphin'), boat = get('punt'), gpu = get('gpu'), keyboard = get('keyboard')
  const paper = get('plane'), lamp = get('light'), trophy = get('trophy'), prism = get('prism')
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
  const upright = o => new THREE.Vector3(0, 1, 0).applyQuaternion(o.body.quaternion).y
  let enabled = false, echo = null, echoQueue = 0, echoReturns = 0
  let training = 'idle', runTime = 0, trainDwell = 0, blink = 0, resumed = false
  let riding = false, boardTime = 0, boatDwell = 0, boatCooldown = 0, start = new THREE.Vector3()
  const boatMass = boat.body.mass
  let pinned = false, pinDwell = 0, releaseTime = 0, endpoint = null, pinPoint = null, reflectDwell = 0
  const runPanel = document.getElementById('training-controls'), runLabel = document.getElementById('training-status')
  const resumeButton = document.getElementById('training-resume')
  let keys
  keyboard.mesh.traverse(o => { if (o.isInstancedMesh && o.count >= 40) keys = o })
  const originalKeys = keys ? Array.from({ length: keys.count }, (_, i) => { const c = new THREE.Color(0xffffff); if (keys.instanceColor) keys.getColorAt(i, c); return c }) : []
  const ring = color => {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 96), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }))
    mesh.rotation.x = -Math.PI / 2; mesh.visible = false; scene.add(mesh); return mesh
  }
  const outgoing = ring(0x9edee8), returns = Array.from({ length: 6 }, () => ring(0xd5f2ec))
  const line = (color, count = 2) => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    const mesh = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false }))
    mesh.visible = false; mesh.frustumCulled = false; scene.add(mesh); return mesh
  }
  const residual = line(0xf8f8e8, 32), incident = line(0xffe9b9), reflected = line(0xffd994)
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.45, 40), new THREE.MeshBasicMaterial({ color: 0xffd58a, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }))
  spot.rotation.x = -Math.PI / 2; spot.visible = false; scene.add(spot)
  const glow = new THREE.PointLight(0xffcf86, 0, 1.6, 2); scene.add(glow)
  function setLine (mesh, a, b) { const p = mesh.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true; mesh.visible = true }
  function emitEcho () {
    enabled = true
    const origin = dolphin.body.position.clone()
    const targets = objects.filter(o => o !== dolphin && o.mesh.visible).map(o => {
      const d = distance(origin, o.body.position), travel = Math.max(0.2, d - o.radius)
      return { id: o.item.id, x: origin.x + (o.body.position.x - origin.x) * travel / Math.max(d, 0.01), z: origin.z + (o.body.position.z - origin.z) * travel / Math.max(d, 0.01), travel, returned: false }
    }).filter(t => t.travel < 4.6).sort((a, b) => a.travel - b.travel).slice(0, 6)
    echo = { origin, targets, age: 0 }; echoReturns = 0; wake(300)
    announce('A pulse leaves the dolphin. Nearby objects send it back.')
  }
  const roughBoat = () => boat.body.velocity.length() > 3.5 || boat.body.angularVelocity.length() > 3.5 || upright(boat) < 0.55
  function leaveBoat (jump = true) {
    if (!riding) return
    riding = false; boatCooldown = 3; boatDwell = 0
    const body = dolphin.body
    body.type = CANNON.Body.DYNAMIC; body.collisionFilterMask = -1; body.updateMassProperties()
    body.position.z += jump ? 0.7 : 0
    body.velocity.set(0, jump && !reduced ? 2.7 : 0, jump && !reduced ? 2 : 0)
    body.angularVelocity.set(0, 0, 0); body.aabbNeedsUpdate = true; body.wakeUp()
    boat.body.mass = boatMass; boat.body.updateMassProperties(); boat.body.wakeUp(); wake(180)
    if (jump) announce('Too bumpy. The dolphin has abandoned ship.')
  }
  function paintKeys (progress) {
    if (!keys) return
    originalKeys.forEach((c, i) => keys.setColorAt(i, c))
    const count = Math.min(10, Math.floor(progress * 10) + 1)
    for (let col = 0; col < count; col++) {
      const row = Math.min(3, Math.floor(col / 2.6))
      keys.setColorAt(row * 10 + col, new THREE.Color(training === 'stalled' ? 0xffba58 : 0x80e1bd))
    }
    keys.instanceColor.needsUpdate = true
  }
  function resume () {
    if (training !== 'stalled') return
    training = 'running'; resumed = true; runTime = 0; wake(240)
    announce('Toy training resumed. A smaller step lets the little loss curve descend again.')
  }
  resumeButton.addEventListener('click', resume)
  function reflection () {
    if (!lightOn() || upright(lamp) < 0.65 || upright(trophy) < 0.7 || distance(lamp.body.position, trophy.body.position) > 3.2) return null
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(trophy.body.quaternion)
    const ray = reflectedRay(lamp.body.position, trophy.body.position, normal)
    if (!ray) return null
    const hits = objects.filter(o => o !== lamp && o !== trophy && o.mesh.visible && Math.abs(o.body.position.y - trophy.body.position.y) < 1)
      .map(o => ({ o, t: rayHit(trophy.body.position, ray, o.body.position, o.radius * 0.75) }))
      .filter(h => h.t !== null && h.t < 4).sort((a, b) => a.t - b.t)
    return { ray, hit: hits[0]?.o, length: hits[0]?.t ?? 3 }
  }
  return {
    enable () { enabled = true },
    queueEcho () { enabled = true; echoQueue = 0.9; wake(300) },
    emitEcho,
    action (id) {
      if (id === 'dolphin') emitEcho()
      if (id === 'keyboard') { enabled = true; resume() }
      if (id === 'punt' && riding) { boat.body.velocity.z += 4.5; boat.body.angularVelocity.x += 4; boat.body.wakeUp(); if (roughBoat()) leaveBoat(); wake(180) }
      if (id === 'trophy') { trophy.body.quaternion.mult(new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 12), trophy.body.quaternion); trophy.body.aabbNeedsUpdate = true; trophy.body.wakeUp(); enabled = true; wake(180) }
    },
    dolphinBusy () { return riding || !!echo },
    reflectedSource () { return reflection()?.hit === prism ? trophy : null },
    beforeGrab (o) { enabled = true; if (o === dolphin) leaveBoat(false); if (o === paper && pinned) { pinned = false; releaseTime = 1.2; pinDwell = 0; wake(120) } },
    reset () {
      leaveBoat(false); enabled = false; echo = null; echoQueue = 0; outgoing.visible = false; returns.forEach(r => { r.visible = false })
      training = 'idle'; runTime = trainDwell = blink = 0; resumed = false; gpu.mesh.userData.training = null; runPanel.hidden = true
      if (keys) { originalKeys.forEach((c, i) => keys.setColorAt(i, c)); keys.instanceColor.needsUpdate = true }
      pinned = false; endpoint = null; pinDwell = releaseTime = reflectDwell = 0; residual.visible = incident.visible = reflected.visible = spot.visible = false; glow.intensity = 0
    },
    state () { const r = reflection(); return { echoActive: !!echo, echoReturns, training, riding, boarding: riding && boardTime < 1, pinned, residualEnd: endpoint, reflectedTarget: r?.hit?.item.id ?? null } },
    active () { return !!echo || echoQueue > 0 || training === 'running' || blink > 0 || (trainDwell > 0 && trainDwell < 0.7) || (riding && boardTime < 1) || (boatDwell > 0 && boatDwell < 0.55) || releaseTime > 0 || (pinDwell > 0 && pinDwell < 0.4) || (reflectDwell > 0 && reflectDwell < 0.6) },
    update (dt, path) {
      if (echoQueue > 0) { echoQueue -= dt; if (echoQueue <= 0) emitEcho() }
      if (echo) {
        echo.age += dt
        const radius = reduced ? 4.6 : echo.age * 3
        outgoing.visible = true; outgoing.position.set(echo.origin.x, 0.055, echo.origin.z); outgoing.scale.setScalar(Math.max(0.02, radius)); outgoing.material.opacity = Math.max(0, 0.48 - echo.age * 0.13)
        echo.targets.forEach((t, i) => {
          const traveled = radius - t.travel, r = returns[i]
          r.visible = traveled >= 0 && traveled < t.travel + 0.4
          r.position.set(t.x, 0.06, t.z); r.scale.setScalar(Math.max(0.02, reduced ? t.travel : traveled)); r.material.opacity = 0.3 * Math.max(0, 1 - traveled / (t.travel + 0.4))
          if ((reduced || traveled >= t.travel) && !t.returned) {
            t.returned = true; echoReturns++; discover(6)
            if (!riding && grabbed() !== dolphin) { dolphin.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.atan2(t.z - echo.origin.z, -(t.x - echo.origin.x))); dolphin.body.angularVelocity.setZero(); dolphin.body.wakeUp() }
          }
        })
        if (echo.age > (reduced ? 0.8 : 3.4)) { echo = null; outgoing.visible = false; returns.forEach(r => { r.visible = false }) }
      }
      const paired = enabled && distance(gpu.body.position, keyboard.body.position) < 1.8 && upright(gpu) > 0.7 && upright(keyboard) > 0.7 && !grabbed()
      trainDwell = paired ? Math.min(1, trainDwell + dt) : 0
      if (!paired && training !== 'idle') { training = 'idle'; runPanel.hidden = true; runTime = 0; resumed = false; blink = 0 }
      if (trainDwell >= 0.7 && training === 'idle') { training = 'running'; runTime = 0; resumed = false }
      if (training === 'running') {
        runTime += dt; paintKeys(resumed ? 0.6 + runTime / 6 : runTime / 6)
        if (runTime > (resumed ? 2.5 : 3.6)) { training = resumed ? 'complete' : 'stalled'; blink = resumed ? 0 : 2; if (!resumed) { discover(7); announce('Toy run paused at a plateau. The amber vigil light is asking for attention.') } }
      }
      blink = Math.max(0, blink - dt)
      runPanel.hidden = training === 'idle'
      const runText = training === 'running' ? 'TOY RUN · loss descending' : training === 'stalled' ? 'TOY RUN · plateau · vigil needs you' : 'TOY RUN · converged'
      if (runLabel.textContent !== runText) runLabel.textContent = runText
      resumeButton.hidden = training !== 'stalled'
      gpu.mesh.userData.training = { load: training === 'running' ? 0.85 : 0, amber: training === 'stalled', brightness: reduced || !blink ? 1 : 0.6 + 0.4 * Math.sin(blink * 10) }
      boatCooldown = Math.max(0, boatCooldown - dt)
      const boardable = enabled && !riding && !grabbed() && boatCooldown === 0 && upright(boat) > 0.8 && distance(dolphin.body.position, boat.body.position) < 1.15 && dolphin.body.velocity.length() < 1.5 && boat.body.velocity.length() < 1
      boatDwell = boardable ? Math.min(1, boatDwell + dt) : 0
      if (boatDwell >= 0.55) {
        riding = true; boardTime = 0; start.copy(dolphin.body.position)
        dolphin.body.type = CANNON.Body.KINEMATIC; dolphin.body.collisionFilterMask = 0; dolphin.body.updateMassProperties(); dolphin.body.velocity.setZero(); dolphin.body.angularVelocity.setZero()
        boat.body.mass = boatMass + dolphin.body.mass; boat.body.updateMassProperties(); boat.body.angularVelocity.x = reduced ? 0 : 0.6; boat.body.wakeUp(); discover(9)
      }
      if (riding) {
        boardTime = Math.min(1, boardTime + dt * 1.2)
        if (boardTime >= 1 && roughBoat()) leaveBoat()
        else {
          const target = new THREE.Vector3(0, 0.17, 0).applyQuaternion(boat.body.quaternion).add(boat.body.position)
          const progress = reduced ? 1 : boardTime * boardTime * (3 - 2 * boardTime)
          dolphin.mesh.position.lerpVectors(start, target, progress); if (!reduced) dolphin.mesh.position.y += Math.sin(boardTime * Math.PI) * 0.55
          dolphin.mesh.quaternion.copy(boat.body.quaternion); dolphin.body.position.copy(dolphin.mesh.position); dolphin.body.quaternion.copy(dolphin.mesh.quaternion); dolphin.body.aabbNeedsUpdate = true
          if (boardTime === 1) dolphin.body.sleep()
        }
      }
      releaseTime = Math.max(0, releaseTime - dt)
      residual.visible = !!path
      if (path) {
        const length = Math.min(1.7, path.length)
        const freeEnd = { x: path.x + path.ux * length - path.uz * 0.8, y: 0.08, z: path.z + path.uz * length + path.ux * 0.8 }
        if (pinned && (!pinPoint || distance(paper.body.position, pinPoint) > 0.5 || paper.body.position.y > 0.6 || grabbed() === paper)) { pinned = false; releaseTime = 1.2 }
        const canPin = enabled && !pinned && releaseTime === 0 && grabbed() !== paper && paper.body.position.y < 0.5 && distance(paper.body.position, freeEnd) < 0.55
        pinDwell = canPin ? Math.min(1, pinDwell + dt) : 0
        if (pinDwell >= 0.4) { pinned = true; pinPoint = { ...freeEnd }; discover(8) }
        endpoint = pinned ? pinPoint : freeEnd
        const positions = residual.geometry.attributes.position
        for (let i = 0; i < 32; i++) { const t = i / 31, curl = Math.sin(t * Math.PI) * (0.16 + (reduced ? 0 : releaseTime * 0.3)); positions.setXYZ(i, path.x + (endpoint.x - path.x) * t - path.uz * curl, 0.08 + Math.sin(t * Math.PI) * 0.16, path.z + (endpoint.z - path.z) * t + path.ux * curl) }
        positions.needsUpdate = true
      } else { pinned = false; endpoint = null; pinDwell = 0 }
      const reflectionPath = reflection()
      incident.visible = reflected.visible = spot.visible = !!reflectionPath; glow.intensity = reflectionPath ? 0.55 : 0
      if (reflectionPath) {
        const origin = new THREE.Vector3(trophy.body.position.x, trophy.body.position.y + 0.48, trophy.body.position.z)
        const end = new THREE.Vector3(origin.x + reflectionPath.ray.x * reflectionPath.length, 0.08, origin.z + reflectionPath.ray.z * reflectionPath.length)
        setLine(incident, new THREE.Vector3(lamp.body.position.x, lamp.body.position.y + 0.56, lamp.body.position.z), origin); setLine(reflected, origin, end)
        spot.position.copy(end); spot.position.y = 0.03; glow.position.copy(end); glow.position.y = 0.25
      }
      reflectDwell = enabled && reflectionPath?.hit && !grabbed() ? Math.min(1, reflectDwell + dt) : 0
      if (reflectDwell >= 0.6) discover(10)
    },
  }
}
