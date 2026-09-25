import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

const LAST_VALID_TIME = '2026-09-27T23:59:59.999+08:00'
const EXPIRED_TIME = '2026-09-28T00:00:00.000+08:00'

// Run the actual source with only the external Supabase/PayPal environment mocked.
// No dependencies, live credentials or network requests are needed.
function loadSource(path, names, overrides = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '')
    .replace(/^export default /gm, 'const app = ')
    .replace(/^export /gm, '')
  const sandbox = {
    Date, Request, Response, btoa, crypto,
    console: { error() {}, warn() {}, log() {} },
    Deno: { env: { get: () => 'test-value' } },
    withSupabase: (_config, handler) => handler,
    ...overrides,
  }
  vm.runInNewContext(stripTypeScriptTypes(source) + `\nglobalThis.result = { ${names.join(', ')} };`, sandbox)
  return sandbox.result
}

function clockAt(iso) {
  return class extends Date { static now() { return Date.parse(iso) } }
}

function capturedOrder(time) {
  return {
    id: 'ORDER123', status: 'COMPLETED',
    purchase_units: [{
      custom_id: 'PC|PLAYER|V1|CHARACTER',
      description: 'Diamond Package ×1 | PlayCrows V1',
      payments: { captures: [{
        id: 'CAPTURE123', status: 'COMPLETED', create_time: time,
        amount: { currency_code: 'USD', value: '450.00' },
      }] },
    }],
  }
}

function paypalFetch(order) {
  return async url => Response.json(String(url).endsWith('/v1/oauth2/token')
    ? { access_token: 'test-token' }
    : order)
}

test('WEEKEND10 remains active for both shops through the entire September 27 Singapore day', () => {
  const { isEarlyPromoActive } = loadSource('src/promo.ts', ['isEarlyPromoActive'])
  for (const server of ['v1', 'v2']) {
    assert.equal(isEarlyPromoActive(server, new Date('2026-09-25T12:00:00+08:00')), true)
    assert.equal(isEarlyPromoActive(server, new Date(LAST_VALID_TIME)), true)
    assert.equal(isEarlyPromoActive(server, new Date(EXPIRED_TIME)), false)
  }
  assert.equal(isEarlyPromoActive('invalid', new Date(LAST_VALID_TIME)), false)
})

test('frontend, checkout, submission and recovery use the same exclusive deadline', () => {
  const frontend = loadSource('src/promo.ts', ['EARLY_PROMO_END_ISO'])
  assert.equal(Date.parse(frontend.EARLY_PROMO_END_ISO), Date.parse(EXPIRED_TIME))
  for (const name of ['paypal-checkout', 'submit-donation', 'recover-paypal-payment']) {
    const edge = loadSource(`supabase/edgefunction/${name}/index.ts`, ['EARLY_PROMO_END_TIMESTAMP'])
    assert.equal(edge.EARLY_PROMO_END_TIMESTAMP, Date.parse(EXPIRED_TIME), name)
  }
})

test('PayPal prices $500 at $450 up to the last millisecond and rejects the code at midnight', () => {
  for (const server of ['v1', 'v2']) {
    const active = loadSource('supabase/edgefunction/paypal-checkout/index.ts', ['calculateAmount'], { Date: clockAt(LAST_VALID_TIME) })
    assert.equal(active.calculateAmount(server, { amount: 500 }, 1, 'WEEKEND10'), 450)
    const expired = loadSource('supabase/edgefunction/paypal-checkout/index.ts', ['calculateAmount'], { Date: clockAt(EXPIRED_TIME) })
    assert.throws(() => expired.calculateAmount(server, { amount: 500 }, 1, 'WEEKEND10'), /expired/)
    assert.equal(expired.calculateAmount(server, { amount: 500 }, 1, ''), 500)
  }
})

test('PayPal capture rejects an expired discounted order before any payment API request', async () => {
  const { app } = loadSource('supabase/edgefunction/paypal-checkout/index.ts', ['app'], {
    Date: clockAt(EXPIRED_TIME),
    fetch: async () => assert.fail('An expired promo must not charge the buyer'),
  })
  const response = await app.fetch(new Request('https://example.test/checkout', {
    method: 'POST', body: JSON.stringify({ action: 'capture', server: 'v1', orderId: 'ORDER123', promoCode: 'WEEKEND10' }),
  }))
  assert.equal(response.status, 409)
  assert.match((await response.json()).error, /expired/)
})

test('submission honors a timely PayPal capture after expiry but rejects a late or unverified capture date', async () => {
  for (const time of [LAST_VALID_TIME, EXPIRED_TIME, 'invalid', undefined]) {
    const { verifyPayPalOrder } = loadSource('supabase/edgefunction/submit-donation/index.ts', ['verifyPayPalOrder'], {
      Date: clockAt('2026-09-29T00:00:00+08:00'), fetch: paypalFetch(capturedOrder(time)),
    })
    const promise = verifyPayPalOrder({
      server: 'v1', orderId: 'ORDER123', captureId: 'CAPTURE123', playerId: 'PLAYER',
      username: 'CHARACTER', expectedAmountUsd: 450, promoCode: 'WEEKEND10',
    })
    if (time === LAST_VALID_TIME) await assert.doesNotReject(promise)
    else await assert.rejects(promise, /promotion had already ended/)
  }
})

test('admin recovery uses capture time, allowing later recovery only for a timely promo payment', async () => {
  for (const time of [LAST_VALID_TIME, EXPIRED_TIME, undefined]) {
    let inserted = false
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) },
      from(table) {
        const query = {
          select() { return query }, eq() { return query }, or() { return query }, limit() { return query },
          maybeSingle: async () => ({ data: table === 'admin_users' ? { user_id: 'admin' } : null }),
          insert() { inserted = true; return query },
          single: async () => ({ data: { id: 'donation', reference_code: 'REF123' } }),
        }
        return query
      },
    }
    const { app } = loadSource('supabase/edgefunction/recover-paypal-payment/index.ts', ['app'], {
      Date: clockAt('2026-09-29T00:00:00+08:00'), fetch: paypalFetch(capturedOrder(time)),
      createClient: () => client,
    })
    const response = await app.fetch(new Request('https://example.test/recover', {
      method: 'POST', headers: { authorization: 'Bearer test-token' },
      body: JSON.stringify({ server: 'v1', paypalId: 'ORDER123' }),
    }))
    assert.equal(response.status, time === LAST_VALID_TIME ? 200 : 422)
    assert.equal(inserted, time === LAST_VALID_TIME)
  }
})
