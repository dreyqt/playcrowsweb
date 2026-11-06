// Real edge handlers, isolated payment/database stubs. No network requests escape.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

function load(name, names = ['app'], overrides = {}) {
  const source = readFileSync(new URL(`../supabase/edgefunction/${name}/index.ts`, import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace(/^export default /gm, 'const app = ')
  const sandbox = { Date, Request, Response, File, FormData, btoa, crypto, TextEncoder,
    console: { error() {}, warn() {} }, Deno: { env: { get: () => 'local-test' } },
    withSupabase: (_options, handler) => handler,
    fetch: async () => assert.fail('Unexpected external request'), ...overrides }
  vm.runInNewContext(stripTypeScriptTypes(source) + `\nglobalThis.result = {${names.join(',')}}`, sandbox)
  return sandbox.result
}
const request = body => new Request('https://local.test/checkout', { method: 'POST', body: JSON.stringify(body) })
function paypalOrder(id, options = {}) {
  const { server = 'v1', playerId = 'PLAYER', tier = 50, quantity = 1, title = 'BOOSTING PACKAGE',
    completed = false, captureTime = '2026-01-01T00:00:00Z' } = options
  return { id, status: completed ? 'COMPLETED' : 'APPROVED', purchase_units: [{
    custom_id: `PC|${playerId}|${server.toUpperCase()}|Character`,
    description: `${title} ×${quantity} | PlayCrows ${server.toUpperCase()}`,
    amount: { currency_code: 'USD', value: (tier * quantity).toFixed(2) },
    ...(completed ? { payments: { captures: [{ id: `CAPTURE${id}`, status: 'COMPLETED',
      amount: { currency_code: 'USD', value: (tier * quantity).toFixed(2) },
      create_time: captureTime, update_time: '2026-12-01T00:00:00Z' }] } } : {}),
  }] }
}
function checkoutHarness(orders = {}, options = {}) {
  const claims = new Map(), events = []
  const key = args => `${args.p_player_id.toLowerCase().replace(/\s+/g, '')}:${args.p_package_id}`
  const client = { async rpc(name, args) {
    events.push({ name, args })
    if (options.rpcError) return { error: { message: 'Unavailable' } }
    const claim = claims.get(key(args))
    if (name === 'check_v1_boosting_eligibility') {
      return { data: !claim || (args.p_paypal_order_id != null && claim === args.p_paypal_order_id) }
    }
    assert.equal(name, 'reserve_v1_boosting_paypal')
    if (claim && claim !== args.p_paypal_order_id) return { error: { message: 'V1_BOOSTING_LIMIT: Already purchased.' } }
    claims.set(key(args), args.p_paypal_order_id)
    return { error: null }
  } }
  let captureAttempts = 0
  const { app } = load('paypal-checkout', ['app'], { fetch: async (url, init) => {
    const path = new URL(url).pathname
    events.push({ path, method: init?.method ?? 'GET' })
    if (path.endsWith('/oauth2/token')) return Response.json({ access_token: 'local-token' })
    if (path.endsWith('/capture')) {
      captureAttempts++
      const id = path.split('/').at(-2)
      assert.ok(orders[id])
      if (options.failCaptureOnce && captureAttempts === 1) throw new Error('Connection lost after provider received request')
      const original = orders[id]
      const completed = { ...original, status: 'COMPLETED', purchase_units: [{ ...original.purchase_units[0],
        payments: { captures: [{ id: `CAPTURE${id}`, status: 'COMPLETED', amount: original.purchase_units[0].amount }] } }] }
      orders[id] = completed
      return Response.json(completed)
    }
    if (init?.method === 'POST') return Response.json({ id: 'CREATEDORDER', status: 'CREATED' })
    const order = orders[path.split('/').at(-1)]
    assert.ok(order, `Unexpected order lookup ${path}`)
    return Response.json(order)
  } })
  return { claims, events, client, call: body => app.fetch(request(body), { supabaseAdmin: client }),
    captures: () => captureAttempts }
}

test('preflight returns limit code for occupied tier, permits matching-order retry, and rejects retired V2', async () => {
  const h = checkoutHarness()
  h.claims.set('player:boosting-50', 'ORDERA')
  for (const paypalOrderId of [undefined, 'OTHERORDER']) {
    const response = await h.call({ action: 'check-boosting-eligibility', server: 'v1', selectedPackageId: 'boosting-50', playerId: 'PLAYER', paypalOrderId })
    assert.equal(response.status, 409)
    assert.equal((await response.json()).code, 'V1_BOOSTING_LIMIT')
  }
  assert.equal((await h.call({ action: 'check-boosting-eligibility', server: 'v1', selectedPackageId: 'boosting-50', playerId: 'PLAYER', paypalOrderId: 'ORDERA' })).status, 200)
  assert.equal((await h.call({ action: 'check-boosting-eligibility', server: 'v1', selectedPackageId: 'boosting-200', playerId: 'PLAYER' })).status, 200)
  const prior = h.events.length
  const response = await h.call({ action: 'check-boosting-eligibility', server: 'v2', selectedPackageId: 'boosting-50', playerId: 'PLAYER' })
  assert.equal(response.status, 410)
  assert.equal(h.events.length, prior)
})

test('new PayPal order rejects V1 quantity >1 or used tiers before talking to payment provider', async () => {
  for (const quantity of [1, 2]) {
    const h = checkoutHarness()
    h.claims.set('player:boosting-50', 'OLDORDER')
    const response = await h.call({ action: 'create', server: 'v1', selectedPackageId: 'boosting-50',
      packageQuantity: quantity, playerId: 'PLAYER', username: 'Character' })
    assert.equal(response.status, 409)
    assert.equal(h.events.some(item => item.path), false)
  }
  const h = checkoutHarness()
  assert.equal((await h.call({ action: 'create', server: 'v2', selectedPackageId: 'boosting-50',
    packageQuantity: 3, playerId: 'PLAYER', username: 'Character' })).status, 410)
  assert.equal(h.events.some(item => item.name), false)
})

test('competing captures reserve atomically before charging, so only one order charges', async () => {
  const h = checkoutHarness({ ORDERA: paypalOrder('ORDERA'), ORDERB: paypalOrder('ORDERB') })
  const results = await Promise.all(['ORDERA', 'ORDERB'].map(orderId => h.call({ action: 'capture', server: 'v1', orderId })))
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409])
  assert.equal(h.captures(), 1)
  const chargeIndex = h.events.findIndex(item => item.path?.endsWith('/capture'))
  assert.ok(h.events.slice(0, chargeIndex).some(item => item.name === 'reserve_v1_boosting_paypal'))
  const winningOrder = h.claims.get('player:boosting-50')
  const retry = await h.call({ action: 'capture', server: 'v1', orderId: winningOrder })
  assert.equal(retry.status, 200)
  assert.equal((await retry.json()).captureId, `CAPTURE${winningOrder}`)
  assert.equal(h.captures(), 1)
})

test('ambiguous capture failure retains hold, rejects a different order, and allows same-order retry', async () => {
  const h = checkoutHarness({ ORDERA: paypalOrder('ORDERA'), ORDERB: paypalOrder('ORDERB') }, { failCaptureOnce: true })
  assert.equal((await h.call({ action: 'capture', server: 'v1', orderId: 'ORDERA' })).status, 500)
  assert.equal(h.claims.get('player:boosting-50'), 'ORDERA')
  assert.equal((await h.call({ action: 'capture', server: 'v1', orderId: 'ORDERB' })).status, 409)
  assert.equal(h.captures(), 1)
  assert.equal((await h.call({ action: 'capture', server: 'v1', orderId: 'ORDERA' })).status, 200)
})

test('capture uses trusted server/tier/quantity and fails closed when reservation database is unavailable', async () => {
  for (const [options, server] of [[{ quantity: 2 }, 'v1'], [{}, 'v2']]) {
    const h = checkoutHarness({ ORDERA: paypalOrder('ORDERA', options) })
    assert.notEqual((await h.call({ action: 'capture', server, orderId: 'ORDERA', selectedPackageId: 'currency-50', packageQuantity: 1 })).status, 200)
    assert.equal(h.captures(), 0)
  }
  const h = checkoutHarness({ ORDERA: paypalOrder('ORDERA') }, { rpcError: true })
  assert.equal((await h.call({ action: 'capture', server: 'v1', orderId: 'ORDERA' })).status, 503)
  assert.equal(h.captures(), 0)
  for (const options of [{ server: 'v2', quantity: 3 }, { title: 'Diamond Package', quantity: 3 }]) {
    const regular = checkoutHarness({ ORDERA: paypalOrder('ORDERA', options) })
    assert.equal((await regular.call({ action: 'capture', server: options.server ?? 'v1', orderId: 'ORDERA' })).status, options.server === 'v2' ? 410 : 200)
    if (options.server === 'v2') assert.equal(regular.captures(), 0)
    assert.equal(regular.events.some(item => item.name === 'reserve_v1_boosting_paypal'), false)
  }
})

test('completed historical multi-quantity PayPal checkout remains recoverable without another charge', async () => {
  const h = checkoutHarness({ OLDORDER: paypalOrder('OLDORDER', { quantity: 3, completed: true }) })
  h.claims.set('player:boosting-50', 'OTHERORDER')
  const response = await h.call({ action: 'capture', server: 'v1', orderId: 'OLDORDER' })
  assert.equal(response.status, 200)
  assert.equal(h.captures(), 0)
  assert.equal(h.events.some(item => item.name === 'reserve_v1_boosting_paypal'), false)
})

test('submission binds trusted V1 PayPal package and quantity, and retains actual capture timestamp', async () => {
  for (const [title, selectedId, selectedTitle, quantity, valid] of [
    ['BOOSTING PACKAGE', 'boosting-50', 'BOOSTING PACKAGE', 1, true],
    ['BOOSTING PACKAGE', 'currency-50', 'Diamond Package', 1, false],
    ['Diamond Package', 'boosting-50', 'BOOSTING PACKAGE', 1, false],
    ['BOOSTING PACKAGE', 'boosting-50', 'BOOSTING PACKAGE', 2, false],
  ]) {
    const order = paypalOrder('ORDERA', { title, completed: true })
    const { verifyPayPalOrder } = load('submit-donation', ['verifyPayPalOrder'], {
      fetch: async url => Response.json(String(url).endsWith('/oauth2/token') ? { access_token: 'local' } : order),
    })
    const result = verifyPayPalOrder({ server: 'v1', orderId: 'ORDERA', captureId: 'CAPTUREORDERA', playerId: 'PLAYER',
      username: 'Character', expectedAmountUsd: 50, promoCode: null,
      selectedPackageId: selectedId, selectedPackageTitle: selectedTitle, packageQuantity: quantity })
    if (valid) assert.equal((await result).verifiedAt, '2026-01-01T00:00:00.000Z')
    else await assert.rejects(result, /does not match the selected package and quantity/)
  }
})

async function manualSubmission({ eligible = true, quantity = 1, insertError = null } = {}) {
  const state = { uploaded: false, removed: false, inserted: false }
  const client = { rpc: async () => ({ data: eligible }),
    storage: { from: () => ({ upload: async () => { state.uploaded = true; return {} },
      remove: async () => { state.removed = true; return {} } }) },
    from() { const query = { select() { return query }, eq() { return query }, or() { return query }, limit() { return query },
      maybeSingle: async () => ({ data: null }), insert() { state.inserted = true; return query },
      single: async () => ({ error: insertError, data: insertError ? null : { id: 'ROW', reference_code: 'REF', status: 'pending' } }),
    }; return query },
  }
  const { app } = load('submit-donation', ['app'], { Deno: { env: { get: () => undefined } } })
  const form = new FormData()
  for (const [key, value] of Object.entries({ server: 'v1', playerId: 'PLAYER', username: 'Character', currency: 'USD', amount: 50 * quantity,
    amountMode: 'package', selectedPackageId: 'boosting-50', selectedPackageTitle: 'BOOSTING PACKAGE', selectedPackageAmount: 50,
    packageQuantity: quantity, paymentMethod: 'gcash', eventBonusSelections: '{}' })) form.set(key, String(value))
  form.set('receipt', new File(['receipt'], 'receipt.png', { type: 'image/png' }))
  const response = await app.fetch(new Request('https://local.test/submit', { method: 'POST', body: form }), { supabaseAdmin: client })
  return { response, state }
}

test('manual repeat and multi-quantity submissions are rejected before receipt upload; DB race conflict cleans receipt', async () => {
  for (const options of [{ eligible: false }, { quantity: 2 }]) {
    const { response, state } = await manualSubmission(options)
    assert.equal(response.status, 409)
    assert.equal((await response.json()).code, 'V1_BOOSTING_LIMIT')
    assert.equal(state.uploaded, false)
    assert.equal(state.inserted, false)
  }
  const { response, state } = await manualSubmission({ insertError: { message: 'V1_BOOSTING_LIMIT: racing order won' } })
  assert.equal(response.status, 409)
  assert.equal(state.uploaded, true)
  assert.equal(state.removed, true)
})

test('admin recovery retains historical capture time and maps a current repeat claim to support reconciliation', async () => {
  for (const conflict of [false, true]) {
    let inserted
    const client = { auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) }, from(table) {
      const query = { select() { return query }, eq() { return query }, or() { return query }, limit() { return query },
        maybeSingle: async () => ({ data: table === 'admin_users' ? { user_id: 'admin' } : null }),
        insert(row) { inserted = row; return query }, single: async () => conflict
          ? { error: { message: 'V1_BOOSTING_LIMIT: duplicate' } } : { data: { id: 'RECOVERED', reference_code: 'REF' } } }
      return query
    } }
    const order = paypalOrder('OLDORDER', { quantity: 3, completed: true })
    const { app } = load('recover-paypal-payment', ['app'], { createClient: () => client,
      fetch: async url => Response.json(String(url).endsWith('/oauth2/token') ? { access_token: 'local' } : order) })
    const response = await app.fetch(new Request('https://local.test/recover', { method: 'POST',
      headers: { authorization: 'Bearer local' }, body: JSON.stringify({ server: 'v1', paypalId: 'OLDORDER' }) }))
    assert.equal(inserted.payment_verified_at, '2026-01-01T00:00:00.000Z')
    assert.equal(inserted.package_quantity, 3)
    assert.equal(response.status, conflict ? 409 : 200)
    if (conflict) {
      const payload = await response.json()
      assert.equal(payload.code, 'V1_BOOSTING_LIMIT')
      assert.match(payload.error, /do not ask the customer to pay again/)
    }
  }
})
