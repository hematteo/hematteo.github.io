// Object models shared by the drawer (/drawer/) and the desk under the homepage.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import * as CANNON from 'cannon-es'
import { buildDeskLight } from './discoveries.js'

// ---------------------------------------------------------------- materials & mesh helpers

// Beveled edges catch the desk lighting; folds retain their sharp normals.
export const M = (color, opt = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05, flatShading: false, ...opt })
export const BRASS = M(0xc9a227, { metalness: 0.85, roughness: 0.32 })
export const WOOD = M(0x8b5e34, { roughness: 0.8 })
export const WOOD_DK = M(0x6e4525, { roughness: 0.85 })
export const PAPER = M(0xf7f5ef, { roughness: 0.9, side: THREE.DoubleSide, flatShading: true })
export const DARK = M(0x2a2d33, { roughness: 0.55 })
export const KEYCAP = M(0xd8d5cc, { roughness: 0.7 })
export const PCB = M(0x1f6b3a, { roughness: 0.55 })
export const SILVER = M(0xb8bcc2, { metalness: 0.8, roughness: 0.4 })
export const CERAMIC = new THREE.MeshPhysicalMaterial({ color: 0xf5eee1, roughness: 0.22, clearcoat: 0.8 })
export const COFFEE = new THREE.MeshPhysicalMaterial({ color: 0x352015, roughness: 0.12, clearcoat: 1 })
export const RED = M(0xe23d2e, { roughness: 0.45 })
export const RIBBON = M(0xa32638, { roughness: 0.7 })
export const DOLPHIN = M(0x7c93a6, { roughness: 0.5 })
export const GLASS = new THREE.MeshPhysicalMaterial({ color: 0xf2fbff, roughness: 0.035, metalness: 0,
  transmission: 0.98, thickness: 0.8, ior: 1.52, envMapIntensity: 1.6, clearcoat: 1, flatShading: true })

export function box (mat, w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d, 0.16) * 0.22), mat)
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz)
  m.castShadow = true; m.receiveShadow = true
  return m
}
export function cyl (mat, rT, rB, h, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, seg), mat)
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz)
  m.castShadow = true; m.receiveShadow = true
  return m
}

// ---------------------------------------------------------------- object builders

export const BUILDERS = {
  light: buildDeskLight,
  punt () {
    const g = new THREE.Group()
    g.add(box(WOOD, 1.9, 0.07, 0.52, 0, 0.035, 0))          // floor
    g.add(box(WOOD_DK, 1.9, 0.18, 0.06, 0, 0.13, 0.23))     // rails
    g.add(box(WOOD_DK, 1.9, 0.18, 0.06, 0, 0.13, -0.23))
    g.add(box(WOOD_DK, 0.1, 0.18, 0.52, 0.9, 0.13, 0))      // ends
    g.add(box(WOOD_DK, 0.1, 0.18, 0.52, -0.9, 0.13, 0))
    g.add(box(WOOD, 0.34, 0.05, 0.4, 0.35, 0.16, 0))        // seat
    g.add(cyl(WOOD_DK, 0.035, 0.035, 1.8, 0, 0.26, 0.05, 0, 0.18, Math.PI / 2, 10)) // pole (fits the hull)
    const body = new CANNON.Body({ mass: 2.2 })
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.95, 0.11, 0.27)), new CANNON.Vec3(0, 0.11, 0))
    return { g, body }
  },
  plane () {
    const g = new THREE.Group()
    const geo = new THREE.BufferGeometry()
    const N = [0, 0.1, -0.78], L = [-0.56, 0.02, 0.55], R = [0.56, 0.02, 0.55]
    const IL = [-0.085, 0.19, 0.55], IR = [0.085, 0.19, 0.55], C = [0, 0.07, 0.55], K = [0, -0.17, 0.45]
    geo.setAttribute('position', new THREE.Float32BufferAttribute([...N, ...L, ...IL, ...N, ...IL, ...C,
      ...N, ...C, ...IR, ...N, ...IR, ...R, ...N, ...C, ...K], 3))
    geo.computeVertexNormals()
    const m = new THREE.Mesh(geo, PAPER)
    m.castShadow = true; m.receiveShadow = true
    m.position.y = 0.2
    g.add(m)
    const folds = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 12), new THREE.LineBasicMaterial({ color: 0x9a9384, transparent: true, opacity: 0.25 }))
    folds.position.y = 0.201; g.add(folds)
    const body = new CANNON.Body({ mass: 0.3, angularDamping: 0.4 })
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.48, 0.14, 0.62)), new CANNON.Vec3(0, 0.16, -0.05))
    return { g, body }
  },
  prism () {
    const g = new THREE.Group()
    const glass = cyl(GLASS, 0.36, 0.36, 0.55, 0, 0.28, 0, 0, 0, 0, 3)
    g.add(glass)
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry),
      new THREE.LineBasicMaterial({ color: 0xc8e9f2, transparent: true, opacity: 0.45 }))
    edges.position.copy(glass.position)
    g.add(edges)
    const body = new CANNON.Body({ mass: 0.9 })
    body.addShape(new CANNON.Cylinder(0.36, 0.36, 0.55, 3), new CANNON.Vec3(0, 0.28, 0))
    return { g, body }
  },
  joystick () {
    const g = new THREE.Group()
    g.add(box(DARK, 0.6, 0.2, 0.6, 0, 0.1, 0))
    const stick = new THREE.Group(); stick.name = 'stick'; stick.position.set(-0.08, 0.22, 0)
    stick.add(cyl(SILVER, 0.05, 0.05, 0.38, 0, 0.17, 0, 0, 0, 0, 16))
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 18), RED)
    ball.position.y = 0.38; ball.castShadow = true
    stick.add(ball); g.add(stick)
    g.add(cyl(RED, 0.07, 0.07, 0.05, 0.17, 0.22, 0.12, 0, 0, 0, 14))
    const body = new CANNON.Body({ mass: 1.0 })
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.3, 0.1, 0.3)), new CANNON.Vec3(0, 0.1, 0))
    body.addShape(new CANNON.Sphere(0.14), new CANNON.Vec3(-0.08, 0.6, 0))
    return { g, body }
  },
  mug () {
    const g = new THREE.Group()
    const profile = [[0, 0.025], [0.22, 0.025], [0.25, 0.06], [0.275, 0.4], [0.28, 0.435], [0.27, 0.45], [0.24, 0.435], [0.215, 0.1], [0, 0.1]]
    const cup = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 40), CERAMIC)
    cup.castShadow = cup.receiveShadow = true; g.add(cup)
    const inner = cyl(COFFEE, 0.24, 0.24, 0.02, 0, 0.38, 0)
    inner.name = 'coffee-surface'
    g.add(inner)
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 12, 32), CERAMIC)
    handle.position.set(0.29, 0.22, 0); handle.rotation.z = -Math.PI / 2; handle.castShadow = true
    g.add(handle)
    const body = new CANNON.Body({ mass: 0.9 })
    body.addShape(new CANNON.Cylinder(0.28, 0.25, 0.44, 12), new CANNON.Vec3(0, 0.22, 0))
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.09, 0.16, 0.05)), new CANNON.Vec3(0.36, 0.22, 0))
    return { g, body }
  },
  keyboard () {
    const g = new THREE.Group()
    g.add(box(DARK, 1.5, 0.1, 0.58, 0, 0.05, 0))
    const cap = new THREE.BoxGeometry(0.1, 0.05, 0.1)
    const inst = new THREE.InstancedMesh(cap, KEYCAP, 41)
    const d = new THREE.Object3D()
    let k = 0
    for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) {
      d.position.set(-0.62 + c * 0.138 + r * 0.014, 0.125, -0.185 + r * 0.125)
      d.updateMatrix(); inst.setMatrixAt(k++, d.matrix)
    }
    d.position.set(0.05, 0.125, 0.235); d.scale.set(4.2, 1, 1); d.updateMatrix()
    inst.setMatrixAt(40, d.matrix)
    d.scale.set(1, 1, 1)
    inst.castShadow = true
    g.add(inst)
    const body = new CANNON.Body({ mass: 1.6 })
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.75, 0.08, 0.29)), new CANNON.Vec3(0, 0.08, 0))
    return { g, body }
  },
  gpu () {
    const g = new THREE.Group()
    g.add(box(PCB, 1.3, 0.05, 0.6, 0, 0.16, 0))
    g.add(box(DARK, 1.24, 0.22, 0.56, 0, 0.31, 0))
    const fanMat = M(0x3f4950, { metalness: 0.5, roughness: 0.3 })
    for (const [index, x] of [-0.3, 0.3].entries()) {
      g.add(cyl(M(0x0d1318), 0.215, 0.215, 0.025, x, 0.432, 0, 0, 0, 0, 32))
      const rotor = new THREE.Group(); rotor.name = index ? 'fan-right' : 'fan-left'; rotor.position.set(x, 0.453, 0)
      for (let i = 0; i < 9; i++) {
        const blade = box(fanMat, 0.065, 0.015, 0.13, 0, 0, 0.12, 0, 0.3, 0.15)
        const pivot = new THREE.Group(); pivot.rotation.y = i * Math.PI * 2 / 9; pivot.add(blade); rotor.add(pivot)
      }
      rotor.add(cyl(SILVER, 0.047, 0.047, 0.025, 0, 0.016, 0, 0, 0, 0, 20))
      g.add(rotor)
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.218, 0.012, 8, 40), SILVER)
      rim.rotation.x = Math.PI / 2; rim.position.set(x, 0.452, 0); g.add(rim)
    }
    for (let i = 0; i < 11; i++) g.add(box(SILVER, 0.035, 0.12, 0.018, -0.5 + i * 0.1, 0.28, 0.285))
    const led = box(new THREE.MeshStandardMaterial({ color: 0xa4e6c8, emissive: 0x58c797, emissiveIntensity: 0.4 }), 0.18, 0.018, 0.018, 0.35, 0.38, 0.287)
    led.name = 'gpu-led'; g.add(led)
    g.add(box(SILVER, 0.05, 0.4, 0.56, -0.67, 0.26, 0))
    g.add(box(BRASS, 0.5, 0.04, 0.06, 0.2, 0.12, 0.28))   // pcie fingers
    const body = new CANNON.Body({ mass: 1.2 })
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.68, 0.16, 0.3)), new CANNON.Vec3(0, 0.28, 0))
    return { g, body }
  },
  dolphin () {
    const g = new THREE.Group()
    const D2 = M(0x7c93a6, { roughness: 0.5, side: THREE.DoubleSide })
    // body: lathe profile, nose to tail along X
    const prof = [
      [0.01, -0.78], [0.06, -0.7], [0.13, -0.5], [0.18, -0.26], [0.2, 0.0],
      [0.18, 0.24], [0.13, 0.46], [0.08, 0.6], [0.045, 0.7], [0.02, 0.78],
    ]
    const bodyMesh = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, x]) => new THREE.Vector2(r, x)), 12), D2)
    bodyMesh.rotation.z = -Math.PI / 2 // lathe axis Y -> X
    bodyMesh.scale.x = 0.85            // flatten belly-to-back a touch
    bodyMesh.position.y = 0.28
    bodyMesh.castShadow = true; bodyMesh.receiveShadow = true
    g.add(bodyMesh)
    // dorsal fin: swept-back flattened cone
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 5), D2)
    dorsal.scale.z = 0.35; dorsal.rotation.z = -0.5
    dorsal.position.set(0.08, 0.52, 0); dorsal.castShadow = true
    g.add(dorsal)
    // tail flukes: two flattened cones sweeping outward
    for (const s of [1, -1]) {
      const fluke = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 5), D2)
      fluke.scale.y = 0.3
      fluke.rotation.z = -Math.PI / 2
      fluke.rotation.y = s * 0.7
      fluke.position.set(0.82, 0.28, s * 0.1)
      fluke.castShadow = true
      g.add(fluke)
    }
    // pectoral fins
    for (const s of [1, -1]) {
      const pec = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 4), D2)
      pec.scale.y = 0.35
      pec.rotation.z = -Math.PI / 2
      pec.rotation.y = s * 1.1
      pec.position.set(-0.28, 0.18, s * 0.16)
      pec.castShadow = true
      g.add(pec)
    }
    const body = new CANNON.Body({ mass: 0.8, angularDamping: 0.5 })
    body.addShape(new CANNON.Sphere(0.26), new CANNON.Vec3(-0.25, 0.28, 0))
    body.addShape(new CANNON.Sphere(0.22), new CANNON.Vec3(0.28, 0.28, 0))
    return { g, body }
  },
  trophy () {
    const g = new THREE.Group()
    const B2 = M(0xc9a227, { metalness: 0.85, roughness: 0.32, side: THREE.DoubleSide })
    // two-tier base
    g.add(cyl(WOOD_DK, 0.27, 0.3, 0.07, 0, 0.035, 0, 0, 0, 0, 16))
    g.add(cyl(WOOD_DK, 0.2, 0.25, 0.07, 0, 0.1, 0, 0, 0, 0, 16))
    g.add(cyl(BRASS, 0.09, 0.12, 0.04, 0, 0.155, 0, 0, 0, 0, 14))
    // goblet: lathe profile (r, y) with a lip folding inward so the cup has depth
    const prof = [
      [0.045, 0], [0.035, 0.1], [0.05, 0.2], [0.13, 0.29], [0.19, 0.38],
      [0.225, 0.48], [0.235, 0.56], [0.22, 0.6], [0.17, 0.57], [0.14, 0.48],
    ]
    const cup = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 14), B2)
    cup.position.y = 0.17
    cup.castShadow = true; cup.receiveShadow = true
    g.add(cup)
    const hL = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.028, 8, 16, Math.PI), BRASS)
    hL.position.set(-0.27, 0.63, 0); hL.rotation.z = Math.PI / 2; hL.castShadow = true
    const hR = hL.clone(); hR.position.x = 0.27; hR.rotation.z = -Math.PI / 2
    g.add(hL, hR)
    const body = new CANNON.Body({ mass: 1.4 })
    body.addShape(new CANNON.Cylinder(0.26, 0.29, 0.8, 12), new CANNON.Vec3(0, 0.4, 0))
    return { g, body }
  },
  medal () {
    const g = new THREE.Group()
    g.add(box(RIBBON, 0.18, 0.025, 0.44, 0, 0.03, -0.3))
    g.add(cyl(BRASS, 0.23, 0.23, 0.05, 0, 0.03, 0))
    g.add(cyl(M(0xe6c65a, { metalness: 0.85, roughness: 0.3 }), 0.16, 0.16, 0.055, 0, 0.032, 0))
    const body = new CANNON.Body({ mass: 0.5 })
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.23, 0.04, 0.4)), new CANNON.Vec3(0, 0.04, -0.08))
    return { g, body }
  },
}
