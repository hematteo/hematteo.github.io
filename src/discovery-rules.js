// Shared geometry for visible light and interaction hit tests.
export function lightPath (source, prism, bounds, on = true) {
  const dx = prism.x - source.x, dz = prism.z - source.z
  const distance = Math.hypot(dx, dz)
  if (!on || distance < 0.45 || distance > 3.8 || Math.abs(source.y - prism.y) > 1.1) return null
  const ux = dx / distance, uz = dz / distance
  let length = 3.4
  for (const [p, u, lo, hi] of [[prism.x, ux, bounds.xL + 0.2, bounds.xR - 0.2], [prism.z, uz, bounds.zB + 0.2, bounds.zF - 0.2]]) {
    if (Math.abs(u) > 1e-6) length = Math.min(length, ((u > 0 ? hi : lo) - p) / u)
  }
  if (length < 0.6) return null
  return { x: prism.x, z: prism.z, ux, uz, length }
}

export function inSpectrum (point, path) {
  if (!path || point.y > 1.8) return false
  const dx = point.x - path.x, dz = point.z - path.z
  const along = dx * path.ux + dz * path.uz
  const across = Math.abs(dx * -path.uz + dz * path.ux)
  return along > 0.35 && along < path.length && across < 0.18 + along * 0.25
}

export function canPerch (plane, mug, upright, colored, speed) {
  return colored && upright > 0.8 && Math.hypot(plane.x - mug.x, plane.z - mug.z) < 0.95 &&
    Math.abs(plane.y - mug.y) < 1.3 && speed < 3
}

export function windEligible (gpu, plane, upright) {
  return upright > 0.7 && Math.hypot(plane.x - gpu.x, plane.z - gpu.z) < 1.6 &&
    plane.y - gpu.y > -0.3 && plane.y - gpu.y < 2.2
}

export function reflectedRay (source, mirror, normal) {
  const dx = mirror.x - source.x, dz = mirror.z - source.z
  const d = Math.hypot(dx, dz), n = Math.hypot(normal.x, normal.z)
  if (d < 0.1 || n < 0.1) return null
  const x = dx / d, z = dz / d, nx = normal.x / n, nz = normal.z / n
  const dot = x * nx + z * nz
  return { x: x - 2 * dot * nx, z: z - 2 * dot * nz }
}
export function rayHit (origin, ray, center, radius) {
  const dx = center.x - origin.x, dz = center.z - origin.z
  const along = dx * ray.x + dz * ray.z
  const across2 = dx * dx + dz * dz - along * along
  if (along <= 0 || across2 > radius * radius) return null
  return Math.max(0.05, along - Math.sqrt(Math.max(0, radius * radius - across2)))
}
