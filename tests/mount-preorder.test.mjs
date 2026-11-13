import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

// Independent transcription of the user's NEW STATS, not the older screenshot panels.
const expectedMounts = [
  {
    name: "Rodrigo's Flame Horse", stepPrice: 500, requiredTotal: 500,
    stats: [
      ['ATK SPD', '250%'], ['Skill SPD', '165%'], ['DEF', '80'], ['DMG RED', '90'],
      ['Skill DMG Tolerance', '15%'], ['MAX HP', '30,000'], ['INC DMG RED Rate', '15%'],
      ['Basic DMG', '50'], ['ACC', '20'], ['Status Effect RES', '25%'],
    ],
    added: ['Status Effect RES'],
  },
  {
    name: "Supreme Conqueror's Qilin", stepPrice: 1000, requiredTotal: 1500,
    stats: [
      ['ATK SPD', '250%'], ['Skill SPD', '165%'], ['DEF', '90'], ['DMG RED', '100'],
      ['Skill DMG Tolerance', '15%'], ['MAX HP', '35,000'], ['INC DMG RED Rate', '15%'],
      ['Status Effect RES', '30%'], ['Status Effect Duration RED Rate', '30%'],
      ['ACC', '30'], ['Status Effect ACC', '35%'],
    ],
    added: ['ACC', 'Status Effect ACC'],
  },
  {
    name: 'Golden Jackal of Ramses II', stepPrice: 1500, requiredTotal: 3000,
    stats: [
      ['ATK SPD', '250%'], ['Skill SPD', '165%'], ['DEF', '100'], ['DMG RED', '120'],
      ['Skill DMG Tolerance', '15%'], ['MAX HP', '40,000'], ['INC DMG RED Rate', '15%'],
      ['Basic DMG', '60'], ['DMG Boost Rate', '10%'], ['Status Effect RES', '30%'],
      ['ACC', '30'], ['Status Effect ACC', '35%'], ['Debuff Rate', '15%'], ['Debuff Res', '12%'],
    ],
    added: ['ACC', 'Status Effect ACC', 'Debuff Rate', 'Debuff Res'],
  },
]

function loadSource(path, names) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace(/^export /gm, '')
  const sandbox = {}
  vm.runInNewContext(stripTypeScriptTypes(source) + `\nglobalThis.result = { ${names.join(', ')} };`, sandbox)
  return JSON.parse(JSON.stringify(sandbox.result))
}

const { MOUNT_PREORDER_STEPS } = loadSource('src/mountPreorderData.ts', ['MOUNT_PREORDER_STEPS'])

test('all three mount steps require $500, $1,500, and $3,000 total new spending', () => {
  assert.equal(MOUNT_PREORDER_STEPS.length, 3)
  assert.deepEqual(MOUNT_PREORDER_STEPS.map(({ name, stepPrice, requiredTotal }) => ({ name, stepPrice, requiredTotal })),
    expectedMounts.map(({ name, stepPrice, requiredTotal }) => ({ name, stepPrice, requiredTotal })))
  let total = 0
  for (const mount of MOUNT_PREORDER_STEPS) {
    total += mount.stepPrice
    assert.equal(mount.requiredTotal, total)
    assert.ok(existsSync(new URL(`../public${mount.image}`, import.meta.url)), `Local artwork exists: ${mount.image}`)
  }
})

for (const expected of expectedMounts) {
  test(`${expected.name} includes exactly the ${expected.stats.length} requested new stats`, () => {
    const mount = MOUNT_PREORDER_STEPS.find(item => item.name === expected.name)
    assert.ok(mount)
    const rows = expected.stats.map(([label, value]) => [expected.added.includes(label) ? `+${label}` : label, value])
    assert.deepEqual(mount.stats.map(({ label, value }) => [label, value]), rows)
  })
}

test('mount bonus data is separate from individually purchasable gift packages', () => {
  const source = readFileSync(new URL('../src/giftPackageData.ts', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace(/^export /gm, '')
  const sandbox = {}
  vm.runInNewContext(stripTypeScriptTypes(source) + '\nglobalThis.packages = getGiftPackages("v1");', sandbox)
  for (const item of sandbox.packages) {
    assert.equal(expectedMounts.some(mount => mount.name === item.title), false)
    assert.doesNotMatch(item.id, /mount-preorder|rodrigo|qilin|jackal/i)
  }
})

test('mount preorder labels are complete in all six supported site languages', () => {
  const { mountPreorderTranslations } = loadSource('src/mountPreorderTranslations.ts', ['mountPreorderTranslations'])
  assert.deepEqual(Object.keys(mountPreorderTranslations).sort(), ['en', 'ko', 'pt', 'ru', 'th', 'zh-TW'])
  const fields = Object.keys(mountPreorderTranslations.en).sort()
  assert.ok(fields.length > 5)
  for (const [locale, values] of Object.entries(mountPreorderTranslations)) {
    assert.deepEqual(Object.keys(values).sort(), fields, `${locale} has every English label`)
    for (const value of Object.values(values)) assert.ok(typeof value === 'string' && value.trim(), `${locale} has no empty label`)
  }
})

test('every current gift package earns credit at its trusted catalog price', () => {
  const source = readFileSync(new URL('../src/giftPackageData.ts', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace(/^export /gm, '')
  const sandbox = {}
  vm.runInNewContext(stripTypeScriptTypes(source) + '\nglobalThis.packages = getGiftPackages("v1");', sandbox)
  const sql = readFileSync(new URL('../supabase/migrations/20261111143850_mount_preorder_bonus.sql', import.meta.url), 'utf8')
  const catalog = sql.split('insert into mount_preorder_private.package_catalog')[1].split(';')[0]
  const actual = [...catalog.matchAll(/\('([^']+)',(\d+)\)/g)].map(([, id, value]) => [id, Number(value)]).sort()
  const expected = JSON.parse(JSON.stringify(sandbox.packages.map(item => [item.id, item.amount]))).sort()
  assert.deepEqual(actual, expected)
})
