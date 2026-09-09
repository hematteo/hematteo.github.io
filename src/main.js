import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// idle-render bookkeeping — declared first because init-time callers
// (resize, applyTheme) invoke wakeRender before the tick loop is set up
let renderPending = 240
function wakeRender (n = 60) { renderPending = Math.max(renderPending, n) }

// ---------------------------------------------------------------- items

const ITEMS = [
  {
    id: 'punt', name: 'A punt', eyebrow: 'CAMBRIDGE · 2025–26',
    story: 'MPhil in Advanced Computer Science at the University of Cambridge, with the AI Alignment Fellowship. My dissertation studied how transformers learn to turn hidden states into words.',
    link: null, sound: 'wood',
  },
  {
    id: 'plane', name: 'A paper airplane', eyebrow: 'PAPER · UNDER REVIEW',
    story: '“Learning to Read Out: Unembedding Dynamics in Language Model Pretraining.” I am first author on this manuscript, which grew out of my dissertation and is under review. It tracks when information becomes available in hidden states and when the model’s own readout begins to express it.',
    link: 'https://github.com/hematteo/learning-to-read-out', sound: 'paper',
  },
  {
    id: 'prism', name: 'A glass prism', eyebrow: 'PAPER · ARXIV:2609.01936 · UNDER REVIEW',
    story: '“Sparse Readout Prism: Explaining Logit-Lens Scores in Features Instead of Tokens.” I am first author on this preprint, arXiv:2609.01936. The method decomposes readout scores into sparse feature contributions and an explicit residual.',
    link: 'https://arxiv.org/abs/2609.01936', sound: 'glass',
  },
  {
    id: 'joystick', name: 'A joystick', eyebrow: 'PAPER · IN PREPARATION',
    story: 'Low-Bit Policy Networks for Reinforcement Learning. Can ternary policies based on BitNet regularize training for continuous control? I am first author on this manuscript, with a public preprint in preparation.',
    link: null, sound: 'plastic',
  },
  {
    id: 'mug', name: 'A coffee mug', eyebrow: 'FOUNDER · 2024–25',
    story: 'I built a platform for learning Japanese that served about 3,000 monthly active users. It ran LLM inference in the browser through WebGPU, with no server inference costs and approximately 99.9% uptime. I handled payments, authentication, and the rest. The platform is now archived. This mug helped fuel it, and it still spills.',
    link: null, sound: 'ceramic',
  },
  {
    id: 'keyboard', name: 'A keyboard', eyebrow: 'AMAZON ALEXA-AI · 2023',
    story: 'As an SDE intern on Alexa NLU, I built data analysis and experiment infrastructure for 20+ Applied Scientists. It processed millions of utterances a day and helped speed up model iteration by 15%, with zero production incidents.',
    link: null, sound: 'plastic',
  },
  {
    id: 'gpu', name: 'A GPU', eyebrow: 'OPEN SOURCE · 2026',
    story: 'vigil-gpu is a Python package on PyPI that monitors ML training jobs on rented cloud GPUs. It streams logs over SSH, flags NaNs and stalled runs, plots metrics in the terminal, and sends alerts through Slack webhooks.',
    link: 'https://github.com/hematteo/vigil', sound: 'metal',
  },
  {
    id: 'dolphin', name: 'A dolphin', eyebrow: 'RESEARCH · ST ANDREWS',
    story: 'I improved F1 for dolphin acoustic classification from 0.48 to 0.86 using signal processing and neural networks. I also refactored more than 5,000 lines of research code to make the next student’s work easier.',
    link: 'https://github.com/orgs/dolphin-acoustics-vip/repositories', sound: 'soft',
  },
  {
    id: 'trophy', name: 'A trophy', eyebrow: 'HACKATHONS',
    story: 'First place in the Oxbotica autonomous vehicles challenge at OxfordHack 2022 and the GitHub challenge at HackTheBurgh VIII. Both projects were built in a weekend and are still fondly remembered.',
    link: null, sound: 'metal',
  },
  {
    id: 'medal', name: 'A medal', eyebrow: 'ST ANDREWS · 2021–24',
    story: 'Top Student Medal for the highest academic achievement in the Direct Entry Computer Science cohort. First Class Honours in Computer Science and Mathematics, Dean’s List in all three years, and a perfect 340/340 GRE.',
    link: null, sound: 'metal',
  },
]

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches
const IS_TOUCH = matchMedia('(pointer: coarse)').matches

// ---------------------------------------------------------------- theme

function themeName () {
  const t = document.documentElement.getAttribute('data-theme')
  if (t === 'dark' || t === 'light') return t
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
const THEMES = {
  light: {
    mat: '#3e7c6f', matBorder: '#33685d', grid: '#5b9788', gridBold: '#74ab9e', label: '#8fbdb1',
    bg: '#7a5c39', hemi: 0xdfe8e2, ground: 0x8a6a42,
    desk: '#a07948', deskGrain: '#8a6538', deskDark: '#75542e', tray: '#6e4f2c', trayEdge: '#7d5b35',
    hemiI: 0.7, sunI: 1.5, sunC: 0xfff4e0, spotI: 0,
  },
  dark: {
    mat: '#23262b', matBorder: '#1c1f23', grid: '#383e46', gridBold: '#4a525c', label: '#5a636e',
    bg: '#241a10', hemi: 0x8a93a8, ground: 0x2e2115,
    desk: '#4a3521', deskGrain: '#3c2a18', deskDark: '#31220f', tray: '#332412', trayEdge: '#41301a',
    hemiI: 0.22, sunI: 0.35, sunC: 0xbfd0ff, spotI: 2.6,
  },
}

// ---------------------------------------------------------------- renderer / scene

const canvas = document.getElementById('scene')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
const CAM_BASE = new THREE.Vector3(0, 15, 8.6)
camera.position.copy(CAM_BASE)
camera.lookAt(0, 0, 0.2)

const hemi = new THREE.HemisphereLight(0xffffff, 0x60706a, 0.75)
scene.add(hemi)
const sun = new THREE.DirectionalLight(0xfff4e0, 1.6)
sun.position.set(5, 13, 4)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = -11; sun.shadow.camera.right = 11
sun.shadow.camera.top = 11; sun.shadow.camera.bottom = -11
sun.shadow.camera.far = 40
sun.shadow.bias = -0.0004
scene.add(sun)

// desk lamp for the dark theme
const lamp = new THREE.SpotLight(0xffc98a, 0)
lamp.position.set(2.5, 9, 3)
lamp.angle = 0.62
lamp.penumbra = 0.75
lamp.decay = 0
lamp.castShadow = true
lamp.shadow.mapSize.set(1024, 1024)
lamp.shadow.bias = -0.0005
scene.add(lamp)
scene.add(lamp.target)

// soft reflections for brass / glass / ceramic
{
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()
  if ('environmentIntensity' in scene) scene.environmentIntensity = 0.45
}

// ---------------------------------------------------------------- materials & mesh helpers

// flat shading everywhere: one coherent low-poly look
const M = (color, opt = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, flatShading: true, ...opt })
const BRASS = M(0xc9a227, { metalness: 0.85, roughness: 0.32 })
const WOOD = M(0x8b5e34, { roughness: 0.8 })
const WOOD_DK = M(0x6e4525, { roughness: 0.85 })
const PAPER = M(0xf7f5ef, { roughness: 0.9, side: THREE.DoubleSide, flatShading: true })
const DARK = M(0x2a2d33, { roughness: 0.55 })
const KEYCAP = M(0xd8d5cc, { roughness: 0.7 })
const PCB = M(0x1f6b3a, { roughness: 0.55 })
const SILVER = M(0xb8bcc2, { metalness: 0.8, roughness: 0.4 })
const CERAMIC = M(0xefece4, { roughness: 0.35 })
const COFFEE = M(0x4a2f1b, { roughness: 0.25 })
const RED = M(0xe23d2e, { roughness: 0.45 })
const RIBBON = M(0xa32638, { roughness: 0.7 })
const DOLPHIN = M(0x7c93a6, { roughness: 0.5 })
const GLASS = M(0xe4f2f5, { roughness: 0.08, metalness: 0.25, transparent: true, opacity: 0.78 })

function box (mat, w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz)
  m.castShadow = true; m.receiveShadow = true
  return m
}
function cyl (mat, rT, rB, h, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, seg), mat)
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz)
  m.castShadow = true; m.receiveShadow = true
  return m
}

// ------------------------------------------------ desk, cutting mat, tray, props

const MAT_H = 0.06   // mat thickness; mat top = physics floor (y = 0)
const TRAY_T = 0.16  // tray rim thickness
const TRAY_H = 0.44  // tray rim height above desk

// wood grain, drawn per theme
function woodTexture (theme) {
  const t = THEMES[theme]
  const c = document.createElement('canvas')
  c.width = c.height = 1024
  const g = c.getContext('2d')
  g.fillStyle = t.desk
  g.fillRect(0, 0, 1024, 1024)
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 60; i++) {
    const x = rnd() * 1024, w = 2 + rnd() * 14, wobble = 6 + rnd() * 16
    g.strokeStyle = rnd() < 0.3 ? t.deskDark : t.deskGrain
    g.globalAlpha = 0.12 + rnd() * 0.25
    g.lineWidth = w
    g.beginPath()
    g.moveTo(x, -20)
    for (let y = 0; y <= 1024; y += 64) g.lineTo(x + Math.sin(y * 0.01 + i) * wobble, y)
    g.stroke()
  }
  g.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(5, 5)
  tex.anisotropy = 4
  return tex
}

// full-face print for the mat top: border band, grid, numerals, angle guide, coffee ring
function matTopTexture (theme, w, d) {
  const t = THEMES[theme]
  const c = document.createElement('canvas')
  c.width = 2048
  c.height = Math.max(512, Math.min(2048, Math.round(2048 * d / w)))
  const g = c.getContext('2d')
  const px = c.width / w // pixels per world unit
  const B = px * 0.42    // border band width
  g.fillStyle = t.matBorder
  g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = t.mat
  g.fillRect(B, B, c.width - 2 * B, c.height - 2 * B)
  // grid: one line per world unit, measured from the border band inward
  const py = c.height / d
  for (let i = 1; B + i * px < c.width - B - 4; i++) {
    g.strokeStyle = i % 5 === 0 ? t.gridBold : t.grid
    g.lineWidth = i % 5 === 0 ? 3 : 1.5
    g.beginPath(); g.moveTo(B + i * px, B); g.lineTo(B + i * px, c.height - B); g.stroke()
  }
  for (let i = 1; B + i * py < c.height - B - 4; i++) {
    g.strokeStyle = i % 5 === 0 ? t.gridBold : t.grid
    g.lineWidth = i % 5 === 0 ? 3 : 1.5
    g.beginPath(); g.moveTo(B, B + i * py); g.lineTo(c.width - B, B + i * py); g.stroke()
  }
  // numerals along the top border
  g.fillStyle = t.label
  g.font = `600 ${Math.round(B * 0.5)}px ui-monospace, Menlo, monospace`
  g.textAlign = 'center'; g.textBaseline = 'middle'
  for (let i = 5; B + i * px < c.width - B * 2; i += 5) {
    g.fillText(String(i), B + i * px, B * 0.52)
  }
  // angle guide, bottom-left corner
  const ax = B * 2.2, ay = c.height - B * 2.2, R = px * 2.2
  g.strokeStyle = t.gridBold; g.lineWidth = 2
  for (const deg of [30, 45, 60]) {
    const a = -deg * Math.PI / 180
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + Math.cos(a) * R, ay + Math.sin(a) * R); g.stroke()
  }
  g.beginPath(); g.arc(ax, ay, R * 0.55, -Math.PI / 2, 0); g.stroke()
  // label, bottom border
  g.fillStyle = t.label
  g.font = `700 ${Math.round(B * 0.55)}px ui-monospace, Menlo, monospace`
  g.textAlign = 'center'
  const spaced = 'M A T T E O   H E   ·   M O D E L  A 1   ·   S E L F - H E A L I N G'
  g.fillText(spaced, c.width / 2, c.height - B * 0.5)
  // old coffee ring
  g.strokeStyle = 'rgba(64, 38, 16, 0.16)'
  g.lineWidth = px * 0.09
  g.beginPath(); g.arc(c.width * 0.72, c.height * 0.28, px * 0.34, 0.4, 2.8); g.stroke()
  g.beginPath(); g.arc(c.width * 0.72, c.height * 0.28, px * 0.34, 3.4, 5.9); g.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

const deskMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 })
const desk = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), deskMat)
desk.rotation.x = -Math.PI / 2
desk.position.y = -MAT_H
desk.receiveShadow = true
scene.add(desk)

const matTopMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 })
const matSideMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 })
const matMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, MAT_H, 1),
  [matSideMat, matSideMat, matTopMat, matSideMat, matSideMat, matSideMat],
)
matMesh.receiveShadow = true
scene.add(matMesh)

const trayMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0 })
const trayRails = []
for (let i = 0; i < 4; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), trayMat)
  m.castShadow = true; m.receiveShadow = true
  scene.add(m); trayRails.push(m)
}

// desk props (decorative, outside the tray)
const props = new THREE.Group()
scene.add(props)
const pencil = new THREE.Group()
{
  const bodyM = M(0xe8b10e, { roughness: 0.55 })
  pencil.add(cyl(bodyM, 0.045, 0.045, 1.5, 0, 0, 0, 0, 0, Math.PI / 2, 6))
  pencil.add(cyl(M(0xd9b38c, { roughness: 0.8 }), 0.008, 0.045, 0.14, -0.82, 0, 0, 0, 0, Math.PI / 2, 6))
  pencil.add(cyl(M(0x3a3a3a), 0.004, 0.012, 0.05, -0.9, 0, 0, 0, 0, Math.PI / 2, 6))
  pencil.add(cyl(SILVER, 0.048, 0.048, 0.08, 0.79, 0, 0, 0, 0, Math.PI / 2, 12))
  pencil.add(cyl(M(0xe89aa4, { roughness: 0.9 }), 0.046, 0.046, 0.1, 0.88, 0, 0, 0, 0, Math.PI / 2, 12))
  props.add(pencil)
}
const sticky = new THREE.Group()
{
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  g.fillStyle = '#f5d848'; g.fillRect(0, 0, 256, 256)
  g.strokeStyle = 'rgba(60,50,20,0.75)'; g.lineWidth = 5; g.lineCap = 'round'
  g.font = 'bold 44px "Bradley Hand", "Segoe Print", cursive'
  g.fillStyle = 'rgba(60,50,20,0.8)'
  g.save(); g.translate(128, 105); g.rotate(-0.06)
  g.textAlign = 'center'
  g.fillText('ship the', 0, 0)
  g.fillText('site!!', 0, 52)
  g.restore()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const note = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.012, 0.62),
    [M(0xe8cb3a), M(0xe8cb3a), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), M(0xe8cb3a), M(0xe8cb3a), M(0xe8cb3a)],
  )
  note.castShadow = true; note.receiveShadow = true
  sticky.add(note)
  props.add(sticky)
}
const tape = new THREE.Group()
{
  const roll = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.085, 12, 28), M(0xd8d5cc, { roughness: 0.4 }))
  roll.rotation.x = Math.PI / 2
  roll.position.y = 0.085
  roll.castShadow = true; roll.receiveShadow = true
  tape.add(roll)
  props.add(tape)
}

let outerRect = { xL: -8, xR: 8, zB: -5, zF: 5 }
let matRepaintTimer = 0
function scheduleMatRepaint () {
  clearTimeout(matRepaintTimer)
  matRepaintTimer = setTimeout(() => { rebuildSurfaces(true); wakeRender(30) }, 160)
}
function rebuildSurfaces (repaintTextures = true) {
  const { xL, xR, zB, zF } = bounds
  const w = xR - xL, d = zF - zB
  const cx = (xL + xR) / 2, cz = (zB + zF) / 2
  // mat
  matMesh.scale.set(w, 1, d)
  matMesh.position.set(cx, -MAT_H / 2, cz)
  if (repaintTextures) {
    if (matTopMat.map) matTopMat.map.dispose()
    matTopMat.map = matTopTexture(themeName(), w, d)
    matTopMat.needsUpdate = true
  }
  // tray rails: back, front, left, right
  const y = -MAT_H + TRAY_H / 2
  trayRails[0].scale.set(w + 2 * TRAY_T, TRAY_H, TRAY_T); trayRails[0].position.set(cx, y, zB - TRAY_T / 2)
  trayRails[1].scale.set(w + 2 * TRAY_T, TRAY_H, TRAY_T); trayRails[1].position.set(cx, y, zF + TRAY_T / 2)
  trayRails[2].scale.set(TRAY_T, TRAY_H, d); trayRails[2].position.set(xL - TRAY_T / 2, y, cz)
  trayRails[3].scale.set(TRAY_T, TRAY_H, d); trayRails[3].position.set(xR + TRAY_T / 2, y, cz)
  // props on the desk margin, hugging the tray so they stay in frame
  const topZ = zB - TRAY_T - 0.55
  const botZ = (outerRect.zF + zF + TRAY_T) / 2
  pencil.position.set(cx + w * 0.18, -MAT_H + 0.045, botZ + 0.02)
  pencil.rotation.y = 0.06
  sticky.position.set(xL + 1.0, -MAT_H + 0.006, topZ)
  sticky.rotation.y = 0.16
  tape.position.set(xR - 1.1, -MAT_H, topZ + 0.05)
  pencil.visible = (outerRect.zF - zF) > 0.6
  sticky.visible = tape.visible = (zB - outerRect.zB) > 1.15
  // lamp follows the tray
  lamp.position.set(cx + 2.5, 9, cz + 3)
  lamp.target.position.set(cx, 0, cz)
}

let appliedTheme = null
function applyTheme () {
  const th = themeName()
  if (th === appliedTheme) return
  appliedTheme = th
  const t = THEMES[th]
  scene.background = new THREE.Color(t.bg)
  hemi.color.set(t.hemi)
  hemi.groundColor.set(t.ground)
  hemi.intensity = t.hemiI
  sun.intensity = t.sunI
  sun.color.set(t.sunC)
  lamp.intensity = t.spotI
  lamp.visible = t.spotI > 0
  if (deskMat.map) deskMat.map.dispose()
  deskMat.map = woodTexture(th)
  deskMat.needsUpdate = true
  matSideMat.color.set(t.matBorder)
  trayMat.color.set(t.tray)
  rebuildSurfaces()
  wakeRender(120)
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

// ---------------------------------------------------------------- physics

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0), allowSleep: true })
world.broadphase = new CANNON.SAPBroadphase(world)
world.defaultContactMaterial.friction = 0.4
world.defaultContactMaterial.restitution = 0.3

const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() })
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
world.addBody(groundBody)

// viewport walls (repositioned on resize) + ceiling
const WALL_T = 2 // thick, so fast throws can't tunnel through
const walls = []
for (let i = 0; i < 4; i++) {
  const b = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(30, 8, WALL_T)) })
  b.userData = { wall: true }
  world.addBody(b); walls.push(b)
}
const ceiling = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() })
ceiling.quaternion.setFromEuler(Math.PI / 2, 0, 0)
ceiling.position.set(0, 11, 0)
world.addBody(ceiling)

const _ray = new THREE.Raycaster()
const _floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
function floorPointAtNDC (x, y, out) {
  _ray.setFromCamera({ x, y }, camera)
  return _ray.ray.intersectPlane(_floorPlane, out)
}
let bounds = { xL: -6, xR: 6, zB: -4, zF: 4 }
function layoutWalls () {
  const tl = new THREE.Vector3(), tr = new THREE.Vector3(), bl = new THREE.Vector3(), br = new THREE.Vector3()
  floorPointAtNDC(-1, 1, tl); floorPointAtNDC(1, 1, tr)
  floorPointAtNDC(-1, -1, bl); floorPointAtNDC(1, -1, br)
  const oxL = Math.max(tl.x, bl.x), oxR = Math.min(tr.x, br.x)
  const ozB = Math.max(tl.z, tr.z), ozF = Math.min(bl.z, br.z)
  outerRect = { xL: oxL, xR: oxR, zB: ozB, zF: ozF }
  // inset the tray so a strip of desk stays visible around it
  const mx = Math.min(Math.max((oxR - oxL) * 0.075, 0.5), 1.5)
  const mzTop = Math.min(Math.max((ozF - ozB) * 0.1, 0.6), 1.7)
  const mzBot = Math.min(Math.max((ozF - ozB) * 0.09, 0.55), 1.6)
  const xL = oxL + mx, xR = oxR - mx
  const zB = ozB + mzTop, zF = ozF - mzBot
  bounds = { xL, xR, zB, zF }
  rebuildSurfaces(false)
  scheduleMatRepaint()
  // keep the sun's shadow box wrapped around whatever the viewport shows
  const ext = Math.max(Math.abs(oxL), oxR, Math.abs(ozB), ozF) + 3
  sun.shadow.camera.left = -ext; sun.shadow.camera.right = ext
  sun.shadow.camera.top = ext; sun.shadow.camera.bottom = -ext
  sun.shadow.camera.updateProjectionMatrix()
  const cx = (xL + xR) / 2, cz = (zB + zF) / 2
  walls[0].position.set(xL - WALL_T, 8, cz); walls[0].quaternion.setFromEuler(0, Math.PI / 2, 0)
  walls[1].position.set(xR + WALL_T, 8, cz); walls[1].quaternion.setFromEuler(0, Math.PI / 2, 0)
  walls[2].position.set(cx, 8, zB - WALL_T); walls[2].quaternion.set(0, 0, 0, 1)
  walls[3].position.set(cx, 8, zF + WALL_T); walls[3].quaternion.set(0, 0, 0, 1)
}

// ---------------------------------------------------------------- object builders

const BUILDERS = {
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
    const N = [0, 0.05, -0.7], L = [-0.5, 0.14, 0.55], R = [0.5, 0.14, 0.55], C = [0, 0.06, 0.55], K = [0, -0.2, 0.42]
    geo.setAttribute('position', new THREE.Float32BufferAttribute([...N, ...L, ...C, ...N, ...C, ...R, ...N, ...C, ...K], 3))
    geo.computeVertexNormals()
    const m = new THREE.Mesh(geo, PAPER)
    m.castShadow = true; m.receiveShadow = true
    m.position.y = 0.2
    g.add(m)
    const body = new CANNON.Body({ mass: 0.3, angularDamping: 0.4 })
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.48, 0.14, 0.62)), new CANNON.Vec3(0, 0.16, -0.05))
    return { g, body }
  },
  prism () {
    const g = new THREE.Group()
    g.add(cyl(GLASS, 0.36, 0.36, 0.55, 0, 0.28, 0, 0, 0, 0, 3))
    const body = new CANNON.Body({ mass: 0.9 })
    body.addShape(new CANNON.Cylinder(0.36, 0.36, 0.55, 3), new CANNON.Vec3(0, 0.28, 0))
    return { g, body }
  },
  joystick () {
    const g = new THREE.Group()
    g.add(box(DARK, 0.6, 0.2, 0.6, 0, 0.1, 0))
    g.add(cyl(SILVER, 0.05, 0.05, 0.38, -0.08, 0.39, 0, 0, 0, 0, 12))
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), RED)
    ball.position.set(-0.08, 0.6, 0); ball.castShadow = true
    g.add(ball)
    g.add(cyl(RED, 0.07, 0.07, 0.05, 0.17, 0.22, 0.12, 0, 0, 0, 14))
    const body = new CANNON.Body({ mass: 1.0 })
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.3, 0.1, 0.3)), new CANNON.Vec3(0, 0.1, 0))
    body.addShape(new CANNON.Sphere(0.14), new CANNON.Vec3(-0.08, 0.6, 0))
    return { g, body }
  },
  mug () {
    const g = new THREE.Group()
    g.add(cyl(CERAMIC, 0.28, 0.25, 0.44, 0, 0.22, 0))
    const inner = cyl(COFFEE, 0.24, 0.24, 0.02, 0, 0.38, 0)
    inner.name = 'coffee-surface'
    g.add(inner)
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.045, 10, 20, Math.PI), CERAMIC)
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
    g.add(cyl(M(0x1a1c20), 0.2, 0.2, 0.05, -0.3, 0.43, 0, 0, 0, 0, 20))
    g.add(cyl(M(0x1a1c20), 0.2, 0.2, 0.05, 0.3, 0.43, 0, 0, 0, 0, 20))
    g.add(cyl(SILVER, 0.05, 0.05, 0.03, -0.3, 0.46, 0, 0, 0, 0, 12))
    g.add(cyl(SILVER, 0.05, 0.05, 0.03, 0.3, 0.46, 0, 0, 0, 0, 12))
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

// ---------------------------------------------------------------- spawn objects

const objects = [] // { item, mesh, body }
const byBodyId = new Map()

for (const item of ITEMS) {
  const { g, body } = BUILDERS[item.id]()
  scene.add(g)
  g.visible = false
  body.allowSleep = true
  body.sleepSpeedLimit = 0.4
  body.sleepTimeLimit = 0.6
  body.angularDamping = body.angularDamping || 0.1
  body.linearDamping = 0.05
  const bb = new THREE.Box3().setFromObject(g)
  const o = { item, mesh: g, body, lastSound: 0, radius: Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2 + 0.14 }
  objects.push(o)
  byBodyId.set(body.id, o)
  body.addEventListener('collide', (e) => {
    const impact = Math.abs(e.contact.getImpactVelocityAlongNormal())
    if (impact < 1.1) return
    const now = performance.now()
    if (now - o.lastSound < 90) return
    o.lastSound = now
    const isWall = e.body.userData && e.body.userData.wall
    clonk(isWall ? 'wall' : item.sound, Math.min(impact / 8, 1))
  })
}

function dump (first = false) {
  const { xL, xR, zB, zF } = bounds
  // center the pile where the *viewer* sees the middle of the mat
  const c = new THREE.Vector3()
  floorPointAtNDC(0, -0.05, c)
  const mx = Math.min(Math.max(c.x, xL + 1), xR - 1)
  const mz = Math.min(Math.max(c.z, zB + 1), zF - 1)
  const spanX = Math.min((xR - xL) * 0.35, 4.5), spanZ = Math.min((zF - zB) * 0.3, 2.8)
  objects.forEach((o, i) => {
    const place = () => {
      o.mesh.visible = true
      o.body.position.set(mx + (Math.random() * 2 - 1) * spanX, REDUCED && first ? 1.2 + i * 0.4 : 4 + Math.random() * 2.5, mz + (Math.random() * 2 - 1) * spanZ)
      o.body.velocity.set(0, REDUCED ? 0 : -3, 0)
      o.body.angularVelocity.set(Math.random() * 3 - 1.5, Math.random() * 3 - 1.5, Math.random() * 3 - 1.5)
      o.body.quaternion.setFromEuler(Math.random() * 0.8 - 0.4, Math.random() * Math.PI * 2, Math.random() * 0.8 - 0.4)
      o.body.wakeUp()
      if (!world.bodies.includes(o.body)) world.addBody(o.body)
    }
    if (REDUCED || !first) place()
    else setTimeout(place, 200 + i * 140)
  })
}

// ---------------------------------------------------------------- hover ring + tooltip

const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.86, 1, 28),
  new THREE.MeshBasicMaterial({ color: 0xff6a3d, transparent: true, opacity: 0, depthWrite: false }),
)
ring.rotation.x = -Math.PI / 2
ring.position.y = 0.02
scene.add(ring)

const tooltip = document.getElementById('tooltip')
let hoverObj = null
let lastPointer = { x: 0, y: 0 }
let kbIdx = -1 // keyboard-focused object index, -1 = none

// the object currently highlighted: keyboard focus wins over mouse hover
function highlightTarget () {
  if (document.activeElement === canvas && kbIdx >= 0) return objects[kbIdx]
  if (!grabbed && hoverObj && hoverObj.mesh.visible) return hoverObj
  return null
}

function updateHighlight (dt) {
  const t = highlightTarget()
  const kb = document.activeElement === canvas && kbIdx >= 0
  const goal = t ? (kb ? 0.62 : 0.42) : 0
  const m = ring.material
  ring.userData.animating = Math.abs(goal - m.opacity) > 0.01
  m.opacity += (goal - m.opacity) * Math.min(dt * 10, 1)
  if (t) {
    ring.position.x = t.body.position.x
    ring.position.z = t.body.position.z
    const s = t.radius
    ring.scale.set(s, s, 1)
    tooltip.textContent = t.item.name
    tooltip.hidden = false
    if (document.activeElement === canvas && kbIdx >= 0) {
      const v = new THREE.Vector3(t.body.position.x, t.body.position.y + 0.6, t.body.position.z)
      v.project(camera)
      tooltip.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'
      tooltip.style.top = ((-v.y + 1) / 2 * innerHeight - 14) + 'px'
    } else if (IS_TOUCH) {
      tooltip.hidden = true
    } else {
      tooltip.style.left = Math.min(lastPointer.x + 16, innerWidth - tooltip.offsetWidth - 8) + 'px'
      tooltip.style.top = Math.max(lastPointer.y - 6, tooltip.offsetHeight + 10) + 'px'
    }
  } else {
    tooltip.hidden = true
  }
}

// ---------------------------------------------------------------- drag / click

const jointBody = new CANNON.Body({ mass: 0 })
world.addBody(jointBody)
let constraint = null
let grabbed = null
let dragY = 1.4
let downAt = 0
let downPos = { x: 0, y: 0 }
let moved = false
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

function pointerRayHit (ev) {
  const r = canvas.getBoundingClientRect()
  const x = ((ev.clientX - r.left) / r.width) * 2 - 1
  const y = -((ev.clientY - r.top) / r.height) * 2 + 1
  _ray.setFromCamera({ x, y }, camera)
  const meshes = objects.filter(o => o.mesh.visible).map(o => o.mesh)
  const hits = _ray.intersectObjects(meshes, true)
  if (!hits.length) return null
  let g = hits[0].object
  while (g.parent && g.parent !== scene) g = g.parent
  const o = objects.find(o => o.mesh === g)
  return o ? { o, point: hits[0].point } : null
}
function pointerOnPlane (ev, out) {
  const r = canvas.getBoundingClientRect()
  const x = ((ev.clientX - r.left) / r.width) * 2 - 1
  const y = -((ev.clientY - r.top) / r.height) * 2 + 1
  _ray.setFromCamera({ x, y }, camera)
  return _ray.ray.intersectPlane(dragPlane, out)
}

canvas.addEventListener('pointerdown', (ev) => {
  ensureAudio()
  kbIdx = -1 // pointer takes over from keyboard browsing
  wakeRender(60)
  const hit = pointerRayHit(ev)
  downAt = performance.now()
  downPos = { x: ev.clientX, y: ev.clientY }
  moved = false
  if (!hit) return
  canvas.setPointerCapture(ev.pointerId)
  grabbed = hit.o
  grabbed.body.wakeUp()
  dragY = Math.min(Math.max(hit.point.y, 1.2), 3)
  dragPlane.constant = -dragY
  grabbed.body.allowSleep = false
  const local = grabbed.body.pointToLocalFrame(new CANNON.Vec3(hit.point.x, hit.point.y, hit.point.z))
  jointBody.position.set(hit.point.x, dragY, hit.point.z)
  constraint = new CANNON.PointToPointConstraint(grabbed.body, local, jointBody, new CANNON.Vec3(0, 0, 0), 400 * grabbed.body.mass)
  world.addConstraint(constraint)
  grabbed._prevAngDamp = grabbed.body.angularDamping
  grabbed.body.angularDamping = 0.7
  canvas.style.cursor = 'grabbing'
  hintUsed('drag')
})
canvas.addEventListener('pointermove', (ev) => {
  if (Math.abs(ev.clientX - downPos.x) + Math.abs(ev.clientY - downPos.y) > 7) moved = true
  lastPointer = { x: ev.clientX, y: ev.clientY }
  wakeRender(30)
  if (!constraint) {
    const hit = pointerRayHit(ev)
    hoverObj = hit ? hit.o : null
    canvas.style.cursor = hoverObj ? 'grab' : 'default'
    return
  }
  const p = new THREE.Vector3()
  if (pointerOnPlane(ev, p)) {
    jointBody.position.set(
      Math.min(Math.max(p.x, bounds.xL + 0.3), bounds.xR - 0.3),
      dragY,
      Math.min(Math.max(p.z, bounds.zB + 0.3), bounds.zF - 0.3),
    )
  }
})
function release (ev) {
  if (constraint) {
    world.removeConstraint(constraint)
    constraint = null
  }
  if (grabbed) {
    wakeRender(120)
    grabbed.body.allowSleep = true
    grabbed.body.angularDamping = grabbed._prevAngDamp ?? 0.1
    // cap the throw speed so flings stay fun but can't break the sim
    const v = grabbed.body.velocity
    const speed = v.length()
    if (speed > 13) v.scale(13 / speed, v)
    const quick = performance.now() - downAt < 300
    if (!moved && quick) openCard(grabbed)
    grabbed = null
  }
  if (IS_TOUCH) hoverObj = null // no lingering highlight after a tap
  canvas.style.cursor = 'default'
}
canvas.addEventListener('pointerup', release)
canvas.addEventListener('pointercancel', release)
canvas.addEventListener('pointerleave', () => {
  if (!constraint) {
    hoverObj = null
    canvas.style.cursor = 'default'
    wakeRender(15)
  }
})

// ---------------------------------------------------------------- card UI

const card = document.getElementById('card')
const cardEyebrow = document.getElementById('card-eyebrow')
const cardTitle = document.getElementById('card-title')
const cardBody = document.getElementById('card-body')
const cardLink = document.getElementById('card-link')
const counter = document.getElementById('counter')
const seen = new Set()

const cardActions = document.getElementById('card-actions')
const srStatus = document.getElementById('sr-status')
let completed = false
let finalShown = false
let confettiDone = false
let finalTimer = null
let openedViaKeyboard = false

function showCard () {
  card.hidden = false
  requestAnimationFrame(() => card.classList.add('open'))
  wakeRender(30)
}
function closeCard () {
  if (card.hidden) return
  card.classList.remove('open')
  setTimeout(() => { card.hidden = true }, 220)
  // don't strand keyboard focus on a hidden panel
  if (openedViaKeyboard || card.contains(document.activeElement)) canvas.focus()
  openedViaKeyboard = false
  // the payoff moment: the tenth story just closed
  if (completed && !finalShown && !finalTimer) {
    if (!confettiDone) {
      confettiDone = true
      if (!REDUCED) confettiBurst()
    }
    finalTimer = setTimeout(showFinalCard, REDUCED ? 250 : 900)
  }
  wakeRender(30)
}

function openCard (o, viaKeyboard = false) {
  clearTimeout(finalTimer) // never yank a story out from under the reader
  finalTimer = null
  openedViaKeyboard = viaKeyboard
  cardEyebrow.textContent = o.item.eyebrow
  cardTitle.textContent = o.item.name
  cardBody.textContent = o.item.story
  cardActions.hidden = true
  if (o.item.link) {
    cardLink.href = o.item.link
    cardLink.hidden = false
  } else cardLink.hidden = true
  showCard()
  seen.add(o.item.id)
  if (seen.size === ITEMS.length && !completed) {
    completed = true
    counter.textContent = ITEMS.length + '/' + ITEMS.length + ' — that’s everything ✓'
    counter.disabled = false
  } else if (!completed) {
    counter.textContent = seen.size + '/' + ITEMS.length + ' examined'
  }
  if (viaKeyboard) card.focus()
  srStatus.textContent = o.item.name + '. ' + o.item.eyebrow + '. ' + o.item.story
  hintUsed('click')
  ping()
}

function showFinalCard () {
  finalShown = true
  finalTimer = null
  openedViaKeyboard = false
  cardEyebrow.textContent = '10/10 · THE WHOLE DRAWER'
  cardTitle.textContent = 'That’s everything.'
  cardBody.textContent = 'You’ve explored all ten objects and their stories. You can also read my CV below.'
  cardLink.hidden = true
  cardActions.hidden = false
  showCard()
  srStatus.textContent = 'You’ve read all ten stories. Links to the CV and GitHub are in the panel.'
  fanfare()
}
counter.addEventListener('click', () => { if (completed) showFinalCard() })

document.getElementById('card-close').addEventListener('click', closeCard)
if (IS_TOUCH) {
  let sheetY = null
  card.addEventListener('pointerdown', (ev) => { sheetY = ev.clientY })
  card.addEventListener('pointermove', (ev) => {
    if (sheetY != null && ev.clientY - sheetY > 70) { sheetY = null; closeCard() }
  })
  card.addEventListener('pointerup', () => { sheetY = null })
}
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') closeCard()
})

// in-world confetti: little paper rectangles raining into the tray
const confetti = []
const CONF_COLORS = [0xff6a3d, 0x5aa8ff, 0xf5d848, 0xefece4, 0xe23d2e].map(c =>
  new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }))
const confGeo = new THREE.PlaneGeometry(0.09, 0.05)
function confettiBurst () {
  const cx = (bounds.xL + bounds.xR) / 2, cz = (bounds.zB + bounds.zF) / 2
  for (let i = 0; i < 80; i++) {
    const m = new THREE.Mesh(confGeo, CONF_COLORS[i % CONF_COLORS.length])
    m.position.set(cx + (Math.random() - 0.5) * 3, 4.5 + Math.random() * 2, cz + (Math.random() - 0.5) * 2)
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)
    scene.add(m)
    confetti.push({
      m,
      vel: new THREE.Vector3((Math.random() - 0.5) * 2.2, Math.random() * 1.2, (Math.random() - 0.5) * 2.2),
      spin: new THREE.Vector3(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3),
      ttl: 2.6 + Math.random() * 1.6,
    })
  }
  wakeRender(300)
}
function updateConfetti (dt) {
  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i]
    c.ttl -= dt
    c.vel.y -= 3.2 * dt
    c.vel.multiplyScalar(1 - 0.6 * dt) // air drag: flutter, don't plummet
    c.m.position.addScaledVector(c.vel, dt)
    c.m.rotation.x += c.spin.x * dt; c.m.rotation.y += c.spin.y * dt; c.m.rotation.z += c.spin.z * dt
    if (c.m.position.y < 0.02) { c.m.position.y = 0.02; c.vel.set(0, 0, 0); c.spin.set(0, 0, 0) }
    if (c.ttl < 0.5) c.m.scale.setScalar(Math.max(c.ttl / 0.5, 0.001))
    if (c.ttl <= 0) {
      scene.remove(c.m)
      confetti.splice(i, 1)
    }
  }
}

// hint pill
const hint = document.getElementById('hint')
if (IS_TOUCH) hint.textContent = 'drag to throw · tap to read'
const hintDone = { drag: false, click: false }
function hintUsed (k) {
  hintDone[k] = true
  if (hintDone.drag && hintDone.click) hint.classList.add('gone')
}
setTimeout(() => hint.classList.add('gone'), 26000)

// controls
document.getElementById('dump').addEventListener('click', () => { ensureAudio(); dump(false); wakeRender(300) })
const muteBtn = document.getElementById('mute')
let muted = false
muteBtn.setAttribute('aria-label', 'Mute sound effects')
muteBtn.addEventListener('click', () => {
  muted = !muted
  muteBtn.textContent = muted ? 'sound off' : 'sound on'
  muteBtn.setAttribute('aria-pressed', String(muted))
})

// ---------------------------------------------------------------- keyboard navigation

canvas.addEventListener('focus', () => {
  // arm keyboard browsing only for real keyboard focus, not tap/click focus
  if (kbIdx < 0 && canvas.matches(':focus-visible')) kbIdx = 0
  wakeRender(30)
})
canvas.addEventListener('blur', () => wakeRender(30))
canvas.addEventListener('keydown', (ev) => {
  const n = objects.length
  if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
    kbIdx = (kbIdx + 1) % n
  } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
    kbIdx = (kbIdx - 1 + n) % n
  } else if (ev.key === 'Enter' || ev.key === ' ') {
    if (kbIdx >= 0) { ensureAudio(); openCard(objects[kbIdx], true) }
  } else {
    return
  }
  ev.preventDefault()
  if (kbIdx >= 0 && ev.key !== 'Enter' && ev.key !== ' ') srStatus.textContent = objects[kbIdx].item.name
  wakeRender(30)
})

// ---------------------------------------------------------------- tilt = gravity (mobile)

const tiltBtn = document.getElementById('tilt')
let tiltOn = false
let tiltBase = null
let gravAtWake = { x: 0, z: 0 }
if (IS_TOUCH && typeof DeviceOrientationEvent !== 'undefined') tiltBtn.hidden = false

function onTilt (e) {
  if (e.beta == null || e.gamma == null) return
  if (!tiltBase) tiltBase = { b: e.beta, g: e.gamma }
  const clamp = (v) => Math.min(Math.max(v, -30), 30)
  const db = clamp(e.beta - tiltBase.b)   // top of phone toward you -> slide down-screen
  const dg = clamp(e.gamma - tiltBase.g)  // tilt right -> slide right
  const a = ((screen.orientation && screen.orientation.angle) || 0) * Math.PI / 180
  const x = dg * Math.cos(a) + db * Math.sin(a)
  const z = db * Math.cos(a) - dg * Math.sin(a)
  const gx = (x / 30) * 6.5, gz = (z / 30) * 6.5
  world.gravity.set(gx, -9.82, gz)
  // compare against the gravity at the last wake, so slow tilts still register
  if (Math.abs(gravAtWake.x - gx) + Math.abs(gravAtWake.z - gz) > 0.12) {
    gravAtWake = { x: gx, z: gz }
    for (const o of objects) o.body.wakeUp()
    wakeRender(60)
  }
}
// device rotation changes the beta/gamma frame: recapture the neutral pose
;(screen.orientation || window).addEventListener?.('change', () => { tiltBase = null })
addEventListener('orientationchange', () => { tiltBase = null })
tiltBtn.setAttribute('aria-label', 'Tilt your device to slide objects')
tiltBtn.addEventListener('click', async () => {
  if (!tiltOn) {
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const res = await DeviceOrientationEvent.requestPermission()
        if (res !== 'granted') return
      }
      tiltBase = null
      addEventListener('deviceorientation', onTilt)
      tiltOn = true
      tiltBtn.textContent = 'tilt on'
    } catch { /* permission dialog dismissed */ }
  } else {
    removeEventListener('deviceorientation', onTilt)
    tiltOn = false
    tiltBase = null
    world.gravity.set(0, -9.82, 0)
    gravAtWake = { x: 0, z: 0 }
    tiltBtn.textContent = 'tilt off'
    wakeRender(60)
  }
  tiltBtn.setAttribute('aria-pressed', String(tiltOn))
})

// ---------------------------------------------------------------- coffee

const mugObj = objects.find(o => o.item.id === 'mug')
let coffeeLevel = 1
const POOL = 26
const drops = []
const dropGeo = new THREE.SphereGeometry(0.055, 8, 6)
for (let i = 0; i < POOL; i++) {
  const mesh = new THREE.Mesh(dropGeo, COFFEE)
  mesh.castShadow = true; mesh.visible = false
  scene.add(mesh)
  const body = new CANNON.Body({ mass: 0.03, shape: new CANNON.Sphere(0.055) })
  body.linearDamping = 0.02
  drops.push({ mesh, body, ttl: 0, active: false })
}
const stains = []
function addStain (x, z) {
  if (stains.length > 50) {
    const s = stains.shift()
    scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose()
  }
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.07 + Math.random() * 0.09, 14),
    new THREE.MeshBasicMaterial({ color: 0x3a2413, transparent: true, opacity: 0.35 }),
  )
  m.rotation.x = -Math.PI / 2
  m.position.set(x, 0.012 + stains.length * 0.0004, z)
  scene.add(m)
  stains.push({ mesh: m, born: performance.now() })
  setTimeout(() => wakeRender(420), 14200) // come back for the fade-out
}
let spillCooldown = 0
function updateCoffee (dt) {
  // fade old stains
  const now = performance.now()
  for (let i = stains.length - 1; i >= 0; i--) {
    const age = (now - stains[i].born) / 1000
    if (age > 14) {
      stains[i].mesh.material.opacity = Math.max(0, 0.35 * (1 - (age - 14) / 5))
      if (age > 19) {
        scene.remove(stains[i].mesh)
        stains[i].mesh.geometry.dispose(); stains[i].mesh.material.dispose()
        stains.splice(i, 1)
      }
    }
  }
  // drops physics lifecycle
  for (const d of drops) {
    if (!d.active) continue
    d.ttl -= dt
    d.mesh.position.copy(d.body.position)
    const slow = d.body.velocity.lengthSquared() < 0.3
    if (d.body.position.y < 0.09 && slow) {
      addStain(d.body.position.x, d.body.position.z)
      deactivateDrop(d)
    } else if (d.ttl <= 0) deactivateDrop(d)
  }
  // spill check
  const up = mugObj.body.quaternion.vmult(new CANNON.Vec3(0, 1, 0))
  const tilted = up.y < 0.45
  const surf = mugObj.mesh.getObjectByName('coffee-surface')
  if (surf) surf.visible = coffeeLevel > 0.05
  spillCooldown -= dt
  if (tilted && coffeeLevel > 0 && spillCooldown <= 0) {
    coffeeLevel = Math.max(0, coffeeLevel - dt * 0.5)
    spillCooldown = 0.05
    const d = drops.find(d => !d.active)
    if (d) {
      // lowest point of the rim
      const down = new CANNON.Vec3(0, -1, 0)
      const dot = down.dot(up)
      const dir = new CANNON.Vec3(down.x - up.x * dot, down.y - up.y * dot, down.z - up.z * dot)
      dir.normalize()
      const p = mugObj.body.position
      d.body.position.set(p.x + up.x * 0.22 + dir.x * 0.38, p.y + up.y * 0.22 + dir.y * 0.38, p.z + up.z * 0.22 + dir.z * 0.38)
      d.body.velocity.set(
        dir.x * 1.1 + mugObj.body.velocity.x + (Math.random() - 0.5) * 0.4,
        -0.4 + mugObj.body.velocity.y,
        dir.z * 1.1 + mugObj.body.velocity.z + (Math.random() - 0.5) * 0.4,
      )
      d.ttl = 3
      d.active = true
      d.mesh.visible = true
      world.addBody(d.body)
    }
  }
  if (!tilted) coffeeLevel = Math.min(1, coffeeLevel + dt * 0.04) // it refills, mysteriously
}
function deactivateDrop (d) {
  d.active = false
  d.mesh.visible = false
  world.removeBody(d.body)
}

// ---------------------------------------------------------------- idle life & character

const planeObj = objects.find(o => o.item.id === 'plane')
const dolphinObj = objects.find(o => o.item.id === 'dolphin')
const prismObj = objects.find(o => o.item.id === 'prism')

// the paper airplane actually glides: lift + drag + nose-into-velocity while airborne
const _fwd = new CANNON.Vec3()
const _dir = new CANNON.Vec3()
function updateGlide (dt) {
  const b = planeObj.body
  if (grabbed === planeObj || !planeObj.mesh.visible) return
  const v = b.velocity
  const hs = Math.hypot(v.x, v.z)
  if (b.position.y > 0.45 && hs > 1.4) {
    // integrate lift directly so it's independent of display refresh rate
    const liftAccel = Math.min(hs * 0.16, 0.88) * 9.82
    v.y += liftAccel * dt
    // settle the tumble, then steer the nose (local -Z) into the velocity
    const damp = Math.max(0, 1 - 6 * dt)
    b.angularVelocity.scale(damp, b.angularVelocity)
    b.quaternion.vmult(new CANNON.Vec3(0, 0, -1), _fwd)
    _dir.set(v.x, v.y * 0.25, v.z)
    _dir.normalize()
    const cross = _fwd.cross(_dir)
    b.angularVelocity.x += cross.x * 21 * dt
    b.angularVelocity.y += cross.y * 21 * dt
    b.angularVelocity.z += cross.z * 21 * dt
    b.wakeUp()
  }
}

// the dolphin does a lazy flop every so often
let nextFlop = performance.now() + 9000 + Math.random() * 8000
function maybeFlop () {
  const now = performance.now()
  if (now < nextFlop) return
  nextFlop = now + 10000 + Math.random() * 10000
  if (REDUCED || document.hidden) return
  const b = dolphinObj.body
  if (grabbed === dolphinObj || !dolphinObj.mesh.visible) return
  if (b.velocity.lengthSquared() > 0.1) return // only flop from rest
  b.wakeUp()
  b.velocity.y = 2.6 + Math.random() * 0.8
  b.velocity.x += (Math.random() - 0.5) * 0.8
  b.velocity.z += (Math.random() - 0.5) * 0.8
  // roll around the long axis, like a real bored dolphin
  const axis = b.quaternion.vmult(new CANNON.Vec3(1, 0, 0))
  const s = (3.5 + Math.random() * 2) * (Math.random() < 0.5 ? 1 : -1)
  b.angularVelocity.set(axis.x * s, axis.y * s, axis.z * s)
  chirp()
  wakeRender(180)
}

// the prism casts a little rainbow on the mat while at rest
const rainbow = (() => {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 128
  const g = c.getContext('2d')
  const colors = ['#ff5a4e', '#ffa14e', '#ffe14e', '#6fd66f', '#5aa8ff', '#9d6fff']
  const bandW = 256 / colors.length
  colors.forEach((col, i) => {
    const grad = g.createLinearGradient(0, 128, 0, 0)
    grad.addColorStop(0, col + 'cc')
    grad.addColorStop(1, col + '00')
    g.fillStyle = grad
    g.fillRect(i * bandW, 0, bandW + 1, 128)
  })
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.3),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false }),
  )
  m.rotation.x = -Math.PI / 2
  m.position.y = 0.015
  scene.add(m)
  return m
})()
function updateRainbow (dt) {
  const b = prismObj.body
  const still = b.velocity.lengthSquared() < 0.02 && prismObj.mesh.visible && grabbed !== prismObj
  const goal = still ? 0.5 : 0
  const mat = rainbow.material
  rainbow.userData.animating = Math.abs(goal - mat.opacity) > 0.01
  mat.opacity += (goal - mat.opacity) * Math.min(dt * 2.2, 1)
  if (mat.opacity > 0.01) {
    // fan out on the far side of the prism from the light
    const dx = b.position.x - 5, dz = b.position.z - 4
    const len = Math.hypot(dx, dz) || 1
    rainbow.position.x = b.position.x + (dx / len) * 0.95
    rainbow.position.z = b.position.z + (dz / len) * 0.95
    rainbow.rotation.z = -Math.atan2(dz, dx) + Math.PI / 2
  }
}

// ---------------------------------------------------------------- audio (all synthesized)

let actx = null, master = null, noiseBuf = null
function ensureAudio () {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  actx = new AC()
  master = actx.createGain()
  master.gain.value = 0.5
  master.connect(actx.destination)
  const len = actx.sampleRate * 0.2
  noiseBuf = actx.createBuffer(1, len, actx.sampleRate)
  const ch = noiseBuf.getChannelData(0)
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1
}
const SOUNDS = {
  wood:    { f: 170, type: 'triangle', decay: 0.12, noise: 0.5, nf: 900 },
  metal:   { f: 520, type: 'square',   decay: 0.22, noise: 0.25, nf: 3200 },
  ceramic: { f: 760, type: 'sine',     decay: 0.1, noise: 0.35, nf: 4200 },
  plastic: { f: 230, type: 'triangle', decay: 0.08, noise: 0.55, nf: 1600 },
  paper:   { f: 90,  type: 'sine',     decay: 0.05, noise: 0.9, nf: 2400 },
  glass:   { f: 980, type: 'sine',     decay: 0.18, noise: 0.2, nf: 5000 },
  soft:    { f: 140, type: 'sine',     decay: 0.09, noise: 0.4, nf: 700 },
  wall:    { f: 110, type: 'sine',     decay: 0.16, noise: 0.4, nf: 500 },
}
let lastGlobalSound = 0
function clonk (kind, intensity) {
  if (!actx || muted) return
  const now = performance.now()
  if (now - lastGlobalSound < 40) return
  lastGlobalSound = now
  const s = SOUNDS[kind] || SOUNDS.plastic
  const t = actx.currentTime
  const vol = 0.12 + intensity * 0.45
  const g = actx.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + s.decay)
  g.connect(master)
  const osc = actx.createOscillator()
  osc.type = s.type
  osc.frequency.setValueAtTime(s.f * (0.92 + Math.random() * 0.16), t)
  osc.frequency.exponentialRampToValueAtTime(s.f * 0.6, t + s.decay)
  osc.connect(g)
  osc.start(t); osc.stop(t + s.decay + 0.02)
  const n = actx.createBufferSource()
  n.buffer = noiseBuf
  const nf = actx.createBiquadFilter()
  nf.type = 'bandpass'; nf.frequency.value = s.nf; nf.Q.value = 1.2
  const ng = actx.createGain()
  ng.gain.setValueAtTime(vol * s.noise, t)
  ng.gain.exponentialRampToValueAtTime(0.001, t + s.decay * 0.8)
  n.connect(nf); nf.connect(ng); ng.connect(master)
  n.start(t); n.stop(t + s.decay)
}
function ping () {
  if (!actx || muted) return
  const t = actx.currentTime
  const g = actx.createGain()
  g.gain.setValueAtTime(0.08, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
  g.connect(master)
  const o = actx.createOscillator()
  o.type = 'sine'; o.frequency.value = 1180
  o.connect(g); o.start(t); o.stop(t + 0.3)
}
function chirp () {
  if (!actx || muted) return
  const t = actx.currentTime
  for (let i = 0; i < 2; i++) {
    const g = actx.createGain()
    g.gain.setValueAtTime(0.05, t + i * 0.12)
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.1)
    g.connect(master)
    const o = actx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(900 + i * 250, t + i * 0.12)
    o.frequency.exponentialRampToValueAtTime(1500 + i * 300, t + i * 0.12 + 0.09)
    o.connect(g); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.11)
  }
}
function fanfare () {
  if (!actx || muted) return
  const t = actx.currentTime
  ;[523, 659, 784, 1047].forEach((f, i) => {
    const g = actx.createGain()
    g.gain.setValueAtTime(0.07, t + i * 0.09)
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.35)
    g.connect(master)
    const o = actx.createOscillator()
    o.type = 'triangle'; o.frequency.value = f
    o.connect(g); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.36)
  })
}

// ---------------------------------------------------------------- resize / parallax / loop

function resize () {
  wakeRender(120)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  const w = innerWidth, h = innerHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  // pull the camera back on narrow screens so the pile still fits
  const zoomOut = w / h < 0.9 ? 1.35 : 1
  camera.position.copy(CAM_BASE).multiplyScalar(zoomOut)
  camera.lookAt(0, 0, 0.2)
  camera.updateProjectionMatrix()
  layoutWalls()
}
addEventListener('resize', resize)
resize()
applyTheme()

let px = 0, py = 0
if (!REDUCED) {
  addEventListener('pointermove', (ev) => {
    px = (ev.clientX / innerWidth - 0.5) * 2
    py = (ev.clientY / innerHeight - 0.5) * 2
    wakeRender(10)
  })
}

const clock = new THREE.Clock()
let hidden = false
document.addEventListener('visibilitychange', () => {
  hidden = document.hidden
  if (!hidden) {
    clock.getDelta() // discard the away-time
    wakeRender(60)
  }
})

// idle GPU pause: stop stepping/rendering when the scene is fully at rest
// (renderPending + wakeRender are hoisted to the top of the module — init-time
//  callers like resize()/applyTheme() run before this point)
function simActive () {
  if (grabbed || confetti.length) return true
  if (ring.userData.animating || rainbow.userData.animating) return true
  for (const d of drops) if (d.active) return true
  for (const o of objects) {
    if (o.mesh.visible && o.body.sleepState !== CANNON.Body.SLEEPING) return true
  }
  return false
}

function tick () {
  requestAnimationFrame(tick)
  if (hidden) return
  const dt = Math.min(clock.getDelta(), 0.05)
  maybeFlop()
  if (renderPending <= 0 && !simActive()) return
  if (renderPending > 0) renderPending--
  updateGlide(dt)
  world.step(1 / 60, dt, 3)
  // while dragging, keep constraint-induced velocities sane
  if (grabbed) {
    const v = grabbed.body.velocity
    const s = v.length()
    if (s > 18) v.scale(18 / s, v)
  }
  for (const o of objects) {
    // safety net: anything that escapes the tray gets dropped back in
    const p = o.body.position
    if (o.mesh.visible && (p.y < -2 || p.x < bounds.xL - 1.2 || p.x > bounds.xR + 1.2 || p.z < bounds.zB - 1.2 || p.z > bounds.zF + 1.2)) {
      p.set((bounds.xL + bounds.xR) / 2, 5, (bounds.zB + bounds.zF) / 2)
      o.body.velocity.set(0, -1, 0)
      o.body.angularVelocity.set(0, 0, 0)
      o.body.wakeUp()
    }
    o.mesh.position.copy(o.body.position)
    o.mesh.quaternion.copy(o.body.quaternion)
  }
  updateCoffee(dt)
  updateConfetti(dt)
  updateRainbow(dt)
  updateHighlight(dt)
  if (!REDUCED) {
    const zoomOut = innerWidth / innerHeight < 0.9 ? 1.35 : 1
    camera.position.x = CAM_BASE.x * zoomOut + px * 0.35
    camera.position.z = CAM_BASE.z * zoomOut + py * 0.2
    camera.lookAt(0, 0, 0.2)
  }
  renderer.render(scene, camera)
}
tick()
dump(true)

// debug hook for automated testing
window.__jd = {
  seen,
  screenPos (id) {
    const o = objects.find(o => o.item.id === id)
    const v = new THREE.Vector3(o.body.position.x, o.body.position.y, o.body.position.z)
    v.project(camera)
    return { x: (v.x + 1) / 2 * innerWidth, y: (-v.y + 1) / 2 * innerHeight }
  },
  pos (id) {
    const o = objects.find(o => o.item.id === id)
    return { x: o.body.position.x, y: o.body.position.y, z: o.body.position.z }
  },
  state () {
    return {
      seen: Array.from(seen),
      completed,
      finalShown,
      renderPending,
      simActive: simActive(),
      gravity: { x: world.gravity.x, y: world.gravity.y, z: world.gravity.z },
    }
  },
}
