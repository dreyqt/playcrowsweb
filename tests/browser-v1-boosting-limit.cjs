// Focused pre-payment regression for V1 Boosting: each tier once per account.
// All external requests are intercepted. This test cannot create a real payment.
const { chromium, expect } = require('@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')

const baseUrl = process.env.CHECKOUT_TEST_URL || 'http://127.0.0.1:4173'
const artifacts = process.env.CHECKOUT_TEST_ARTIFACTS || path.resolve('work/qa/v1-boosting-limit')
const results = []
const limitText = /once per account|one purchase per account/i
const paymentHeading = page => page.getByRole('heading', { name: 'Choose Your Payment Method' })
const continuePayment = page => page.getByRole('button', { name: 'Continue to Payment', exact: true })
const loginInput = page => page.getByPlaceholder('Enter your Login ID')
const key = (account, tier) => `${account.trim().toLowerCase()}:${tier}`

async function mockNetwork(page) {
  const state = { checks: [], forbiddenPayments: [], blocked: [], purchased: new Set(), nextResponse: null }
  await page.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/functions/v1/paypal-checkout')) {
      const body = request.postDataJSON()
      if (body.action !== 'check-boosting-eligibility') {
        state.forbiddenPayments.push(body)
        return route.abort('blockedbyclient')
      }
      state.checks.push(body)
      const nextResponse = state.nextResponse
      state.nextResponse = null
      if (nextResponse) return nextResponse(route, body)
      const purchased = state.purchased.has(key(body.playerId, body.selectedPackageId))
      return route.fulfill({
        status: purchased ? 409 : 200,
        contentType: 'application/json',
        body: JSON.stringify(purchased
          ? { error: 'This account has already purchased this V1 Boosting tier. Each tier is available once per account.', code: 'V1_BOOSTING_LIMIT' }
          : { eligible: true }),
      })
    }
    if (url.pathname.endsWith('/functions/v1/submit-donation') || url.hostname.endsWith('paypal.com')) {
      state.forbiddenPayments.push(request.url())
      return route.abort('blockedbyclient')
    }
    if (url.origin === new URL(baseUrl).origin) return route.continue()
    state.blocked.push(request.url())
    return route.abort('blockedbyclient')
  })
  return state
}

async function openShop(page, server = 'v1') {
  await page.goto(baseUrl)
  await chooseServer(page, server)
}
async function chooseServer(page, server) {
  await page.getByRole('button', { name: new RegExp(`PlayCrows ${server.toUpperCase()}`) }).click()
  await page.locator('.gift-package-tabs button').filter({ hasText: /^Boosting Packs$/ }).click()
}
function tierCard(page, amount) {
  return page.locator('article.gift-package-card').filter({ has: page.getByText(`$${amount.toLocaleString('en-US')}`, { exact: true }) })
}
async function selectTier(page, amount) {
  await tierCard(page, amount).getByRole('button', { name: 'Select BOOSTING PACKAGE', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Support Amount', exact: true })).toBeVisible()
}
async function playerInfo(page, account = 'fresh-account') {
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await loginInput(page).fill(account)
  await page.getByPlaceholder('Enter your in-game character name').fill('Regression Hero')
}
async function expectFixedOne(page, amount) {
  await expect(page.getByRole('spinbutton')).toHaveValue('1')
  await expect(page.getByRole('spinbutton')).toHaveAttribute('readonly', '')
  await expect(page.getByRole('spinbutton')).toHaveAttribute('max', '1')
  await expect(page.getByRole('button', { name: /(?:increase|decrease) quantity/i })).toHaveCount(0)
  await expect(page.locator('main')).toContainText(limitText)
  await expect(page.getByText('Total payment', { exact: true }).locator('..')).toContainText(`$${amount.toLocaleString('en-US')}`)
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
}
async function expectNoPayment(page, state) {
  await expect(paymentHeading(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /GCash|PayPal Pay securely|Wise|Bybit/ })).toHaveCount(0)
  assert.deepEqual(state.forbiddenPayments, [], 'No payment or donation request was attempted')
}
async function screenshot(page, filename) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(120)
  await page.screenshot({ path: path.join(artifacts, filename), fullPage: await page.getByRole('dialog').count() === 0, animations: 'disabled' })
}
async function fitsViewport(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow')
}

async function catalogAndQuantities(page, mobile) {
  const state = await mockNetwork(page)
  await openShop(page)
  await expect(page.locator('article.gift-package-card')).toHaveCount(4)
  for (const amount of [50, 200, 500, 1000]) {
    const card = tierCard(page, amount)
    await expect(card).toContainText(limitText)
    await card.getByRole('button', { name: 'View rewards', exact: true }).click()
    await expect(page.getByRole('dialog')).toContainText(limitText)
    await page.keyboard.press('Escape')
  }
  await fitsViewport(page)
  await screenshot(page, `v1-limit-catalog-${mobile ? 'mobile' : 'desktop'}.png`)
  for (const amount of [50, 200, 500, 1000]) {
    await selectTier(page, amount)
    await expectFixedOne(page, amount)
    await fitsViewport(page)
    if (amount === 50) await screenshot(page, `v1-limit-quantity-${mobile ? 'mobile' : 'desktop'}.png`)
    await page.getByRole('button', { name: 'Change Package', exact: true }).click()
  }
  assert.equal(state.checks.length, 0, 'Browsing does not probe purchase history')
  assert.deepEqual(state.forbiddenPayments, [])
}

async function duplicatesBeforePayment(page) {
  const state = await mockNetwork(page)
  for (const amount of [50, 200, 500, 1000]) {
    state.purchased.add(key('existing-account', `boosting-${amount}`))
    await openShop(page)
    await selectTier(page, amount)
    await playerInfo(page, 'existing-account')
    await continuePayment(page).click()
    await expect(page.getByRole('alert')).toContainText(/already purchased/i)
    await expect(continuePayment(page)).toBeEnabled()
    await expectNoPayment(page, state)
    assert.deepEqual(state.checks.at(-1), {
      action: 'check-boosting-eligibility', server: 'v1', selectedPackageId: `boosting-${amount}`, playerId: 'existing-account',
    })
    if (amount === 50) await screenshot(page, 'v1-limit-duplicate.png')
    // Another account is eligible for the same tier; all payment methods are
    // behind the successful eligibility check, including manual payments.
    await loginInput(page).fill(`new-account-${amount}`)
    await continuePayment(page).click()
    await expect(paymentHeading(page)).toBeVisible()
    await expect(page.getByRole('button', { name: /GCash/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /PayPal Pay securely/ })).toBeVisible()
    await page.getByRole('button', { name: /GCash/ }).click()
    await expect(page.getByRole('button', { name: 'Continue to Receipt', exact: true })).toBeEnabled()
  }
  assert.equal(state.checks.length, 8)
  assert.deepEqual(state.forbiddenPayments, [])
}

async function eachTierIndependent(page) {
  const state = await mockNetwork(page)
  state.purchased.add(key('tier-account', 'boosting-50'))
  await openShop(page)
  await selectTier(page, 50)
  await playerInfo(page, 'tier-account')
  await continuePayment(page).click()
  await expect(page.getByRole('alert')).toContainText(/already purchased/i)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByRole('button', { name: 'Change Package', exact: true }).click()
  await selectTier(page, 200)
  await playerInfo(page, 'tier-account')
  await continuePayment(page).click()
  await expect(paymentHeading(page)).toBeVisible()
  assert.deepEqual(state.checks.map(check => check.selectedPackageId), ['boosting-50', 'boosting-200'])
  assert.ok(state.checks.every(check => check.playerId === 'tier-account'))
  assert.deepEqual(state.forbiddenPayments, [])
}

async function failedCheckCanRetry(page, failure) {
  const state = await mockNetwork(page)
  state.nextResponse = failure
  await openShop(page)
  await selectTier(page, 50)
  await playerInfo(page)
  await continuePayment(page).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('alert')).not.toHaveText('')
  await expect(continuePayment(page)).toBeEnabled()
  await expectNoPayment(page, state)
  await continuePayment(page).click()
  await expect(paymentHeading(page)).toBeVisible()
  assert.equal(state.checks.length, 2, 'A retry actually rechecks eligibility')
  assert.deepEqual(state.forbiddenPayments, [])
}

async function pendingCheckBlocksProgress(page) {
  const state = await mockNetwork(page)
  let complete
  state.nextResponse = route => new Promise(resolve => {
    complete = async () => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ eligible: true }) })
      resolve()
    }
  })
  await openShop(page)
  await selectTier(page, 50)
  await playerInfo(page)
  await continuePayment(page).click()
  await expect.poll(() => state.checks.length).toBe(1)
  await expect(page.getByRole('button', { name: /checking|continue to payment/i })).toBeDisabled()
  await expectNoPayment(page, state)
  await complete()
  await expect(paymentHeading(page)).toBeVisible()
  assert.equal(state.checks.length, 1)
}

async function switchingServers(page) {
  const state = await mockNetwork(page)
  await openShop(page, 'v2')
  await expect(tierCard(page, 50)).not.toContainText(limitText)
  await selectTier(page, 50)
  await page.getByRole('spinbutton').fill('3')
  await expect(page.getByText('Total payment', { exact: true }).locator('..')).toContainText('$150')
  await expect(page.getByRole('complementary', { name: 'Boosting Package Bonuses' })).toContainText('$300')
  await playerInfo(page, 'existing-account')
  await continuePayment(page).click()
  await expect(paymentHeading(page)).toBeVisible()
  assert.equal(state.checks.length, 0, 'V2 has no V1 limit check')

  await page.getByRole('button', { name: 'Change', exact: true }).click()
  await chooseServer(page, 'v1')
  await selectTier(page, 50)
  await expectFixedOne(page, 50)
  await playerInfo(page)
  await continuePayment(page).click()
  await expect(paymentHeading(page)).toBeVisible()
  assert.equal(state.checks.length, 1, 'Returning to V1 restores its limit check')

  await page.getByRole('button', { name: 'Change', exact: true }).click()
  await chooseServer(page, 'v2')
  await selectTier(page, 50)
  await expect(page.getByRole('spinbutton')).toHaveValue('1')
  await page.getByRole('button', { name: /increase quantity/i }).click()
  await expect(page.getByRole('spinbutton')).toHaveValue('2')
  await expect(page.getByRole('complementary', { name: 'Boosting Package Bonuses' })).toContainText('$200')
  assert.deepEqual(state.forbiddenPayments, [])
}

async function otherV1PackagesUnaffected(page) {
  const state = await mockNetwork(page)
  await openShop(page)
  await page.locator('.gift-package-tabs button').filter({ hasText: /^Currency$/ }).click()
  const card = page.locator('article.gift-package-card').first()
  await expect(card).not.toContainText(limitText)
  await card.locator('.gift-package-card__button').click()
  await page.getByRole('spinbutton').fill('2')
  await expect(page.getByRole('spinbutton')).toHaveValue('2')
  await playerInfo(page)
  await continuePayment(page).click()
  await expect(paymentHeading(page)).toBeVisible()
  assert.equal(state.checks.length, 0, 'Other V1 categories retain their original checkout')
  assert.deepEqual(state.forbiddenPayments, [])
}

async function runCase(browser, name, fn, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 1000 }, locale: 'en-US', timezoneId: 'Asia/Singapore', serviceWorkers: 'block' })
  await context.addInitScript(() => localStorage.setItem('playcrows-language', 'en'))
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.clock.setFixedTime(new Date('2026-10-15T04:00:00Z'))
    await fn(page)
    assert.deepEqual(errors, [], 'No uncaught browser errors')
    results.push({ name, result: 'PASS' })
    console.log(`PASS ${name}`)
  } catch (error) {
    await screenshot(page, `${name}-failure.png`).catch(() => {})
    await fs.writeFile(path.join(artifacts, `${name}-failure.txt`), await page.locator('body').innerText().catch(() => '')).catch(() => {})
    results.push({ name, result: 'FAIL', error: error.stack })
    console.error(`FAIL ${name}: ${error.message}`)
  } finally { await context.close() }
}

async function main() {
  await fs.mkdir(artifacts, { recursive: true })
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    await runCase(browser, 'v1-limit-catalog-desktop', page => catalogAndQuantities(page, false))
    await runCase(browser, 'v1-limit-catalog-mobile', page => catalogAndQuantities(page, true), true)
    await runCase(browser, 'v1-limit-all-tiers-block-before-payment', duplicatesBeforePayment, true)
    await runCase(browser, 'v1-limit-other-tier-remains-eligible', eachTierIndependent)
    await runCase(browser, 'v1-limit-network-failure-retry', page => failedCheckCanRetry(page, route => route.abort('failed')))
    await runCase(browser, 'v1-limit-service-failure-retry', page => failedCheckCanRetry(page, route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Eligibility service unavailable. Please retry.' }) })))
    await runCase(browser, 'v1-limit-malformed-success-fails-closed', page => failedCheckCanRetry(page, route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })))
    await runCase(browser, 'v1-limit-pending-check-blocks-payment', pendingCheckBlocksProgress)
    await runCase(browser, 'v1-limit-server-switch-v2-unaffected', switchingServers)
    await runCase(browser, 'v1-limit-other-categories-unaffected', otherV1PackagesUnaffected)
  } finally {
    await browser.close()
    await fs.writeFile(path.join(artifacts, 'v1-boosting-limit-results.json'), JSON.stringify(results, null, 2))
  }
  if (results.some(result => result.result === 'FAIL')) process.exitCode = 1
}
main().catch(error => { console.error(error); process.exitCode = 1 })
