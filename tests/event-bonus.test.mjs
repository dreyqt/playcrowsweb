import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

// Exercise the shipped business rules without connecting to Supabase.
const source = readFileSync(new URL('../src/eventBonus.ts', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '')
  .replace(/^export /gm, '')
const rules = vm.runInNewContext(stripTypeScriptTypes(source) +
  '\n({ getEventBonusEntitlement, isEventBonusSelectionValid })')
const { getEventBonusEntitlement: entitlement, isEventBonusSelectionValid: valid } = rules
const catalog = Array.from({ length: 7 }, (_, index) => ({
  eventNumber: String(index + 1).padStart(3, '0'), title: `Reward ${index + 1}`, rewards: ['Example item'],
}))

test('each full $100 of package value earns one choice, including package quantities', () => {
  for (const [amount, quantity, expected] of [[20, 1, 0], [99, 1, 0], [100, 1, 1], [199, 1, 1], [500, 1, 5], [100, 5, 5], [20, 5, 1]]) {
    assert.equal(entitlement(amount, quantity), expected)
  }
  assert.equal(entitlement(null, 1), 0)
})

test('$500 allows five repeated or mixed bundles and rejects too few or too many', () => {
  assert.equal(valid('v1', 5, { '001': 5 }, catalog), true)
  assert.equal(valid('v1', 5, { '001': 2, '002': 3 }, catalog), true)
  assert.equal(valid('v1', 5, { '001': 4 }, catalog), false)
  assert.equal(valid('v1', 5, { '001': 6 }, catalog), false)
})

test('only the selected server catalog may be used', () => {
  assert.equal(valid('v1', 1, { '007': 1 }, catalog), true)
  assert.equal(valid('v2', 1, { '006': 1 }, catalog.slice(0, 6)), true)
  assert.equal(valid('v2', 1, { '007': 1 }, catalog), false)
  assert.equal(valid('v1', 1, { '008': 1 }, catalog), false)
  assert.equal(valid('v1', 1, { '1': 1 }, catalog), false)
})

test('missing catalogs and malformed counts block continuation and submission', () => {
  assert.equal(valid('v1', 1, { '001': 1 }, []), false)
  assert.equal(valid('v1', 1, { '001': 1 }, catalog.slice(0, 6)), false)
  assert.equal(valid('v1', 1, { '001': 1, '002': -1 }, catalog), false)
  assert.equal(valid('v1', 1, { '001': 0.5, '002': 0.5 }, catalog), false)
  assert.equal(valid('v1', 1, { '001': '1' }, catalog), false)
  assert.equal(valid('v1', 1, { '001': Infinity }, catalog), false)
})

test('purchases below $100 continue without a catalog and cannot retain old rewards', () => {
  assert.equal(valid('v1', 0, {}, []), true)
  assert.equal(valid('v2', 0, {}, []), true)
  assert.equal(valid('v1', 0, { '001': 1 }, catalog), false)
})
