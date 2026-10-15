import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

const catalog = readFileSync(new URL('../src/giftPackageData.ts', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace(/^export /gm, '')
const source = readFileSync(new URL('../src/admin/AdminApp.tsx', import.meta.url), 'utf8')
const helperSource = source.slice(source.indexOf('function getPackageCategory('), source.indexOf('function PackageCategoryBadge('))
const helpers = vm.runInNewContext(stripTypeScriptTypes(catalog + '\n' + helperSource) +
  '\n({ getPackageCategory, getDefaultItemsDelivered, getBoostingBonusRewards, getCumulativeCreditUsd, getItemsWithReservedBonuses })')
const order = (overrides = {}) => ({
  server: 'v2', selected_package_id: 'boosting-1000', selected_package_title: 'BOOSTING PACKAGE',
  selected_package_amount: 1000, package_quantity: 2, amount: 2000,
  cumulative_credit_usd: null, boosting_bonus_rewards: null,
  fulfillment_status: 'not_delivered', event_bonus_selections: [], ...overrides,
})

test('admin separates V2 credit from payment and keeps non-boosting/V1 face value', () => {
  const v2 = order()
  assert.equal(helpers.getCumulativeCreditUsd(v2), 4000)
  assert.equal(v2.amount, 2000)
  assert.equal(helpers.getCumulativeCreditUsd(order({ server: 'v1' })), 2000)
  assert.equal(helpers.getCumulativeCreditUsd(order({ selected_package_id: 'october-supply-1000' })), 2000)
  assert.equal(helpers.getPackageCategory('boosting-50'), 'Boosting Package')
})

test('admin uses persisted credit and bonus snapshots for historical accuracy', () => {
  const record = order({ cumulative_credit_usd: '2000', boosting_bonus_rewards: [{ name: 'Recorded bonus', quantity: 7 }] })
  assert.equal(helpers.getCumulativeCreditUsd(record), 2000)
  assert.equal(helpers.getBoostingBonusRewards(record)[0].quantity, 7)
  assert.match(helpers.getDefaultItemsDelivered(record), /Recorded bonus ×7/)
  assert.equal(helpers.getItemsWithReservedBonuses(order({ fulfillment_status: 'delivered' }), 'Original evidence'), 'Original evidence')
})

test('all nine weapons are included once per $1000 unit, no selection or accessory stacking', () => {
  for (const server of ['v1', 'v2']) {
    const record = order({ server })
    const rewards = helpers.getBoostingBonusRewards(record)
    assert.equal(rewards.length, 9)
    assert.equal(new Set(rewards.map(reward => reward.name)).size, 9)
    assert.ok(rewards.every(reward => reward.quantity === 2))
    const delivery = helpers.getDefaultItemsDelivered(record)
    for (const reward of rewards) assert.ok(delivery.includes(`${reward.name} ×2`))
    assert.doesNotMatch(delivery, /Insignia|choose|choice/i)
  }
})

test('accessory materials scale only with $500 package quantity', () => {
  const rewards = helpers.getBoostingBonusRewards(order({ selected_package_id: 'boosting-500', selected_package_amount: 500, package_quantity: 3 }))
  assert.equal(rewards.length, 2)
  assert.ok(rewards.every(reward => reward.quantity === 12))
  for (const id of ['boosting-50', 'boosting-200', 'support-500']) {
    assert.equal(helpers.getBoostingBonusRewards(order({ selected_package_id: id })).length, 0)
  }
})
