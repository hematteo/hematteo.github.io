import test from 'node:test'
import assert from 'node:assert/strict'
import { lightPath, inSpectrum, canPerch, windEligible } from './src/discovery-rules.js'
const bounds = { xL: -5, xR: 5, zB: -4, zF: 4 }
const source = { x: -2, y: 0, z: 0 }, prism = { x: 0, y: 0, z: 0 }
test('light must be on, close enough and on the same level', () => {
  assert.equal(lightPath(source, prism, bounds, false), null)
  assert.equal(lightPath({ ...source, x: -5 }, prism, bounds), null)
  assert.equal(lightPath({ ...source, y: 3 }, prism, bounds), null)
  assert.ok(lightPath(source, prism, bounds))
})
test('only paper inside the outgoing spectrum catches color', () => {
  const path = lightPath(source, prism, bounds)
  assert.equal(inSpectrum({ x: 2, y: 0.4, z: 0.2 }, path), true)
  for (const point of [{ x: -1, y: 0, z: 0 }, { x: 2, y: 0, z: 2 }, { x: 2, y: 4, z: 0 }, { x: 4, y: 0, z: 0 }]) {
    assert.equal(inSpectrum(point, path), false)
  }
})
test('spectrum stops at the drawer edge and works in every direction', () => {
  const path = lightPath({ x: 2, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, bounds)
  assert.ok(path.length <= 0.8)
  const rotated = lightPath({ x: 0, y: 0, z: 2 }, prism, bounds)
  assert.equal(inSpectrum({ x: 0.2, y: 0, z: -2 }, rotated), true)
})
test('perching requires colored paper, an upright mug and a gentle approach', () => {
  const plane = { x: 0.65, y: 0.5, z: 0 }, mug = { x: 0, y: 0, z: 0 }
  assert.equal(canPerch(plane, mug, 1, true, 0.2), true)
  assert.equal(canPerch(plane, mug, 1, false, 0.2), false)
  assert.equal(canPerch(plane, mug, 0.2, true, 0.2), false)
  assert.equal(canPerch(plane, mug, 1, true, 8), false)
  assert.equal(canPerch({ ...plane, y: 3 }, mug, 1, true, 0.2), false)
})

test('GPU updraft requires upright fans and paper inside the lift zone', () => {
  const gpu = { x: 0, y: 0, z: 0 }, plane = { x: 0.7, y: 0.5, z: 0 }
  assert.equal(windEligible(gpu, plane, 1), true)
  assert.equal(windEligible(gpu, plane, 0.2), false)
  assert.equal(windEligible(gpu, { ...plane, x: 3 }, 1), false)
  assert.equal(windEligible(gpu, { ...plane, y: 4 }, 1), false)
})
