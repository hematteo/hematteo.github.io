import * as THREE from 'three'
import { windEligible } from './discovery-rules.js'

export function createFlight ({ scene, objects, bounds, grabbed, reduced, wake, colored, detach, discover }) {
  const get = id => objects.find(o => o.item.id === id)
  const gpu = get('gpu'), plane = get('plane'), joystick = get('joystick')
  let enabled = false, flying = false, spool = 0, duration = 0, cooldown = 0, phase = 0, rainbowTime = 0
  let steerX = 0, steerZ = 0, controlled = false, joystickLaunch = false, cruise = 0
  const up = new THREE.Vector3(), vertical = new THREE.Vector3(0, 1, 0)
  const panel = document.getElementById('flight-controls')
  const status = document.getElementById('flight-status')
  const trail = [], MAX_POINTS = 56
  const palette = [0xff796b, 0xffbd65, 0xffe99a, 0x8de0bb, 0x86cfff, 0xc6a8ff].map(c => new THREE.Color(c))
  const ribbons = palette.map(color => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 6), 3).setUsage(THREE.DynamicDrawUsage))
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 6), 3).setUsage(THREE.DynamicDrawUsage))
    const indices = []
    for (let i = 0; i < MAX_POINTS - 1; i++) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
    geometry.setIndex(indices); geometry.setDrawRange(0, 0)
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide,
      transparent: true, opacity: 0.65, depthWrite: false, blending: THREE.AdditiveBlending }))
    mesh.frustumCulled = false
    scene.add(mesh)
    return { mesh, color }
  })
  const streams = Array.from({ length: 8 }, () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(27), 3))
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xc6e7ef, transparent: true, opacity: 0, depthWrite: false }))
    line.frustumCulled = false
    scene.add(line)
    return line
  })
  const rotors = [gpu.mesh.getObjectByName('fan-left'), gpu.mesh.getObjectByName('fan-right')]
  const led = gpu.mesh.getObjectByName('gpu-led')
  const stick = joystick.mesh.getObjectByName('stick')
  const target = new THREE.Vector3()
  let sample = 0

  function land () {
    enabled = false; flying = false; joystickLaunch = false; duration = 0; cooldown = 3
    if (panel.contains(document.activeElement)) document.getElementById('scene').focus()
    panel.hidden = true; controlled = false
    plane.body.wakeUp()
    wake(180)
  }
  function steer (x, z) {
    if (!flying || !controlled) return
    steerX = Math.sign(x)
    steerZ = 0
    panel.querySelectorAll('[data-steer]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.steer.split(',')[0]) === steerX)))
    duration = Math.max(duration, 4)
    wake(180)
  }
  document.querySelectorAll('[data-steer]').forEach(button => button.addEventListener('click', () => {
    const [x, z] = button.dataset.steer.split(',').map(Number)
    steer(x, z)
  }))
  document.getElementById('flight-land').addEventListener('click', land)
  function handleKey (ev) {
    if (!flying || !controlled) return false
    const keys = { a: [-1, 0], d: [1, 0], w: [0, 0], s: [0, 0] }
    const value = keys[ev.key.toLowerCase()]
    if (!value) return false
    steer(...value); ev.preventDefault(); return true
  }
  panel.addEventListener('keydown', handleKey)
  document.addEventListener('keydown', ev => {
    // Steering also works immediately after arranging a pair, while focus
    // remains on Discoveries. Canvas/panel handlers already prevent default.
    if (ev.defaultPrevented || ev.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return
    if (!document.getElementById('card').hidden) return
    handleKey(ev)
  })
  function updateTrail (dt) {
    for (const p of trail) p.age += dt
    while (trail.length && trail[0].age > 1.6) trail.shift()
    sample += dt
    const airborne = colored() && plane.body.position.y > 0.65 && plane.body.velocity.lengthSquared() > 0.08 && !grabbed()
    if (!reduced && airborne && sample >= 0.025) {
      sample = 0
      const p = new THREE.Vector3(0, 0.3, 0.5).applyQuaternion(plane.mesh.quaternion).add(plane.mesh.position)
      const side = new THREE.Vector3(1, 0, 0).applyQuaternion(plane.mesh.quaternion).multiplyScalar(0.5)
      trail.push({ p, side, age: 0 }); if (trail.length > MAX_POINTS) trail.shift()
    }
    for (let band = 0; band < ribbons.length; band++) {
      const { mesh, color } = ribbons[band]
      const pos = mesh.geometry.attributes.position, colors = mesh.geometry.attributes.color
      trail.forEach(({ p, side, age }, i) => {
        const fade = Math.max(0, 1 - age / 1.6) ** 1.5
        for (let edge = 0; edge < 2; edge++) {
          const offset = ((band + edge) / 6 - 0.5) * 0.8
          pos.setXYZ(i * 2 + edge, p.x + side.x * offset, p.y + side.y * offset, p.z + side.z * offset)
          colors.setXYZ(i * 2 + edge, color.r * fade, color.g * fade, color.b * fade)
        }
      })
      pos.needsUpdate = colors.needsUpdate = true
      mesh.geometry.setDrawRange(0, Math.max(0, trail.length - 1) * 6)
    }
    if (flying && colored()) {
      rainbowTime += dt
      if (rainbowTime > 0.6) discover(4)
    }
  }
  return {
    enable () { enabled = true },
    prepare () { land(); cooldown = 0; enabled = true; steerX = steerZ = 0 },
    beforeGrab (o) { if (o === plane) land(); enabled = true },
    reset () { land(); enabled = false; spool = 0; rainbowTime = 0; trail.length = 0; steerX = steerZ = 0; ribbons.forEach(r => r.mesh.geometry.setDrawRange(0, 0)) },
    isFlying () { return flying },
    active () { return flying || (enabled && cooldown > 0) || spool > 0.01 || trail.length > 0 },
    state () { return { flying, controlled, spool, trailPoints: trail.length, steerX, steerZ } },
    handleKey,
    update (dt) {
      cooldown = Math.max(0, cooldown - dt)
      up.copy(vertical).applyQuaternion(gpu.mesh.quaternion)
      const near = enabled && !grabbed() && windEligible(gpu.body.position, plane.body.position, up.y)
      const nearStick = enabled && !grabbed() && Math.hypot(joystick.body.position.x - plane.body.position.x, joystick.body.position.z - plane.body.position.z) < 1.6
      if (!flying && (near || nearStick) && cooldown === 0) {
        spool = Math.min(1, spool + dt * 1.8)
        if (spool >= 1) {
          detach(); flying = true; joystickLaunch = !near; cruise = 0; duration = 14; rainbowTime = 0
          steerX = steerZ = 0
          plane.body.velocity.set(0, 2, 0)
          plane.body.angularVelocity.set(0, 0, 0)
          if (!joystickLaunch) discover(3)
        }
      } else spool = THREE.MathUtils.damp(spool, flying ? 1 : 0, 4, dt)
      if (flying) {
        duration -= dt
        if (duration <= 0 || (!joystickLaunch && up.y < 0.6) || grabbed() === plane || gpu.body.position.y > 3) land()
        else {
          const b = bounds()
          const anchor = joystickLaunch ? joystick.body.position : gpu.body.position
          cruise += dt * 0.7
          target.set(THREE.MathUtils.clamp(anchor.x + steerX * 1.3, b.xL + 0.7, b.xR - 0.7),
            anchor.y + 1.65, THREE.MathUtils.clamp(anchor.z - 0.65 + (controlled ? Math.sin(cruise) * 1.5 : 0), b.zB + 0.8, b.zF - 0.8))
          const body = plane.body
          if (reduced) {
            body.position.copy(target)
            plane.mesh.position.copy(target)
            body.velocity.set(0, 0, 0)
          }
          for (const axis of reduced ? [] : ['x', 'y', 'z']) {
            const acceleration = (target[axis] - body.position[axis]) * 12 - body.velocity[axis] * 5 + (axis === 'y' ? 9.82 : 0)
            body.velocity[axis] = THREE.MathUtils.clamp(body.velocity[axis] + acceleration * dt, -4, 4)
          }
          const yaw = Math.atan2(-body.velocity.x, -body.velocity.z)
          const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, body.velocity.lengthSquared() > 0.3 ? yaw : 0, -body.velocity.x * 0.1))
          plane.mesh.quaternion.slerp(rotation, Math.min(1, dt * 4))
          body.quaternion.copy(plane.mesh.quaternion); body.angularVelocity.set(0, 0, 0); body.wakeUp()
          controlled = joystickLaunch || Math.hypot(joystick.body.position.x - gpu.body.position.x, joystick.body.position.z - gpu.body.position.z) < 2.4
          if (controlled) discover(5)
          panel.hidden = !controlled
          status.textContent = reduced ? 'Flight connected · motion reduced' : '3 actions · A left / S neutral / D right'
        }
      }
      const training = gpu.mesh.userData.training
      const load = Math.max(joystickLaunch ? 0 : spool, training?.load || 0)
      plane.mesh.children[0].rotation.z = !reduced && !flying && spool > 0.05 ? Math.sin(phase * 90) * spool * 0.03 : 0
      phase += dt * spool
      for (const rotor of rotors) if (rotor && !reduced) rotor.rotation.y += dt * load * 30
      if (led) { led.material.emissiveIntensity = training?.amber ? training.brightness * 2 : 0.3 + load * 2; led.material.color.setHex(training?.amber ? 0xffb64e : load > 0.1 ? 0x96e9c5 : 0xc7b282); led.material.emissive.copy(led.material.color) }
      if (stick) { stick.rotation.x = flying && controlled ? steerZ * 0.15 : 0; stick.rotation.z = flying && controlled ? -steerX * 0.15 : 0 }
      streams.forEach((line, i) => {
        line.material.opacity = reduced || joystickLaunch ? 0 : spool * 0.14
        for (let k = 0; k < 9; k++) {
          const height = ((k / 8 + phase * 0.5 + i / 8) % 1) * 1.65
          target.set((i < 4 ? -0.3 : 0.3) + Math.sin(height * 2 + i) * 0.09, 0.5 + height, Math.cos(i * 2) * 0.1 - height * 0.25)
          target.applyQuaternion(gpu.mesh.quaternion).add(gpu.mesh.position)
          line.geometry.attributes.position.setXYZ(k, target.x, target.y, target.z)
        }
        line.geometry.attributes.position.needsUpdate = true
      })
      updateTrail(dt)
    },
  }
}
