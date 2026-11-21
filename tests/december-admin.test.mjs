import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

const source = readFileSync(new URL('../src/admin/AdminApp.tsx', import.meta.url), 'utf8')
const helperSource = source.slice(source.indexOf('function getPackageCategory('), source.indexOf('function PackageCategoryBadge('))
const helpers = vm.runInNewContext(stripTypeScriptTypes(helperSource) + '\n({ getPackageCategory, getDefaultItemsDelivered, isDecemberPackage, hasReservedDecemberBonus, getItemsWithReservedBonuses, getDecemberBonusDeliveryText, getDecemberFulfillmentError })')
const bonus = 'Garuda of Eternity Wings'
const suffix = ` + ${bonus} (One-Time December $2,500 Bonus)`
const order = (overrides = {}) => ({
  server: 'v1', selected_package_id: 'december-supply-500', selected_package_title: 'DECEMBER PACKAGE',
  selected_package_amount: 500, package_quantity: 5, username: 'Player', status: 'approved',
  fulfillment_status: 'not_delivered', payment_verified_at: '2026-12-01T00:00:00Z',
  december_bonus_name: bonus, december_bonus_eligible: true, december_verified_total_usd: 2500,
  december_bonus_reserved_at: '2026-12-01T00:00:00Z', event_bonus_selections: [], ...overrides,
})

test('all five December tiers display their new category and one reserved reward per player', () => {
  for (const amount of [50, 100, 200, 500, 1000]) {
    const donation = order({ selected_package_id: `december-supply-${amount}`, selected_package_amount: amount })
    assert.equal(helpers.getPackageCategory(donation.selected_package_id), 'December Package')
    assert.equal(helpers.getItemsWithReservedBonuses(donation), 'DECEMBER PACKAGE ×5' + suffix)
    assert.match(helpers.getDecemberBonusDeliveryText(donation), /ELIGIBLE.*exactly one/)
  }
})

test('ineligible, rejected and unverified orders never suggest delivering Garuda', () => {
  for (const values of [
    { december_bonus_eligible: false }, { december_bonus_eligible: null },
    { payment_verified_at: null }, { status: 'rejected' },
    { server: 'v2' }, { selected_package_id: 'december-supply-2500' },
    { selected_package_id: 'november-supply-500' }, { selected_package_id: 'boosting-500' },
  ]) {
    const donation = order(values)
    assert.equal(helpers.hasReservedDecemberBonus(donation), false)
    assert(!helpers.getItemsWithReservedBonuses(donation, 'Custom items').includes(bonus))
    assert(!String(helpers.getDecemberBonusDeliveryText(donation)).startsWith('ELIGIBLE'))
  }
})

test('discounts and paid currency do not alter the verified reservation shown to admins', () => {
  for (const currency of ['USD', 'PHP', 'GBP']) {
    const donation = order({ amount: 2250, currency, discount_percent: 10, promo_code: 'PROMO' })
    assert.equal(helpers.getItemsWithReservedBonuses(donation), 'DECEMBER PACKAGE ×5' + suffix)
  }
})

test('revoked or duplicate generated bonus text is corrected in unfulfilled drafts', () => {
  assert.equal(helpers.getItemsWithReservedBonuses(order({ december_bonus_eligible: false }), 'Custom items' + suffix), 'Custom items')
  assert.equal(helpers.getItemsWithReservedBonuses(order({ status: 'rejected' }), 'Custom items' + suffix), 'Custom items')
  assert.equal(helpers.getItemsWithReservedBonuses(order(), 'Custom items' + suffix + suffix), 'Custom items' + suffix)
  assert.equal(helpers.getItemsWithReservedBonuses(order(), 'Custom Garuda of Eternity Wings delivery'), 'Custom Garuda of Eternity Wings delivery')
})

test('completed delivery evidence is unchanged even if eligibility or order status later changes', () => {
  const evidence = 'Original evidence' + suffix
  const donation = order({ fulfillment_status: 'delivered', december_bonus_eligible: false, status: 'rejected' })
  assert.equal(helpers.getItemsWithReservedBonuses(donation, evidence), evidence)
  assert.match(helpers.getDecemberBonusDeliveryText(order({ fulfillment_status: 'delivered' })), /^DELIVERED/)
})

test('December reward remains separate from existing selected event bundles', () => {
  const donation = order({ event_bonus_selections: [{ event_number: '001', quantity: 25 }] })
  assert.equal(helpers.getItemsWithReservedBonuses(donation), 'DECEMBER PACKAGE ×5 + Event Bonus: EVENT001 ×25' + suffix)
  assert.equal(helpers.getDecemberBonusDeliveryText(order({ selected_package_id: 'currency-500' })), null)
})

test('delivery requires a saved verified review and items matching the reserved reward', () => {
  for (const values of [{ payment_verified_at: null }, { december_bonus_eligible: null }, { status: 'rejected' }]) {
    assert.match(helpers.getDecemberFulfillmentError(order(values), 'Package' + suffix), /Save an approved, verified/)
  }
  assert.match(helpers.getDecemberFulfillmentError(order(), 'Package only'), /check the delivery items/)
  assert.match(helpers.getDecemberFulfillmentError(order({ december_bonus_eligible: false }), 'Package' + suffix), /check the delivery items/)
  assert.equal(helpers.getDecemberFulfillmentError(order(), 'Package' + suffix), null)
  assert.equal(helpers.getDecemberFulfillmentError(order({ december_bonus_eligible: false }), 'Package only'), null)
  assert.equal(helpers.getDecemberFulfillmentError(order({ selected_package_id: 'currency-500' }), 'Package only'), null)
})
