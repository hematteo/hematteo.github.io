import * as THREE from 'three'

export function createContactShadows (scene, objects) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d'), grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(0,0,0,.6)'); grad.addColorStop(0.4, 'rgba(0,0,0,.3)'); grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas)
  const geometry = new THREE.PlaneGeometry(1, 1)
  const shadows = objects.map(o => {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.5 }))
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.008
    scene.add(mesh)
    return { o, mesh }
  })
  return () => shadows.forEach(({ o, mesh }) => {
    const height = Math.max(0, o.body.position.y)
    mesh.visible = o.mesh.visible && height < 4
    mesh.position.set(o.body.position.x, 0.008, o.body.position.z)
    mesh.scale.setScalar(o.radius * (2 + height * 0.4))
    mesh.material.opacity = 0.65 / (1 + height * 2.5)
  })
}
