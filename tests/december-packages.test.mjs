import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

// Independent transcription of the requested December $50/$100/$200/$500/$1,000 table.
// The $200 accessory chest is 300; the older November correction does not apply here.
const amounts = [50, 100, 200, 500, 1000]
const expectedRewards = [
  ['Diamond', [180000, 400000, 900000, 3500000, 9000000]],
  ['Mileage', [90000, 175000, 350000, 1000000, 2500000]],
  ['Contribution Coin', [10000, 30000, 60000, 350000, 1000000]],
  ["Star's Memory (Bound)", [750, 1500, 3000, 5000, 10000]],
  ['Party Dungeon Raid Ticket', [20, 45, 95, 200, null]],
  ['Party Dungeon Raid Ticket (Bound)', [null, null, null, null, 500]],
  ['Morion (Bound)', [35000, 75000, 150000, 400000, 900000]],
  ['Time Recharger - Masarta Special Dungeon (Bound)', [60, 175, 350, 1000, 2500]],
  ['Time Charging Device - Harpenon Sanctum (Attribution)', [100, 225, 600, 1250, 3500]],
  ["Guardian's Scepter (Attribution)", [3000, 12500, 30000, 150000, 400000]],
  ['Crusade Loot Chest (Attributed)', [25, 60, 130, 400, 1250]],
  ['Total War Supply Crates (Attributed)', [150, 500, 1000, 4000, 10000]],
  ["Forgotten One's Remnant Selection Chest (Bound)", [8, 15, 30, 100, 300]],
  ['[L] Weapon Style Summon Challenge Ticket (Bound)', [230, 450, 900, 2250, 5000]],
  ['[L] Mount Summon Challenge Ticket (Bound)', [230, 450, 900, 2250, 5000]],
  ['Element Extraction of Fusion x11 (Attribution)', [225, 430, 850, 3500, 8000]],
  ["Eligio's Stimulant of EXP (Bound)", [150, 250, 500, 1500, 5000]],
  ["Night Crow's Stimulant of Growth (Bound)", [150, 250, 500, 1500, 5000]],
  ['Night Crows Blessing Stimulant of Growth (Bound)', [1, 3, 7, 15, 30]],
  ['Torn Invoices (Attribution)', [250, 500, 1000, 3000, 7000]],
  ['Torn Seniority Letter (Attribution)', [250, 500, 1000, 3000, 7000]],
  ['Brilliant Refinement Stone Selection Chest (Bound)', [1250, 2500, 5000, 20000, 50000]],
  ['Shining Armor Enhancement Scroll Chest (Bound)', [550, 1250, 3000, 15000, 35000]],
  ['Shining Weapon Enhancement Scroll Chest (Bound)', [550, 1250, 3000, 15000, 35000]],
  ['Shining Accessory Enhancement Scroll Chest (Bound)', [550, 1250, 300, 15000, 35000]],
  ['Brilliant Enhancement Scroll Selection Chest (Bound)', [75, 150, 300, 1000, 2500]],
  ['Pitch-black Enhancement Scroll Selection Chest (Bound)', [75, 150, 300, 1000, 2500]],
  ['Spell Rune Crystal I (Bound)', [3500, 8000, 17500, 45000, 100000]],
  ['Spell Starlight Crystal I (Bound)', [2300, 8000, 17500, 45000, 100000]],
  ['Enchantment Frost Crystal I (Attributed)', [3500, 8000, 17500, 45000, 100000]],
  ['[UC] Crafting Material Selection Chest (Bound)', [1300, 1500, 3000, 7500, 15000]],
  ['[C] Crafting Material x40 Selection Chest (Bound)', [1300, 1500, 3000, 7500, 15000]],
  ['[R] Arcane Scroll Selection Chest (Bound)', [1300, 1500, 3000, 7500, 15000]],
  ['Wind Orb Chest (Attributed)', [30, 75, 150, 250, 500]],
  ['Metal Fragment (Bound)', [25000, 60000, 125000, 300000, 750000]],
  ["Master's Aircraft Toolbox (Bound)", [50, 100, 200, 500, 1500]],
  ['Golden Necklace Insignia (Attributed)', [null, null, null, 8, 16]],
  ['Golden Ring Insignia (Attribution)', [null, null, null, 16, 32]],
  ['Phoeneia of the Sun', [null, null, 1, null, null]],
  ['Levatos of Tidal Waves', [null, null, null, 1, null]],
  ['Auroral Albanion', [null, null, null, 1, null]],
  ['Stymphalox of Steel', [null, null, null, null, 1]],
  ['Mantikar of Nebula', [null, null, null, null, 1]],
]

function loadSource(path, names) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace(/^export /gm, '')
  const sandbox = {}
  vm.runInNewContext(stripTypeScriptTypes(source) + `\nglobalThis.result = { ${names.join(', ')} };`, sandbox)
  return sandbox.result
}

const plain = value => JSON.parse(JSON.stringify(value))
const { getGiftPackages, findGiftPackage, getHistoricalGiftPackages, findHistoricalGiftPackage } = loadSource(
  'src/giftPackageData.ts',
  ['getGiftPackages', 'findGiftPackage', 'getHistoricalGiftPackages', 'findHistoricalGiftPackage'],
)

for (const [index, amount] of amounts.entries()) {
  test(`December $${amount} contains every requested reward and exact quantity`, () => {
    const item = findGiftPackage('v1', `december-supply-${amount}`)
    assert.ok(item)
    assert.equal(item.title, 'DECEMBER PACKAGE')
    assert.equal(item.category, 'december-supply')
    assert.equal(item.amount, amount)
    assert.equal(item.isNew, true)
    assert.equal(item.oneTimeEventBonus, undefined, 'Package contents repeat; Garuda is a separate cumulative reward')
    const expected = expectedRewards.filter(([, values]) => values[index] !== null)
      .map(([name, values]) => [name, values[index]]).sort(([a], [b]) => a.localeCompare(b))
    const actual = plain(item.rewards).map(({ name, quantity }) => [name, quantity])
      .sort(([a], [b]) => a.localeCompare(b))
    assert.deepEqual(actual, expected)
    assert.equal(new Set(item.rewards.map(reward => reward.name)).size, item.rewards.length, 'No duplicate reward rows')
    assert.ok(item.rewards.every(reward => Number.isSafeInteger(reward.quantity) && reward.quantity > 0))
    assert.strictEqual(findHistoricalGiftPackage('v1', item.id), item, 'Current orders also resolve through historical lookup')
  })
}

test('December has exactly five V1 tiers, including named bonuses and Metal Fragments', () => {
  const december = getGiftPackages('v1').filter(item => item.category === 'december-supply')
  assert.deepEqual(plain(december.map(item => item.amount)), amounts)
  assert.deepEqual(plain(december.map(item => item.rewards.length)), [35, 35, 36, 39, 39])
  assert.equal(december.reduce((total, item) => total + item.rewards.length, 0), 184)
  assert.equal(getGiftPackages('v2').some(item => item.category === 'december-supply'), false)
  for (const amount of amounts) {
    assert.equal(findGiftPackage('v2', `december-supply-${amount}`), null)
    assert.equal(findHistoricalGiftPackage('v2', `december-supply-${amount}`), null)
  }
})

test('retired monthly packages cannot be purchased but retain their historical reward contents', () => {
  for (const server of ['v1', 'v2']) {
    const current = getGiftPackages(server)
    const historical = getHistoricalGiftPackages(server)
    const categories = [...new Set(current.map(item => item.category))].sort()
    assert.deepEqual(plain(categories), server === 'v1'
      ? ['boosting', 'currency', 'december-supply', 'support']
      : ['boosting', 'currency', 'support'])
    assert.equal(new Set(current.map(item => item.id)).size, current.length)
    assert.equal(new Set(historical.map(item => item.id)).size, historical.length)
    for (const prefix of ['september', 'october', 'november']) {
      for (const amount of amounts) {
        const id = `${prefix}-supply-${amount}`
        assert.equal(findGiftPackage(server, id), null)
        const existed = prefix === 'november' ? server === 'v1' : amount !== 200
        const archived = findHistoricalGiftPackage(server, id)
        if (existed) {
          assert.ok(archived, `${server}/${id} historical record`)
          assert.ok(archived.rewards.length > 0)
        } else {
          assert.equal(archived, null, `${server}/${id} was never offered`)
        }
      }
    }
    assert.equal(findGiftPackage(server, null), null)
    assert.equal(findHistoricalGiftPackage(server, 'not-a-package'), null)
  }
})

test('the separate $1,500 Garuda milestone is never sold as an ordinary package or included reward', () => {
  for (const server of ['v1', 'v2']) {
    for (const item of getGiftPackages(server)) {
      assert.doesNotMatch(item.id, /garuda|december.*(?:1500|2500)/i)
      assert.doesNotMatch(item.title, /Garuda/i)
      assert.equal(item.rewards.some(reward => /Garuda/i.test(reward.name)), false)
    }
  }
})
