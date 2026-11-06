import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

// Execute real edge handlers with local services only: no payment or notification is sent.
function load(name, names = [], overrides = {}) {
  const source = readFileSync(new URL(`../supabase/edgefunction/${name}/index.ts`, import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace(/^export default /gm, 'const app = ')
  const sandbox = {
    Date, Request, Response, File, FormData, btoa, crypto, TextEncoder,
    console: { error() {}, warn() {}, log() {} },
    Deno: { env: { get: () => 'local-test-value' } },
    withSupabase: (_config, handler) => handler,
    fetch: async () => assert.fail('Unexpected external request'), ...overrides,
  }
  vm.runInNewContext(stripTypeScriptTypes(source) + `\nglobalThis.result = { ${names.join(', ')} };`, sandbox)
  return sandbox.result
}
const plain = value => JSON.parse(JSON.stringify(value))
const tiers = [50, 200, 500, 1000]
const weapons = ["Gaspard's Savage Greatsword (Bound)", "Theophil's Creed Spear (Bound)",
  "Brandt's Domination Twin Sword (Bound)", "Alyn's Illusion Longbow (Bound)",
  "Johannes' Motive Scepter (Bound)", "Ludwig's Straight Sword of Justice (Bound)",
  "Clemens' Freedom Dagger (Bound)", "Zenesia's Ruling Segum (Attributed)", "Eleanor's Ambition Staff (Bound)"]
function expectedBonus(amount, quantity) {
  if (amount === 500) return [
    { name: 'Golden Necklace Insignia (Attributed)', quantity: 4 * quantity },
    { name: 'Golden Ring Insignia (Attribution)', quantity: 4 * quantity },
  ]
  return amount === 1000 ? weapons.map(name => ({ name, quantity })) : []
}

test('every trusted checkout, submit and recovery catalog accepts the four exact Boosting tiers', () => {
  for (const name of ['paypal-checkout', 'submit-donation', 'recover-paypal-payment']) {
    const { GIFT_PACKAGES_BY_SERVER: catalogs } = load(name, ['GIFT_PACKAGES_BY_SERVER'])
    for (const server of ['v1', 'v2']) {
      assert.deepEqual(Object.keys(catalogs[server]).filter(id => id.startsWith('boosting-')).sort(), tiers.map(tier => `boosting-${tier}`).sort())
      for (const amount of tiers) assert.deepEqual(plain(catalogs[server][`boosting-${amount}`]), { title: 'BOOSTING PACKAGE', amount })
    }
  }
})

test('only V2 Boosting doubles cumulative credit; all bonuses scale per purchased package', () => {
  for (const name of ['submit-donation', 'recover-paypal-payment', 'update-donation-discord-status']) {
    const { getCumulativeCreditUsd, getBoostingBonusRewards } = load(name, ['getCumulativeCreditUsd', 'getBoostingBonusRewards'], {
      Deno: { serve() {}, env: { get: () => 'local-test' } },
    })
    for (const server of ['v1', 'v2']) for (const amount of tiers) for (const quantity of [1, 3, 999]) {
      assert.equal(getCumulativeCreditUsd(server, `boosting-${amount}`, amount, quantity), amount * quantity * (server === 'v2' ? 2 : 1))
      assert.deepEqual(plain(getBoostingBonusRewards(`boosting-${amount}`, quantity)), expectedBonus(amount, quantity))
      for (const prefix of ['currency', 'support', 'september-supply', 'october-supply', 'boosting-spoof']) {
        assert.equal(getCumulativeCreditUsd(server, `${prefix}-${amount}`, amount, quantity), amount * quantity)
        assert.deepEqual(plain(getBoostingBonusRewards(`${prefix}-${amount}`, quantity)), [])
      }
    }
  }
})

test('PayPal charges unchanged V1 face value and rejects retired V2 purchases before provider contact', async () => {
  for (const server of ['v1', 'v2']) for (const amount of tiers) for (const quantity of server === 'v1' ? [1] : [1, 3]) {
    let order
    const { app } = load('paypal-checkout', ['app'], { fetch: async (url, options) => {
      if (String(url).endsWith('/v1/oauth2/token')) return Response.json({ access_token: 'local-token' })
      order = JSON.parse(options.body)
      return Response.json({ id: 'ORDER123', status: 'CREATED' })
    } })
    const response = await app.fetch(new Request('https://local.test/checkout', {
      method: 'POST', body: JSON.stringify({ action: 'create', server, selectedPackageId: `boosting-${amount}`,
        packageQuantity: quantity, playerId: 'PLAYER', username: 'Character' }),
    }), { supabaseAdmin: { rpc: async () => ({ data: true, error: null }) } })
    if (server === 'v2') {
      assert.equal(response.status, 410)
      assert.equal(order, undefined)
      continue
    }
    assert.equal(response.status, 200)
    assert.equal(order.purchase_units[0].amount.value, (amount * quantity).toFixed(2))
    assert.equal(order.purchase_units[0].description, `BOOSTING PACKAGE ×${quantity} | PlayCrows ${server.toUpperCase()}`)
  }
})

function submissionClient(capture) {
  return {
    rpc: async () => ({ data: true, error: null }),
    storage: { from: () => ({ upload: async () => ({ error: null }) }) },
    from(table) {
      let sorts = 0
      const query = {
        select() { return query }, eq() { return query }, or() { return query }, limit() { return query },
        maybeSingle: async () => ({ data: null }),
        order() { return ++sorts === 2 ? Promise.resolve({ data: [{ event_number: '001', title: 'Event', rewards: ['Reward'] }] }) : query },
        insert(row) { capture.row = row; return query },
        single: async () => ({ data: { id: 'record', reference_code: 'REF', created_at: '2026-10-15', status: 'pending', ...capture.row } }),
      }
      assert.ok(['donations', 'events', 'submission_blocks'].includes(table))
      return query
    },
  }
}
async function submit(server, amount, quantity, currency = 'USD', overrides = {}) {
  const capture = {}
  const { app } = load('submit-donation', ['app'], { Deno: { env: { get: () => undefined } } })
  const entitlement = Math.floor(amount * quantity / 100)
  const values = { server, playerId: 'PLAYER', username: 'Character', currency, amount: amount * quantity,
    amountMode: 'package', selectedPackageId: `boosting-${amount}`, selectedPackageTitle: 'BOOSTING PACKAGE',
    selectedPackageAmount: amount, packageQuantity: quantity, paymentMethod: 'gcash',
    eventBonusSelections: JSON.stringify(entitlement ? { '001': entitlement } : {}),
    cumulativeCreditUsd: '999999999', boostingBonusRewards: '[{"name":"spoofed","quantity":999}]', ...overrides }
  const form = new FormData()
  for (const [key, value] of Object.entries(values)) form.set(key, String(value))
  form.set('receipt', new File(['local receipt'], 'receipt.png', { type: 'image/png' }))
  const response = await app.fetch(new Request('https://local.test/submit', { method: 'POST', body: form }),
    { supabaseAdmin: submissionClient(capture) })
  return { response, row: capture.row }
}

test('manual submissions persist trusted separate credit and all bonus items without doubling charge or event choices', async () => {
  for (const server of ['v1', 'v2']) for (const amount of tiers) for (const quantity of server === 'v1' ? [1] : [1, 3]) {
    const { response, row } = await submit(server, amount, quantity)
    if (server === 'v2') {
      assert.equal(response.status, 410)
      assert.equal(row, undefined)
      continue
    }
    assert.equal(response.status, 201, await response.text())
    assert.equal(row.amount, amount * quantity)
    assert.equal(row.selected_package_amount, amount)
    assert.equal(row.cumulative_credit_usd, amount * quantity * (server === 'v2' ? 2 : 1))
    assert.equal(row.event_bonus_selection_count, Math.floor(amount * quantity / 100))
    assert.deepEqual(plain(row.boosting_bonus_rewards), expectedBonus(amount, quantity))
    assert.equal(row.payment_verified_at, null)
  }
  const { response, row } = await submit('v1', 50, 1, 'PHP')
  assert.equal(response.status, 201)
  assert.equal(row.amount, 3000)
  assert.equal(row.cumulative_credit_usd, 50)
})

test('submission rejects inflated payment/package values, quantity and doubled event claims', async () => {
  for (const overrides of [{ amount: 100 }, { selectedPackageAmount: 100 }, { selectedPackageTitle: 'Fake title' },
    { packageQuantity: 0 }, { packageQuantity: 1000 }, { selectedPackageId: 'boosting-9999' },
    { eventBonusSelections: '{"001":1}' }]) {
    const { response, row } = await submit('v1', 50, 1, 'USD', overrides)
    assert.equal(response.status, 400)
    assert.equal(row, undefined)
  }
})

test('PayPal recovery persists matching credit/bonuses independently from captured USD', async () => {
  for (const server of ['v1', 'v2']) for (const amount of tiers) {
    let row
    const quantity = 2
    const client = { auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) }, from(table) {
      const query = { select() { return query }, eq() { return query }, or() { return query }, limit() { return query },
        maybeSingle: async () => ({ data: table === 'admin_users' ? { user_id: 'admin' } : null }),
        insert(value) { row = value; return query }, single: async () => ({ data: { id: 'recovered', reference_code: 'REF', ...row } }) }
      return query
    } }
    const { app } = load('recover-paypal-payment', ['app'], { createClient: () => client,
      fetch: async url => Response.json(String(url).endsWith('/v1/oauth2/token') ? { access_token: 'local-token' } : {
        id: 'ORDER123', status: 'COMPLETED', purchase_units: [{ custom_id: `PC|PLAYER|${server.toUpperCase()}|Character`,
          description: `BOOSTING PACKAGE ×${quantity} | PlayCrows ${server.toUpperCase()}`,
          payments: { captures: [{ id: 'CAPTURE123', status: 'COMPLETED', create_time: '2026-10-15T00:00:00Z',
            amount: { currency_code: 'USD', value: (amount * quantity).toFixed(2) } }] } }] }),
    })
    const response = await app.fetch(new Request('https://local.test/recover', { method: 'POST',
      headers: { authorization: 'Bearer local' }, body: JSON.stringify({ server, paypalId: 'ORDER123' }) }))
    assert.equal(response.status, 200, await response.text())
    assert.equal(row.amount, amount * quantity)
    assert.equal(row.selected_package_id, `boosting-${amount}`)
    assert.equal(row.cumulative_credit_usd, amount * quantity * (server === 'v2' ? 2 : 1))
    assert.deepEqual(plain(row.boosting_bonus_rewards), expectedBonus(amount, quantity))
  }
})

test('initial Discord notifications describe both insignias or all nine weapons, never a choice', async () => {
  for (const server of ['v1', 'v2']) for (const amount of tiers) {
    let payload
    const { sendDiscordDonationNotification } = load('submit-donation', ['sendDiscordDonationNotification'], {
      fetch: async (_url, options) => { payload = JSON.parse(options.body); return Response.json({ id: 'message' }) },
    })
    await sendDiscordDonationNotification({ webhookUrl: 'https://local.test/webhook', adminDashboardUrl: 'https://local.test/admin',
      donation: { referenceCode: 'REF', createdAt: '2026-10-15' }, server, playerId: 'PLAYER', username: 'Character',
      currency: 'USD', finalAmount: amount * 2, selectedPackageId: `boosting-${amount}`, selectedPackageTitle: 'BOOSTING PACKAGE',
      selectedPackageAmount: amount, packageQuantity: 2, paymentMethod: 'paypal', additionalNotes: '', eventBonusSelections: [], receipt: null, receiptExtension: null })
    const fields = payload.embeds[0].fields
    assert.match(fields.find(item => item.name === 'Package').value, /Boosting Package/)
    const bonus = fields.find(item => item.name.includes('Boosting Package Bonus'))
    if (amount < 500) assert.equal(bonus, undefined)
    else {
      for (const reward of expectedBonus(amount, 2)) assert.ok(bonus.value.includes(`${reward.name} ×${reward.quantity}`))
      assert.doesNotMatch(bonus.value, /choose|choice|select/i)
      assert.ok(bonus.value.length <= 1024)
    }
    assert.ok(fields.find(item => item.name === 'Cumulative Credit (USD)'))
  }
})

test('updated Discord notifications retain credit and all rewards and prevent rejected-order fulfillment', async () => {
  for (const server of ['v1', 'v2']) for (const amount of [500, 1000]) for (const status of ['pending', 'approved', 'rejected']) {
    let handler, payload, selectedFields
    const quantity = 3
    const row = { id: 'record', server, reference_code: 'REF', created_at: '2026-10-15', player_id: 'PLAYER', username: 'Character',
      selected_package_id: `boosting-${amount}`, selected_package_title: 'BOOSTING PACKAGE', selected_package_amount: amount,
      package_quantity: quantity, currency: 'USD', amount: amount * quantity, status, payment_method: 'paypal',
      discord_message_id: 'message', cumulative_credit_usd: amount * quantity * (server === 'v2' ? 2 : 1),
      boosting_bonus_rewards: expectedBonus(amount, quantity) }
    const client = { auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) }, from(table) {
      const query = { select(fields) { if (table === 'donations') selectedFields = fields; return query }, eq() { return query },
        maybeSingle: async () => ({ data: { user_id: 'admin' } }), single: async () => ({ data: row }) }
      return query
    } }
    load('update-donation-discord-status', [], { createClient: () => client,
      Deno: { env: { get: () => 'https://local.test' }, serve: callback => { handler = callback } },
      fetch: async (_url, options) => { assert.equal(options.method, 'PATCH'); payload = JSON.parse(options.body); return Response.json({ id: 'message' }) },
    })
    const response = await handler(new Request('https://local.test/update', { method: 'POST', headers: { authorization: 'Bearer local' }, body: JSON.stringify({ donationId: 'record' }) }))
    assert.equal(response.status, 200)
    assert.ok(selectedFields.includes('cumulative_credit_usd'))
    assert.ok(selectedFields.includes('boosting_bonus_rewards'))
    const fields = payload.embeds[0].fields
    const bonus = fields.find(item => item.name.includes('Boosting Package Bonus'))
    for (const reward of expectedBonus(amount, quantity)) assert.ok(bonus.value.includes(`${reward.name} ×${reward.quantity}`))
    assert.doesNotMatch(bonus.value, /choose|choice|select/i)
    const credit = fields.find(item => item.name === 'Cumulative Credit (USD)')
    assert.ok(credit.value.includes(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.cumulative_credit_usd)))
    if (status === 'rejected') {
      assert.match(bonus.value, /do not grant/)
      assert.match(credit.value, /do not credit/)
    }
  }
})
