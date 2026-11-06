import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

// Execute the real handlers against isolated provider/database fixtures only.
function load(name, names = ['app'], overrides = {}) {
  const source = readFileSync(new URL(`../supabase/edgefunction/${name}/index.ts`, import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace(/^export default /gm, 'const app = ')
  const sandbox = { Date, Request, Response, File, FormData, btoa, crypto, TextEncoder,
    console: { error() {}, warn() {}, log() {} }, Deno: { env: { get: () => 'local-test' } },
    withSupabase: (_options, handler) => handler,
    fetch: async () => assert.fail('Unexpected external request'), ...overrides }
  vm.runInNewContext(stripTypeScriptTypes(source) + `\nglobalThis.result = { ${names.join(',')} }`, sandbox)
  return sandbox.result
}
const tiers = [50, 100, 200, 500, 1000]
const plain = value => JSON.parse(JSON.stringify(value))
const request = body => new Request('https://local.test/checkout', { method: 'POST', body: JSON.stringify(body) })
function order({ server = 'v1', amount = 50, quantity = 1, title = 'NOVEMBER PACKAGE', completed = true } = {}) {
  const payment = { currency_code: 'USD', value: (amount * quantity).toFixed(2) }
  return { id: 'ORDER123', status: completed ? 'COMPLETED' : 'APPROVED', purchase_units: [{
    custom_id: `PC|PLAYER|${server.toUpperCase()}|Character`,
    description: `${title} ×${quantity} | PlayCrows ${server.toUpperCase()}`, amount: payment,
    ...(completed ? { payments: { captures: [{ id: 'CAPTURE123', status: 'COMPLETED',
      create_time: '2026-11-06T00:00:00Z', amount: payment }] } } : {}),
  }] }
}
function provider(orderValue, calls = []) {
  return async (url, options = {}) => {
    calls.push({ url: String(url), ...options })
    if (String(url).endsWith('/oauth2/token')) return Response.json({ access_token: 'local-token' })
    return Response.json(orderValue)
  }
}
function client(capture = {}) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) },
    rpc: async () => assert.fail('November packages must not reserve a Boosting tier'),
    storage: { from: () => ({ upload: async () => { capture.uploaded = true; return {} } }) },
    from(table) {
      let orders = 0
      const query = {
        select() { return query }, eq() { return query }, or() { return query }, limit() { return query },
        maybeSingle: async () => ({ data: table === 'admin_users' ? { user_id: 'admin' } : null }),
        order() { return ++orders === 2 ? Promise.resolve({ data: [{ event_number: '001', title: 'Event', rewards: ['Reward'] }] }) : query },
        insert(row) { capture.row = row; return query },
        single: async () => ({ data: { id: 'record', reference_code: 'REF', created_at: '2026-11-06', status: 'pending', ...capture.row } }),
      }
      return query
    },
  }
}
async function submit(amount, quantity, currency = 'USD', overrides = {}, providerOrder) {
  const capture = {}, calls = []
  const { app } = load('submit-donation', ['app'], {
    Deno: { env: { get: key => key.startsWith('PAYPAL_') ? 'local-test' : undefined } },
    ...(providerOrder ? { fetch: provider(providerOrder, calls) } : {}),
  })
  const entitlement = Math.floor(amount * quantity / 100)
  const values = { server: 'v1', playerId: 'PLAYER', username: 'Character', currency, amount: amount * quantity,
    amountMode: 'package', selectedPackageId: `november-supply-${amount}`, selectedPackageTitle: 'NOVEMBER PACKAGE',
    selectedPackageAmount: amount, packageQuantity: quantity, paymentMethod: 'gcash',
    eventBonusSelections: JSON.stringify(entitlement ? { '001': entitlement } : {}),
    cumulativeCreditUsd: '9999999', boostingBonusRewards: '[{"name":"spoof","quantity":999}]', ...overrides }
  const form = new FormData()
  for (const [key, value] of Object.entries(values)) form.set(key, String(value))
  if (values.paymentMethod !== 'paypal') form.set('receipt', new File(['local receipt'], 'receipt.png', { type: 'image/png' }))
  const response = await app.fetch(new Request('https://local.test/submit', { method: 'POST', body: form }), { supabaseAdmin: client(capture) })
  return { response, capture, calls }
}

test('November has exactly five trusted V1 tiers and cannot be selected from the legacy V2 catalog', () => {
  for (const name of ['paypal-checkout', 'submit-donation', 'recover-paypal-payment']) {
    const { GIFT_PACKAGES_BY_SERVER: catalogs } = load(name, ['GIFT_PACKAGES_BY_SERVER'])
    assert.deepEqual(Object.keys(catalogs.v1).filter(id => id.startsWith('november-')), tiers.map(tier => `november-supply-${tier}`))
    assert.deepEqual(Object.keys(catalogs.v2).filter(id => id.startsWith('november-')), [])
    for (const amount of tiers) assert.deepEqual(plain(catalogs.v1[`november-supply-${amount}`]), { title: 'NOVEMBER PACKAGE', amount })
  }
})

test('November PayPal creates use trusted prices and selected quantity for every tier', async () => {
  for (const amount of tiers) for (const quantity of [1, 3]) {
    let sent
    const { app } = load('paypal-checkout', ['app'], { fetch: async (url, options) => {
      if (String(url).endsWith('/oauth2/token')) return Response.json({ access_token: 'local-token' })
      sent = JSON.parse(options.body)
      return Response.json({ id: 'ORDER123', status: 'CREATED' })
    } })
    const response = await app.fetch(request({ action: 'create', server: 'v1', selectedPackageId: `november-supply-${amount}`,
      packageQuantity: quantity, playerId: 'PLAYER', username: 'Character', amount: 0.01 }), { supabaseAdmin: client() })
    assert.equal(response.status, 200, await response.text())
    assert.equal(sent.purchase_units[0].amount.value, (amount * quantity).toFixed(2))
    assert.equal(sent.purchase_units[0].description, `NOVEMBER PACKAGE ×${quantity} | PlayCrows V1`)
  }
})

test('November manual checkout records ordinary V1 credit, selected quantity, and no Boosting extras', async () => {
  for (const amount of tiers) for (const currency of ['USD', 'PHP', 'GBP']) {
    const quantity = 2
    const { response, capture } = await submit(amount, quantity, currency)
    assert.equal(response.status, 201, await response.text())
    assert.equal(capture.row.amount, amount * quantity * ({ USD: 1, PHP: 60, GBP: 0.79 }[currency]))
    assert.equal(capture.row.selected_package_title, 'NOVEMBER PACKAGE')
    assert.equal(capture.row.package_quantity, 2)
    assert.equal(capture.row.cumulative_credit_usd, amount * quantity)
    assert.deepEqual(plain(capture.row.boosting_bonus_rewards), [])
    assert.equal(capture.row.event_bonus_selection_count, amount * quantity / 100)
  }
})

test('November submissions reject changed prices, titles, quantity and event entitlement before receipt upload', async () => {
  for (const overrides of [{ amount: 1 }, { selectedPackageAmount: 1 }, { selectedPackageTitle: 'BOOSTING PACKAGE' },
    { packageQuantity: 0 }, { packageQuantity: 1000 }, { selectedPackageId: 'november-supply-999' }, { eventBonusSelections: '{"001":1}' }]) {
    const { response, capture } = await submit(50, 1, 'USD', overrides)
    assert.equal(response.status, 400)
    assert.equal(capture.uploaded, undefined)
    assert.equal(capture.row, undefined)
  }
})

test('November PayPal capture works at quantity >1 without consuming any Boosting claim', async () => {
  const calls = []
  const { app } = load('paypal-checkout', ['app'], { fetch: async (url, options) => {
    calls.push({ url: String(url), method: options?.method })
    if (String(url).endsWith('/oauth2/token')) return Response.json({ access_token: 'local-token' })
    return Response.json(order({ amount: 200, quantity: 3, completed: String(url).endsWith('/capture') }))
  } })
  const response = await app.fetch(request({ action: 'capture', server: 'v1', orderId: 'ORDER123' }), { supabaseAdmin: client() })
  assert.equal(response.status, 200, await response.text())
  assert.equal(calls.filter(call => call.url.endsWith('/capture')).length, 1)
})

test('PayPal evidence binds November package identity and quantity, not just the paid amount', async () => {
  for (const evidence of [order(), order({ title: 'Diamond Package' }), order({ title: 'BOOSTING PACKAGE' }), order({ amount: 25, quantity: 2 })]) {
    const { response, capture } = await submit(50, 1, 'USD', { paymentMethod: 'paypal', paypalOrderId: 'ORDER123',
      paypalCaptureId: 'CAPTURE123', paypalPaymentStatus: 'COMPLETED' }, evidence)
    const valid = evidence.purchase_units[0].description === 'NOVEMBER PACKAGE ×1 | PlayCrows V1'
    assert.equal(response.status, valid ? 201 : 400, await response.text())
    assert.equal(Boolean(capture.row), valid)
  }
  const { verifyPayPalOrder } = load('submit-donation', ['verifyPayPalOrder'], { fetch: provider(order()) })
  await assert.rejects(verifyPayPalOrder({ server: 'v1', orderId: 'ORDER123', captureId: 'CAPTURE123', playerId: 'PLAYER',
    username: 'Character', expectedAmountUsd: 50, promoCode: null, selectedPackageId: 'currency-50',
    selectedPackageTitle: 'Diamond Package', packageQuantity: 1 }), /does not match the selected package/)
})

test('retired V2 blocks new PayPal/preflight/manual attempts but preserves completed PayPal submission', async () => {
  const { app } = load('paypal-checkout')
  for (const action of ['create', 'check-boosting-eligibility']) {
    const response = await app.fetch(request({ action, server: 'v2', selectedPackageId: 'boosting-50',
      playerId: 'PLAYER', username: 'Character', packageQuantity: 1 }), { supabaseAdmin: client() })
    assert.equal(response.status, 410)
    assert.equal((await response.json()).code, 'V2_MERGED')
  }
  const base = { server: 'v2', selectedPackageId: 'currency-50', selectedPackageTitle: 'Diamond Package' }
  for (const paymentMethod of ['gcash', 'wise', 'bybit']) {
    const { response, capture } = await submit(50, 1, 'USD', { ...base, paymentMethod })
    assert.equal(response.status, 410)
    assert.equal(capture.row, undefined)
    assert.equal(capture.uploaded, undefined)
  }
  for (const completed of [false, true]) {
    const evidence = order({ server: 'v2', title: 'Diamond Package', completed })
    const calls = []
    const checkout = load('paypal-checkout', ['app'], { fetch: provider(evidence, calls) })
    const response = await checkout.app.fetch(request({ action: 'capture', server: 'v2', orderId: 'ORDER123' }), { supabaseAdmin: client() })
    assert.equal(response.status, completed ? 200 : 410)
    assert.equal(calls.some(call => call.url.endsWith('/capture')), false)
    const submission = await submit(50, 1, 'USD', { ...base, paymentMethod: 'paypal', paypalOrderId: 'ORDER123',
      paypalCaptureId: 'CAPTURE123', paypalPaymentStatus: 'COMPLETED' }, evidence)
    assert.equal(submission.response.status, completed ? 201 : 400, await submission.response.text())
    assert.equal(Boolean(submission.capture.row), completed)
  }
  // Historical paid V2 orders still resolve their event snapshot from service-role
  // event rows; they do not rely on the now V1-only public bonus-catalog RPC.
  const historicalBonus = await submit(100, 1, 'USD', { ...base, selectedPackageId: 'currency-100',
    paymentMethod: 'paypal', paypalOrderId: 'ORDER123', paypalCaptureId: 'CAPTURE123', paypalPaymentStatus: 'COMPLETED' },
    order({ server: 'v2', amount: 100, title: 'Diamond Package' }))
  assert.equal(historicalBonus.response.status, 201, await historicalBonus.response.text())
  assert.equal(historicalBonus.capture.row.event_bonus_selection_count, 1)
})

test('administrator recovery resolves all November tiers with their original quantity and ordinary credit', async () => {
  for (const amount of tiers) {
    const captured = {}
    const { app } = load('recover-paypal-payment', ['app'], { createClient: () => client(captured), fetch: provider(order({ amount, quantity: 3 })) })
    const response = await app.fetch(new Request('https://local.test/recover', { method: 'POST', headers: { authorization: 'Bearer local' },
      body: JSON.stringify({ server: 'v1', paypalId: 'ORDER123' }) }))
    assert.equal(response.status, 200, await response.text())
    assert.equal(captured.row.selected_package_id, `november-supply-${amount}`)
    assert.equal(captured.row.package_quantity, 3)
    assert.equal(captured.row.cumulative_credit_usd, amount * 3)
    assert.deepEqual(plain(captured.row.boosting_bonus_rewards), [])
  }
})

test('November notification identifies the package without inventing Boosting bonuses', async () => {
  let payload
  const { sendDiscordDonationNotification } = load('submit-donation', ['sendDiscordDonationNotification'], {
    fetch: async (_url, options) => { payload = JSON.parse(options.body); return Response.json({ id: 'local-message' }) },
  })
  await sendDiscordDonationNotification({ webhookUrl: 'https://local.test/notice', adminDashboardUrl: 'https://local.test/admin',
    donation: { referenceCode: 'REF', createdAt: '2026-11-06' }, server: 'v1', playerId: 'PLAYER', username: 'Character',
    currency: 'USD', finalAmount: 1000, selectedPackageId: 'november-supply-1000', selectedPackageTitle: 'NOVEMBER PACKAGE',
    selectedPackageAmount: 1000, packageQuantity: 1, paymentMethod: 'paypal', additionalNotes: '', eventBonusSelections: [], receipt: null })
  const fields = payload.embeds[0].fields
  assert.match(fields.find(field => field.name === 'Package').value, /November Package/)
  assert.equal(fields.some(field => field.name.includes('Boosting')), false)
})
