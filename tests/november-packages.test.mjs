import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

// Independent item-by-item transcription of the November list: $50/$100/$200/$500/$1,000.
// The user corrected the $200 accessory enhancement chest quantity to 3,000.
const amounts = [50, 100, 200, 500, 1000]
const expectedRewards = [
  ['Diamond', [180000, 400000, 900000, 3500000, 9000000]],
  ['Mileage', [35000, 125000, 250000, 700000, 2000000]],
  ['Contribution Coin', [10000, 30000, 60000, 350000, 1000000]],
  ["Star's Memory (Bound)", [750, 1500, 3000, 3000, 5000]],
  ['Party Dungeon Raid Ticket', [20, 45, 95, 200, null]],
  ['Party Dungeon Raid Ticket (Bound)', [null, null, null, null, 500]],
  ['Morion (Bound)', [20000, 50000, 100000, 250000, 500000]],
  ['Time Recharger - Masarta Special Dungeon (Bound)', [60, 175, 350, 900, 2000]],
  ['Time Charging Device - Harpenon Sanctum (Attribution)', [100, 225, 450, 1000, 3000]],
  ["Guardian's Scepter (Attribution)", [3000, 12500, 25000, 100000, 300000]],
  ['Crusade Loot Chest (Attributed)', [15, 50, 100, 350, 1000]],
  ['Total War Supply Crates (Attributed)', [150, 500, 1000, 4000, 10000]],
  ["Forgotten One's Remnant Selection Chest (Bound)", [8, 15, 30, 100, 300]],
  ['[L] Weapon Style Summon Challenge Ticket (Bound)', [125, 250, 500, 1500, 3000]],
  ['[L] Mount Summon Challenge Ticket (Bound)', [125, 250, 500, 1500, 3000]],
  ['Element Extraction of Fusion x11 (Attribution)', [120, 250, 500, 2000, 5000]],
  ["Eligio's Stimulant of EXP (Bound)", [150, 250, 500, 1500, 5000]],
  ["Night Crow's Stimulant of Growth (Bound)", [150, 250, 500, 1500, 5000]],
  ['Night Crows Blessing Stimulant of Growth (Bound)', [1, 3, 7, 15, 30]],
  ['Torn Invoices (Attribution)', [250, 500, 1000, 2500, 5000]],
  ['Torn Seniority Letter (Attribution)', [250, 500, 1000, 2500, 5000]],
  ['Brilliant Refinement Stone Selection Chest (Bound)', [1250, 2500, 5000, 15000, 30000]],
  ['Shining Armor Enhancement Scroll Chest (Bound)', [550, 1250, 3000, 10000, 20000]],
  ['Shining Weapon Enhancement Scroll Chest (Bound)', [550, 1250, 3000, 10000, 20000]],
  ['Shining Accessory Enhancement Scroll Chest (Bound)', [550, 1250, 3000, 10000, 20000]],
  ['Brilliant Enhancement Scroll Selection Chest (Bound)', [75, 150, 300, 950, 2000]],
  ['Pitch-black Enhancement Scroll Selection Chest (Bound)', [75, 150, 300, 950, 2000]],
  ['Spell Rune Crystal I (Bound)', [2000, 4000, 8000, 20000, 50000]],
  ['Spell Starlight Crystal I (Bound)', [2000, 4000, 8000, 20000, 50000]],
  ['Enchantment Frost Crystal I (Attributed)', [2000, 4000, 8000, 20000, 50000]],
  ['Wind Orb Chest (Attributed)', [30, 75, 150, 250, 500]],
  ['[UC] Crafting Material Selection Chest (Bound)', [300, 500, 1250, 3500, 10000]],
  ['[C] Crafting Material x40 Selection Chest (Bound)', [300, 500, 1250, 3500, 10000]],
  ['[R] Arcane Scroll Selection Chest (Bound)', [400, 800, 1750, 4000, 10000]],
  ["Master's Aircraft Toolbox (Bound)", [40, 80, 150, 400, 800]],
  ['Golden Necklace Insignia (Attributed)', [null, null, null, 4, 12]],
  ['Golden Ring Insignia (Attribution)', [null, null, null, 8, 24]],
]

function loadSource(path, names) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace(/^export /gm, '')
  const sandbox = {}
  vm.runInNewContext(stripTypeScriptTypes(source) + `\nglobalThis.result = { ${names.join(', ')} };`, sandbox)
  return sandbox.result
}
const plain = value => JSON.parse(JSON.stringify(value))
const { getGiftPackages, findGiftPackage } = loadSource('src/giftPackageData.ts', ['getGiftPackages', 'findGiftPackage'])

for (const [index, amount] of amounts.entries()) {
  test(`V1 November $${amount} has the exact requested contents, including the confirmed correction`, () => {
    const item = findGiftPackage('v1', `november-supply-${amount}`)
    assert.ok(item)
    assert.equal(item.title, 'NOVEMBER PACKAGE')
    assert.equal(item.category, 'november-supply')
    assert.equal(item.amount, amount)
    assert.equal(item.isNew, true)
    assert.equal(item.oneTimeEventBonus, undefined, 'Do not invent a once-per-account November bonus')
    const expected = expectedRewards.filter(([, values]) => values[index] !== null)
      .map(([name, values]) => [name, values[index]]).sort(([a], [b]) => a.localeCompare(b))
    const actual = plain(item.rewards).map(({ name, quantity }) => [name, quantity])
      .sort(([a], [b]) => a.localeCompare(b))
    assert.deepEqual(actual, expected)
  })
}

test('November is available only in V1 with five unique tiers and 174 reward entries', () => {
  const november = getGiftPackages('v1').filter(item => item.category === 'november-supply')
  assert.deepEqual(plain(november.map(item => item.amount)), amounts)
  assert.deepEqual(plain(november.map(item => item.rewards.length)), [34, 34, 34, 36, 36])
  assert.equal(november.reduce((total, item) => total + item.rewards.length, 0), 174)
  assert.equal(new Set(getGiftPackages('v1').map(item => item.id)).size, getGiftPackages('v1').length)
  assert.equal(getGiftPackages('v2').some(item => item.category === 'november-supply'), false)
  for (const amount of amounts) assert.equal(findGiftPackage('v2', `november-supply-${amount}`), null)
})

test('November category labels and descriptions are translated in all six site languages', () => {
  const { novemberTranslations } = loadSource('src/novemberTranslations.ts', ['novemberTranslations'])
  assert.deepEqual(Object.keys(novemberTranslations).sort(), ['en', 'ko', 'pt', 'ru', 'th', 'zh-TW'])
  for (const [locale, translation] of Object.entries(novemberTranslations)) {
    for (const field of ['novemberPackages', 'novemberPackage', 'novemberPackagesDesc']) {
      assert.ok(translation[field]?.trim(), `${locale}: ${field}`)
    }
  }
  assert.equal(novemberTranslations.ko.novemberPackages, '11월 패키지')
})
