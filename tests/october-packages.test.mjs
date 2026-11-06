import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

// Independent fixture transcribed from the user's revised October package lists.
// All checkout requests are handled by local mocks; these tests never charge a buyer.
const amounts = [50, 100, 500, 1000]
const rewardsByTier = [
  ['Diamond', [175000, 280000, 2800000, 6500000]],
  ['Mileage', [30000, 70000, 300000, 600000]],
  ['Contribution Coin', [null, null, 150000, 500000]],
  ['Crusade Loot Chest (Attributed)', [5, 12, 100, 250]],
  ['Total War Supply Crates (Attributed)', [75, 175, 1000, 2500]],
  ["Guardian's Scepter (Attribution)", [null, 2000, 15000, 40000]],
  ['Brilliant Refinement Stone Selection Chest (Bound)', [100, 300, 5000, 15000]],
  ["Star's Memory (Bound)", [null, null, 1500, 4500]],
  ['Torn Invoices (Attribution)', [50, 150, 2000, 5000]],
  ['Torn Seniority Letter (Attribution)', [50, 150, 2000, 5000]],
  ['Party Dungeon Raid Ticket (Bound)', [10, 25, 100, 250]],
  ['Time Charging Device - Harpenon Sanctum (Attribution)', [null, 50, 300, 1000]],
  ['Time Recharger - Masarta Special Dungeon (Bound)', [50, 125, 500, 1500]],
  ['Night Crows Blessing Stimulant of Growth (Bound)', [null, null, 5, 10]],
  ['Wind Orb Chest (Attributed)', [null, 20, null, null]],
  ['Shining Armor Enhancement Scroll Chest (Bound)', [100, 200, 1000, 2500]],
  ['Shining Weapon Enhancement Scroll Chest (Bound)', [100, 200, 1000, 2500]],
  ['Shining Accessory Enhancement Scroll Chest (Bound)', [100, 200, 1000, 2500]],
  ['Spell Rune Crystal I (Bound)', [500, 1500, 12000, 30000]],
  ['Spell Starlight Crystal I (Bound)', [500, 1500, 12000, 30000]],
  ['Enchantment Frost Crystal I (Attributed)', [500, 1500, 12000, 30000]],
]

function loadSource(path, names, overrides = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '')
    .replace(/^export default /gm, 'const app = ')
    .replace(/^export /gm, '')
  const sandbox = {
    Date, Request, Response, btoa, crypto,
    console: { error() {}, warn() {}, log() {} },
    Deno: { env: { get: () => 'local-test-value' } },
    withSupabase: (_config, handler) => handler,
    fetch: async () => assert.fail('Unexpected external request'),
    ...overrides,
  }
  vm.runInNewContext(stripTypeScriptTypes(source) + `\nglobalThis.result = { ${names.join(', ')} };`, sandbox)
  return sandbox.result
}

const { getGiftPackages } = loadSource('src/giftPackageData.ts', ['getGiftPackages'])
const plain = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
const normalizeName = name => name

for (const server of ['v1', 'v2']) {
  for (const [index, amount] of amounts.entries()) {
    test(`${server} $${amount} October package contains every requested item and exact quantity`, () => {
      const packages = getGiftPackages(server)
      const matches = packages.filter(item => item.id === `october-supply-${amount}`)
      assert.equal(matches.length, 1, 'Exactly one October package must exist for this tier')
      const item = matches[0]
      assert.equal(item.category, 'october-supply')
      assert.equal(item.amount, amount)
      assert.match(item.title, /OCTOBER.*PACKAGE/i)
      const expected = rewardsByTier
        .filter(([, quantities]) => quantities[index] !== null)
        .map(([name, quantities]) => [normalizeName(name), quantities[index]])
        .sort(([a], [b]) => a.localeCompare(b))
      const actual = plain(item.rewards)
        .map(reward => [normalizeName(reward.name), reward.quantity])
        .sort(([a], [b]) => a.localeCompare(b))
      assert.deepEqual(actual, expected)
    })
  }
}

test('merged V1 shop adds November while preserving legacy categories and historical V2 catalog', () => {
  const categories = server => [...new Set(plain(getGiftPackages(server)).map(item => item.category))].sort()
  assert.deepEqual(categories('v1'), ['boosting', 'currency', 'november-supply', 'october-supply', 'september-supply', 'support'])
  assert.deepEqual(categories('v2'), ['boosting', 'currency', 'october-supply', 'september-supply', 'support'])
  for (const server of ['v1', 'v2']) {
    assert.equal(getGiftPackages(server).some(item => item.id.startsWith('august-supply-')), false)
    assert.equal(getGiftPackages(server).filter(item => item.category === 'september-supply').length, 4)
  }
})

test('all four October packages keep their 73 reward entries without mount bonuses', () => {
  for (const server of ['v1', 'v2']) {
    const october = getGiftPackages(server).filter(item => item.category === 'october-supply')
    assert.equal(october.length, 4)
    assert.equal(october.reduce((count, item) => count + item.rewards.length, 0), 73)
    for (const item of october) {
      assert.equal(item.oneTimeEventBonus, undefined)
    }
  }
})

test('all six October translations keep category labels and remove the mount promotion', () => {
  const { octoberTranslations } = loadSource('src/octoberTranslations.ts', ['octoberTranslations'])
  assert.equal(Object.keys(octoberTranslations).length, 6)
  for (const [locale, translation] of Object.entries(octoberTranslations)) {
    for (const field of ['octoberPackages', 'octoberPackage', 'octoberPackagesDesc']) {
      assert.ok(translation[field].trim(), `${locale}: ${field}`)
    }
    for (const field of ['octoberBonusTitle', 'octoberBonusPackages', 'octoberBonusRule', 'octoberBonusOnly', 'newMount']) {
      assert.equal(translation[field], undefined, `${locale}: ${field}`)
    }
    assert.doesNotMatch(JSON.stringify(translation), /White Tiger|Battle Griffin|Red Death/, locale)
  }
})

test('checkout and submission accept every displayed package with the displayed title and price', () => {
  for (const name of ['paypal-checkout', 'submit-donation', 'recover-paypal-payment']) {
    const { GIFT_PACKAGES_BY_SERVER: catalogs } = loadSource(`supabase/edgefunction/${name}/index.ts`, ['GIFT_PACKAGES_BY_SERVER'])
    for (const server of ['v1', 'v2']) {
      for (const item of getGiftPackages(server)) {
        assert.deepEqual(plain(catalogs[server][item.id]), { title: item.title, amount: item.amount }, `${name}: ${server}/${item.id}`)
      }
      if (name !== 'recover-paypal-payment') {
        assert.deepEqual(Object.keys(catalogs[server]).sort(), plain(getGiftPackages(server)).map(item => item.id).sort(), `${name}: reject retired or unknown packages`)
      }
    }
  }
})

test('PayPal creates October orders for the merged V1 shop and respects package quantities', async () => {
  for (const server of ['v1']) {
    for (const amount of amounts) {
      const orders = []
      const { app } = loadSource('supabase/edgefunction/paypal-checkout/index.ts', ['app'], {
        fetch: async (url, options) => {
          if (String(url).endsWith('/v1/oauth2/token')) return Response.json({ access_token: 'mock-token' })
          assert.match(String(url), /\/v2\/checkout\/orders$/)
          orders.push(JSON.parse(options.body))
          return Response.json({ id: 'LOCALORDER123', status: 'CREATED' })
        },
      })
      const response = await app.fetch(new Request('https://local.test/checkout', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', server, selectedPackageId: `october-supply-${amount}`, packageQuantity: 2, playerId: 'LOCAL-PLAYER', username: 'Local Hero' }),
      }))
      assert.equal(response.status, 200, `${server} $${amount}`)
      assert.equal((await response.json()).amount, (amount * 2).toFixed(2))
      assert.equal(orders.length, 1)
      assert.equal(orders[0].purchase_units[0].amount.value, (amount * 2).toFixed(2))
      assert.match(orders[0].purchase_units[0].description, new RegExp(`OCTOBER.*PACKAGE ×2 \\| PlayCrows ${server.toUpperCase()}`))
    }
  }
})

test('retired August packages are rejected before contacting PayPal', async () => {
  const { app } = loadSource('supabase/edgefunction/paypal-checkout/index.ts', ['app'])
  for (const server of ['v1']) {
    for (const amount of amounts) {
      const response = await app.fetch(new Request('https://local.test/checkout', {
        method: 'POST', body: JSON.stringify({ action: 'create', server, selectedPackageId: `august-supply-${amount}`, packageQuantity: 1, playerId: 'LOCAL-PLAYER', username: 'Local Hero' }),
      }))
      assert.equal(response.status, 400)
      assert.match((await response.json()).error, /Invalid support package/)
    }
  }
})

test('payment recovery identifies the exact October tier and quantity from its captured value', () => {
  const { inferPackage } = loadSource('supabase/edgefunction/recover-paypal-payment/index.ts', ['inferPackage'])
  for (const server of ['v1', 'v2']) {
    for (const amount of amounts) {
      const item = getGiftPackages(server).find(item => item.id === `october-supply-${amount}`)
      for (const quantity of [1, 2, 5]) {
        const inferred = inferPackage(server, item.title, quantity, amount * quantity)
        assert.equal(inferred?.id, item.id)
        assert.equal(inferred?.amount, amount)
        assert.equal(inferred?.discountPercent, 0)
      }
    }
  }
})
