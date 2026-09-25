// Run with Playwright installed and a local Vite instance using fake API keys.
// NODE_PATH may point to an isolated QA install so project dependencies stay unchanged.
const { chromium, expect } = require('@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')

const baseUrl = process.env.CHECKOUT_TEST_URL || 'http://127.0.0.1:4173'
const artifacts = process.env.CHECKOUT_TEST_ARTIFACTS || path.resolve('work/qa/artifacts')
const results = []
const receipt = {
  name: 'mock-payment-receipt.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\nLocal test receipt only.\n%%EOF'),
}
const sdk = `window.paypal = { Buttons(options) {
  let button;
  return {
    async render(container) {
      button = document.createElement('button');
      button.textContent = 'Complete mocked PayPal payment';
      button.onclick = async () => {
        try {
          const orderID = await options.createOrder();
          await options.onApprove({orderID});
        } catch (error) { options.onError(error); }
      };
      container.appendChild(button);
    },
    async close() { if (button) button.remove(); }
  };
}};`

async function mockNetwork(page, settings = {}) {
  const state = { catalogs: [], paypal: [], submissions: [], blocked: [], failCatalog: false, incompleteCatalog: false, failSubmission: false, ...settings }
  await page.route('**/*', async route => {
    const req = route.request()
    const url = new URL(req.url())
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.hostname === 'www.paypal.com' && url.pathname === '/sdk/js') {
      return route.fulfill({ contentType: 'text/javascript', body: sdk })
    }
    if (url.pathname.endsWith('/rpc/get_donation_event_bonus_catalog')) {
      const body = req.postDataJSON()
      state.catalogs.push(body)
      if (state.failCatalog) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Mock catalog temporarily unavailable' }) })
      return json(Array.from({length: state.incompleteCatalog ? 2 : 8}, (_, i) => ({event_number: i + 1, title: `${body.p_server.toUpperCase()} bonus reward ${i + 1}`, rewards: [`Reward ${i + 1} material bundle`, `Reward ${i + 1} supply chest`]})))
    }
    if (url.pathname.endsWith('/rest/v1/events')) {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Mock fallback temporarily unavailable' }) })
    }
    if (url.pathname.endsWith('/functions/v1/paypal-checkout')) {
      const body = req.postDataJSON()
      state.paypal.push(body)
      return json(body.action === 'create' ? { orderId: 'LOCAL-ORDER-123' } : { orderId: 'LOCAL-ORDER-123', captureId: 'LOCAL-CAPTURE-123', status: 'COMPLETED', amount: '90.00', currency: 'USD' })
    }
    if (url.pathname.endsWith('/functions/v1/submit-donation')) {
      state.submissions.push(req.postDataBuffer().toString('utf8'))
      if (state.failSubmission) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Mock temporary submission failure. Please try again.' }) })
      return json({ success: true, message: 'Local test only', donation: { id: 'local-id', referenceCode: 'LOCAL-TEST-123', createdAt: '2026-09-25T00:00:00Z', status: 'pending' } })
    }
    if (url.origin === new URL(baseUrl).origin) return route.continue()
    state.blocked.push(req.url())
    return route.abort('blockedbyclient')
  })
  return state
}

async function startPayment(page, server, amount, quantity = 1, promo = false) {
  await page.goto(baseUrl)
  await page.getByRole('button', { name: new RegExp(`PlayCrows ${server.toUpperCase()}`) }).click()
  const card = page.locator('article').filter({ has: page.getByText(`$${amount.toLocaleString()}`, { exact: true }) }).first()
  await card.getByRole('button', { name: /^Select / }).click()
  if (quantity !== 1) await page.getByRole('spinbutton').fill(String(quantity))
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByPlaceholder('Enter your Login ID').fill('local-test-account')
  await page.getByPlaceholder('Enter your in-game character name').fill('Local Test Hero')
  await page.getByRole('button', { name: 'Continue to Payment', exact: true }).click()
  if (promo) {
    await page.getByPlaceholder('Enter redeem code').fill('weekend10')
    await page.getByRole('button', { name: 'Apply Code', exact: true }).click()
    await expect(page.getByText(/applied successfully/i)).toBeVisible()
  }
}

async function manualBonus(page) {
  await page.getByRole('button', { name: /GCash/ }).click()
  await page.getByRole('button', { name: 'Continue to Receipt', exact: true }).click()
  await expect(page.getByRole('button', { name: /Continue to Bonus/i })).toBeDisabled()
  await page.locator('#payment-receipt').setInputFiles(receipt)
  await page.locator('#additional-notes').fill('Local mocked checkout verification')
  await page.getByRole('button', { name: /Continue to Bonus/i }).click()
  await expect(page.getByRole('heading', { name: /Choose Your Bonus Rewards/i })).toBeVisible()
}

const reviewButton = page => page.getByRole('button', { name: 'Review submission', exact: true })
const add = (page, number) => page.getByRole('button', { name: new RegExp(`^Add 1 bundle: EVENT${number} · `) })
const remove = (page, number) => page.getByRole('button', { name: new RegExp(`^Remove 1 bundle: EVENT${number} · `) })
async function choose(page, number, count) { for (let i = 0; i < count; i++) await add(page, number).click() }
async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Page must fit viewport width')
}
async function screenshot(page, name, fullPage = true) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(artifacts, name), fullPage, animations: 'disabled' })
}

async function runCase(browser, name, fn, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? {width: 390, height: 844} : {width: 1280, height: 1000}, timezoneId: 'Asia/Singapore' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.clock.setFixedTime(new Date('2026-09-25T04:00:00Z'))
    await fn(page)
    assert.deepEqual(errors, [], 'No uncaught browser errors')
    results.push({ name, result: 'PASS' })
    console.log(`PASS ${name}`)
  } catch (error) {
    await page.screenshot({ path: path.join(artifacts, `${name}-failure.png`), fullPage: true }).catch(() => {})
    await fs.writeFile(path.join(artifacts, `${name}-failure.txt`), await page.locator('body').innerText().catch(() => '')).catch(() => {})
    results.push({ name, result: 'FAIL', error: error.stack })
    console.error(`FAIL ${name}: ${error.message}`)
  } finally { await context.close() }
}

async function main() {
  await fs.mkdir(artifacts, { recursive: true })
  const browser = await chromium.launch({ headless: true, channel: 'msedge' })
  await runCase(browser, 'manual-500-mixed-review-submit', async page => {
    const state = await mockNetwork(page)
    await startPayment(page, 'v1', 500, 1, true)
    await manualBonus(page)
    await expect(add(page, '007')).toBeVisible()
    await expect(add(page, '008')).toHaveCount(0)
    await expect(reviewButton(page)).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Submit Donation Form' })).toHaveCount(0)
    assert.equal(state.submissions.length, 0)
    await choose(page, '001', 3)
    await choose(page, '002', 2)
    await expect(reviewButton(page)).toBeEnabled()
    for (const number of ['001', '002', '003', '007']) await expect(add(page, number)).toBeDisabled()
    await remove(page, '001').click()
    await expect(reviewButton(page)).toBeDisabled()
    await choose(page, '001', 1)
    await screenshot(page, 'bonus-desktop.png')
    await page.setViewportSize({ width: 390, height: 844 })
    await noOverflow(page)
    await screenshot(page, 'bonus-mobile.png')
    await screenshot(page, 'bonus-mobile-viewport.png', false)
    await page.setViewportSize({ width: 1280, height: 1000 })
    await reviewButton(page).click()
    await expect(page.getByRole('heading', { name: 'Review Your Submission' })).toBeVisible()
    await expect(page.getByText(/EVENT001 ×3, EVENT002 ×2/)).toBeVisible()
    await expect(add(page, '001')).toHaveCount(0)
    assert.equal(state.submissions.length, 0)
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(reviewButton(page)).toBeEnabled()
    await expect(add(page, '001')).toBeDisabled()
    await reviewButton(page).click()
    await screenshot(page, 'review-desktop.png')
    await page.getByRole('button', { name: 'Submit Donation Form', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Donation Form Submitted' })).toBeVisible()
    assert.equal(state.submissions.length, 1)
    assert.match(state.submissions[0], /\{"001":3,"002":2\}/)
    assert.match(state.submissions[0], /WEEKEND10/)
    assert.match(state.submissions[0], /mock-payment-receipt\.pdf/)
    assert.ok(state.catalogs.every(row => row.p_server === 'v1'))
    assert.deepEqual(state.blocked, [])
  })
  await runCase(browser, 'paypal-v2-verified-bonus-review-mobile', async page => {
    const state = await mockNetwork(page)
    await startPayment(page, 'v2', 100, 1, true)
    await page.getByRole('button', { name: /PayPal Pay securely/ }).click()
    await expect(page.getByRole('button', { name: /Continue to Bonus/i })).toBeDisabled()
    await page.getByRole('button', { name: 'Complete mocked PayPal payment', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Choose Your Bonus Rewards/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Upload Payment Receipt' })).toHaveCount(0)
    await expect(add(page, '006')).toBeVisible()
    await expect(add(page, '007')).toHaveCount(0)
    await choose(page, '006', 1)
    await noOverflow(page)
    await screenshot(page, 'bonus-mobile-v2.png')
    assert.equal(state.submissions.length, 0)
    await reviewButton(page).click()
    await expect(page.getByText(/EVENT006 ×1/)).toBeVisible()
    await expect(page.getByText('Verified by PayPal · LOCAL-CAPTURE-123')).toBeVisible()
    await noOverflow(page)
    await screenshot(page, 'review-mobile.png')
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Choose Your Payment Method' })).toBeVisible()
    await page.getByRole('button', { name: /Continue to Bonus/i }).click()
    await expect(reviewButton(page)).toBeEnabled()
    await reviewButton(page).click()
    await page.getByRole('button', { name: 'Submit Donation Form', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Donation Form Submitted' })).toBeVisible()
    assert.equal(state.paypal.length, 2)
    assert.deepEqual(state.paypal.map(request => request.action), ['create', 'capture'])
    assert.ok(state.paypal.every(request => request.server === 'v2'))
    assert.equal(state.submissions.length, 1)
    assert.match(state.submissions[0], /LOCAL-CAPTURE-123/)
    assert.match(state.submissions[0], /\{"006":1\}/)
    assert.ok(state.catalogs.every(row => row.p_server === 'v2'))
    assert.deepEqual(state.blocked, [])
  }, true)
  await runCase(browser, 'under-100-no-rewards', async page => {
    const state = await mockNetwork(page)
    await startPayment(page, 'v1', 50)
    await manualBonus(page)
    await expect(reviewButton(page)).toBeEnabled()
    await expect(add(page, '001')).toHaveCount(0)
    assert.equal(state.catalogs.length, 0)
    await reviewButton(page).click()
    await expect(page.getByRole('heading', { name: 'Review Your Submission' })).toBeVisible()
    await page.getByRole('button', { name: 'Submit Donation Form', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Donation Form Submitted' })).toBeVisible()
    assert.match(state.submissions[0], /name="eventBonusSelections"\r\n\r\n\{\}/)
  })
  await runCase(browser, 'catalog-and-submission-retry-quantity-500', async page => {
    const state = await mockNetwork(page, { failCatalog: true })
    await startPayment(page, 'v1', 100, 5)
    await manualBonus(page)
    await expect(page.getByRole('alert')).toContainText(/could not load/i)
    await expect(reviewButton(page)).toBeDisabled()
    state.failCatalog = false
    state.incompleteCatalog = true
    await page.getByRole('button', { name: /Try again|Retry/i }).click()
    await expect(page.getByRole('alert')).toContainText(/7/)
    await expect(reviewButton(page)).toBeDisabled()
    state.incompleteCatalog = false
    await page.getByRole('button', { name: /Try again|Retry/i }).click()
    await choose(page, '003', 5)
    await expect(reviewButton(page)).toBeEnabled()
    await expect(add(page, '003')).toBeDisabled()
    await reviewButton(page).click()
    await expect(page.getByText(/EVENT003 ×5/)).toBeVisible()
    state.failSubmission = true
    await page.getByRole('button', { name: 'Submit Donation Form', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Mock temporary submission failure')
    await expect(page.getByText(/EVENT003 ×5/)).toBeVisible()
    state.failSubmission = false
    await page.getByRole('button', { name: 'Submit Donation Form', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Donation Form Submitted' })).toBeVisible()
    assert.equal(state.submissions.length, 2)
    assert.match(state.submissions[1], /\{"003":5\}/)
  })
  await browser.close()
  await fs.writeFile(path.join(artifacts, 'results.json'), JSON.stringify(results, null, 2))
  if (results.some(result => result.result === 'FAIL')) process.exitCode = 1
}
main().catch(error => { console.error(error); process.exitCode = 1 })
