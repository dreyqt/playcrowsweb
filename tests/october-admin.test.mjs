import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

// Execute the actual admin fulfillment helpers without React, a browser or services.
const source = readFileSync(new URL('../src/admin/AdminApp.tsx', import.meta.url), 'utf8')
const helperSource = source.slice(source.indexOf('function getPackageCategory('), source.indexOf('function PackageCategoryBadge('))
assert.ok(helperSource.length > 0, 'Admin fulfillment helpers must remain available to exercise')
const helpers = vm.runInNewContext(stripTypeScriptTypes(helperSource) + `
  ({ getPackageCategory, getPackageEventBonusName, getItemsWithReservedBonuses,
     getOctoberBonusDeliveryText, getEventBonusDeliveryText, buildFulfillmentNotes })
`)

const tiger = 'The White Tiger of Manouille I'
const griffin = "Balian's Battle Griffin"
const special = "Nureddin's Red Death"
const verifiedAt = '2026-10-01T00:00:00Z'

test('reopening an undelivered order merges newly reserved mounts into saved fulfillment text', () => {
  const start = source.indexOf('const openDonation = ')
  const openSource = source.slice(start, source.indexOf('\n  useEffect(', start))
  const captured = {}
  const sandbox = { record: donation({
    items_delivered: 'Custom delivery details', fulfillment_status: 'not_delivered',
    event_bonus_eligible: true, october_bonus_eligible: true,
  }) }
  for (const name of ['Selected', 'Notes', 'Status', 'PaypalTransactionId', 'PaymentVerified', 'DeliveredTo', 'ItemsDelivered', 'FulfillmentNotes', 'FulfillmentEvidence', 'SaveMessage', 'BlockMessage']) {
    sandbox[`set${name}`] = value => { captured[name] = value }
  }
  vm.runInNewContext(stripTypeScriptTypes(helperSource + '\n' + openSource) + '\nopenDonation(record)', sandbox)
  assert.ok(captured.ItemsDelivered.startsWith('Custom delivery details'))
  assert.ok(captured.ItemsDelivered.includes(griffin))
  assert.ok(captured.ItemsDelivered.includes(special))
  assert.equal(helpers.getItemsWithReservedBonuses(sandbox.record, captured.ItemsDelivered), captured.ItemsDelivered, 'Reopening must not duplicate mount names')
  sandbox.record.fulfillment_status = 'delivered'
  vm.runInNewContext(stripTypeScriptTypes(helperSource + '\n' + openSource) + '\nopenDonation(record)', { ...sandbox })
  assert.equal(captured.ItemsDelivered, 'Custom delivery details', 'Delivered evidence stays as saved')
})

function donation(overrides = {}) {
  return {
    selected_package_id: 'october-supply-1000', selected_package_title: 'OCTOBER PACKAGE',
    selected_package_amount: 1000, package_quantity: 2, username: 'Character',
    payment_verified_at: verifiedAt, event_bonus_name: null, event_bonus_eligible: null,
    october_bonus_name: null, october_bonus_eligible: null, october_verified_total_usd: null,
    event_bonus_selections: [{ event_number: '001', quantity: 2, title: 'Existing event reward', rewards: [] }],
    ...overrides,
  }
}

test('admin category labels include October and preserve historical categories', () => {
  const cases = [
    ['october-supply-50', 'October Package'], ['october-supply-1000', 'October Package'],
    ['september-supply-500', 'September Supply Package'], ['august-supply-500', 'August Supply Package'],
    ['currency-100', 'Currency'], ['support-skill-bundle', 'Support Package'], [null, 'Legacy'],
  ]
  for (const [id, expected] of cases) assert.equal(helpers.getPackageCategory(id), expected)
})

test('the admin maps only the eligible October tiers to the correct package mounts', () => {
  assert.equal(helpers.getPackageEventBonusName('october-supply-500'), tiger)
  assert.equal(helpers.getPackageEventBonusName('october-supply-1000'), griffin)
  for (const id of ['october-supply-50', 'october-supply-100', 'support-class-change-500', null]) {
    assert.equal(helpers.getPackageEventBonusName(id), null)
  }
})

test('pending and declined reservations never enter the items-to-deliver default', () => {
  for (const packageEligible of [null, false]) {
    for (const cumulativeEligible of [null, false]) {
      const items = helpers.getItemsWithReservedBonuses(donation({
        event_bonus_eligible: packageEligible, october_bonus_eligible: cumulativeEligible,
        october_verified_total_usd: 5000,
      }))
      assert.doesNotMatch(items, /White Tiger|Battle Griffin|Red Death|One-Time/)
      assert.match(items, /OCTOBER PACKAGE ×2/)
      assert.match(items, /Event Bonus: EVENT001 ×2/)
    }
  }
})

test('both reserved mounts enter fulfillment once regardless of package quantity', () => {
  for (const [amount, packageMount] of [[500, tiger], [1000, griffin]]) {
    const record = donation({
      selected_package_id: `october-supply-${amount}`, selected_package_amount: amount,
      package_quantity: 5, event_bonus_eligible: true, october_bonus_eligible: true,
    })
    const items = helpers.getItemsWithReservedBonuses(record)
    assert.equal(items.split(packageMount).length - 1, 1)
    assert.equal(items.split(special).length - 1, 1)
    assert.match(items, /OCTOBER PACKAGE ×5/)
    const notes = helpers.buildFulfillmentNotes(record, 'Recipient', items)
    assert.ok(notes.includes(packageMount))
    assert.ok(notes.includes(special))
  }
})

test('a newly reached cumulative bonus survives an already-claimed package mount', () => {
  const record = donation({ event_bonus_eligible: false, october_bonus_eligible: true, october_verified_total_usd: 2000 })
  const items = helpers.getItemsWithReservedBonuses(record)
  assert.ok(items.includes(special))
  assert.ok(!items.includes(griffin))
  assert.match(helpers.getEventBonusDeliveryText(record), /ALREADY CLAIMED/)
  assert.doesNotMatch(helpers.getEventBonusDeliveryText(record), /Fulfill only the normal package rewards/)
  assert.match(helpers.getOctoberBonusDeliveryText(record), /ELIGIBLE.*Grant exactly once/)
})

test('package mount eligibility also remains independent of cumulative eligibility', () => {
  const items = helpers.getItemsWithReservedBonuses(donation({ event_bonus_eligible: true, october_bonus_eligible: false }))
  assert.ok(items.includes(griffin))
  assert.ok(!items.includes(special))
  const thresholdOnly = helpers.getItemsWithReservedBonuses(donation({
    selected_package_id: 'october-supply-50', selected_package_amount: 50,
    event_bonus_eligible: null, october_bonus_eligible: true,
  }))
  assert.ok(thresholdOnly.includes(special))
  assert.ok(!thresholdOnly.includes(griffin))
})

test('cumulative status distinguishes unverified, under threshold, awarded and prior reservation', () => {
  const pending = helpers.getOctoberBonusDeliveryText(donation({ payment_verified_at: null }))
  assert.match(pending, /Save payment verification/)
  assert.doesNotMatch(pending, /ELIGIBLE|Grant exactly once/)
  const unpaidWithOldReservation = helpers.getOctoberBonusDeliveryText(donation({ payment_verified_at: null, october_bonus_eligible: true }))
  assert.match(unpaidWithOldReservation, /Save payment verification/)
  assert.match(helpers.getOctoberBonusDeliveryText(donation({ october_bonus_eligible: false, october_verified_total_usd: '1950' })), /\$1,950 \/ \$2,000.*not due/)
  assert.match(helpers.getOctoberBonusDeliveryText(donation({ october_bonus_eligible: true, october_verified_total_usd: 2000 })), /ELIGIBLE.*Grant exactly once/)
  assert.match(helpers.getOctoberBonusDeliveryText(donation({ october_bonus_eligible: false, october_verified_total_usd: '3000' })), /ALREADY RESERVED.*Do not grant again/)
  assert.equal(helpers.getOctoberBonusDeliveryText(donation({ selected_package_id: 'september-supply-1000' })), null)
})

test('September fulfillment still uses its original weapon-style rewards', () => {
  for (const [amount, bonus] of [[500, 'Rare Monster Weapon Style SET'], [1000, 'Epic Monster Weapon Style']]) {
    const record = donation({
      selected_package_id: `september-supply-${amount}`, selected_package_title: 'SEPTEMBER SUPPLY PACKAGE',
      selected_package_amount: amount, event_bonus_eligible: true,
    })
    assert.equal(helpers.getPackageEventBonusName(record.selected_package_id), bonus)
    assert.ok(helpers.getItemsWithReservedBonuses(record).includes(bonus))
    assert.ok(!helpers.getItemsWithReservedBonuses(record).includes(special))
    assert.match(helpers.getEventBonusDeliveryText(record), /ELIGIBLE/)
  }
})

test('every explicit admin donation read includes package and cumulative reservation fields', () => {
  const selects = [...source.matchAll(/\.select\(\s*'([^']+)'\s*\)/g)]
    .map(match => match[1])
    .filter(fields => fields.includes('reference_code'))
  assert.equal(selects.length, 2, 'Inspect new explicit donation select paths when adding them')
  const required = ['event_bonus_name', 'event_bonus_eligible', 'event_bonus_reserved_at',
    'october_bonus_name', 'october_bonus_eligible', 'october_verified_total_usd', 'october_bonus_reserved_at']
  for (const fields of selects) {
    const selected = new Set(fields.split(',').map(field => field.trim()))
    for (const field of required) assert.ok(selected.has(field), `${field} must be loaded`)
  }
})
