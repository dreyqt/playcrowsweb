// All external requests are mocked or blocked. No live payment is created.
// Set NODE_PATH to an existing installation of @playwright/test before running.
const { chromium, expect } = require('@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { spawn } = require('node:child_process')

const baseUrl = process.env.CHECKOUT_TEST_URL || 'http://127.0.0.1:4187'
const artifacts = process.env.CHECKOUT_TEST_ARTIFACTS || path.resolve('../december-qa')
const tiers = [50, 100, 200, 500, 1000]
const rewardCounts = [35, 35, 36, 39, 39]
const price = value => `$${value.toLocaleString('en-US')}`
const results = []

async function mockNetwork(page) {
  const state = { submissions: [], paymentRequests: [] }
  await page.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname.endsWith('/rpc/get_mount_preorder_campaign')) return json({ active: false, starts_at: null })
    if (url.pathname.endsWith('/rpc/get_donation_event_bonus_catalog')) {
      return json(Array.from({ length: 7 }, (_, i) => ({ event_number: i + 1, title: `Local reward ${i + 1}`, rewards: ['Mock reward material'] })))
    }
    if (url.pathname.endsWith('/functions/v1/submit-donation')) {
      state.submissions.push(request.postDataBuffer().toString('utf8'))
      return json({ success: true, donation: { id: 'local-december', referenceCode: 'LOCAL-DECEMBER', createdAt: '2026-11-21T00:00:00Z', status: 'pending' } })
    }
    if (url.pathname.includes('/functions/')) state.paymentRequests.push(request.url())
    if (url.origin === new URL(baseUrl).origin) return route.continue()
    return route.abort('blockedbyclient')
  })
  return state
}

async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Page fits viewport')
}
async function openShop(page) {
  await page.goto(baseUrl)
  await expect(page.locator('.gift-package-tabs__button--active')).toHaveText('December Packages')
  await expect(page.locator('article.gift-package-card')).toHaveCount(5)
  await expect(page.locator('.gift-package-tabs')).not.toContainText(/September|October|November/)
  await expect(page.locator('main')).not.toContainText(/September packages|November Package|October Package/)
}
function packageCard(page, amount) {
  return page.locator('article.gift-package-card').filter({ has: page.getByText(price(amount), { exact: true }) })
}
async function checkNotice(page) {
  const notice = page.getByRole('complementary', { name: 'Garuda of Eternity Wings', exact: true })
  await expect(notice).toBeVisible()
  await expect(notice).toContainText('$2,500')
  await expect(notice).toContainText('Only December packages count')
  await expect(notice).toContainText('full listed USD value')
  await expect(notice).toContainText('Discounts do not reduce')
  await expect(notice).toContainText('One reward per player')
  await expect(notice.locator('img')).toBeVisible()
  await expect.poll(() => notice.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
  await expect(notice.getByRole('progressbar')).toHaveCount(0)
}
async function catalog(page, mobile) {
  const state = await mockNetwork(page)
  await openShop(page)
  await checkNotice(page)
  await noOverflow(page)
  await page.screenshot({ path: path.join(artifacts, `december-${mobile ? 'mobile' : 'desktop'}.png`), fullPage: true, animations: 'disabled' })
  for (let index = 0; index < tiers.length; index++) {
    const amount = tiers[index]
    await packageCard(page, amount).getByRole('button', { name: 'View rewards', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('.gift-rewards-modal__price')).toHaveText(price(amount))
    await expect(dialog.locator('.gift-package-card__reward-row')).toHaveCount(rewardCounts[index])
    await expect(dialog).not.toContainText('Garuda of Eternity Wings')
    if (amount === 200) {
      const accessory = dialog.locator('.gift-package-card__reward-row').filter({ hasText: 'Shining Accessory Enhancement Scroll Chest (Bound)' })
      await expect(accessory.locator('.gift-package-card__reward-quantity')).toHaveText('×300')
      await expect(dialog).toContainText('Phoeneia of the Sun')
    }
    if (amount === 500) { await expect(dialog).toContainText('Levatos of Tidal Waves'); await expect(dialog).toContainText('Auroral Albanion') }
    if (amount === 1000) { await expect(dialog).toContainText('Stymphalox of Steel'); await expect(dialog).toContainText('Mantikar of Nebula') }
    await noOverflow(page)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  }
  assert.deepEqual(state.submissions, [])
  assert.deepEqual(state.paymentRequests, [])
}
async function checkout(page) {
  const state = await mockNetwork(page)
  for (const amount of tiers) {
    await openShop(page)
    await packageCard(page, amount).getByRole('button', { name: 'Select DECEMBER PACKAGE', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Support Amount', exact: true })).toBeVisible()
    await checkNotice(page)
    await page.getByRole('spinbutton').fill('2')
    await expect(page.getByText('Total payment', { exact: true }).locator('..')).toContainText(price(amount * 2))
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
    await page.getByRole('spinbutton').fill('0')
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
    await noOverflow(page)
  }
  await page.getByRole('spinbutton').fill('1')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByPlaceholder('Enter your Login ID').fill('local-december-test')
  await page.getByPlaceholder('Enter your in-game character name').fill('Local December Hero')
  await page.getByRole('button', { name: 'Continue to Payment', exact: true }).click()
  await page.getByRole('button', { name: /GCash/ }).click()
  await page.getByRole('button', { name: 'Continue to Receipt', exact: true }).click()
  await page.locator('#payment-receipt').setInputFiles({ name: 'local-test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nLocal mocked receipt.\n%%EOF') })
  await page.getByRole('button', { name: /Continue to Bonus/i }).click()
  await page.getByRole('button', { name: 'Use all 10 remaining choices here', exact: true }).first().click()
  await page.getByRole('button', { name: 'Review submission', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Review Your Submission', exact: true })).toBeVisible()
  await checkNotice(page)
  await page.screenshot({ path: path.join(artifacts, 'december-checkout-review.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: 'Submit Donation Form', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Donation Form Submitted', exact: true })).toBeVisible()
  assert.equal(state.submissions.length, 1)
  assert.match(state.submissions[0], /december-supply-1000/)
  assert.match(state.submissions[0], /DECEMBER PACKAGE/)
  assert.deepEqual(state.paymentRequests, [])
}
async function locales(page) {
  await mockNetwork(page)
  await openShop(page)
  const expected = [
    ['한국어', '12월 패키지', '플레이어당 1회', '정가(USD)'],
    ['ไทย', 'แพ็กเกจเดือนธันวาคม', 'หนึ่งครั้งต่อผู้เล่น', 'ราคาเต็ม'],
    ['Português', 'Pacotes de Dezembro', 'Uma recompensa por jogador', 'preço integral listado em USD'],
    ['繁體中文', '十二月方案', '每位玩家限領一次', '美元原價'],
    ['Русский', 'Декабрьские пакеты', 'Одна награда на игрока', 'полной указанной цене в USD'],
    ['English', 'December Packages', 'One reward per player', 'full listed USD value'],
  ]
  for (const [label, title, once, basis] of expected) {
    await page.getByRole('button', { name: /^Language:/ }).click()
    await page.getByRole('option').filter({ hasText: label }).click()
    await expect(page.locator('.gift-package-tabs__button--active')).toHaveText(title)
    await expect(page.locator('article.gift-package-card')).toHaveCount(5)
    const notice = page.getByRole('complementary', { name: 'Garuda of Eternity Wings', exact: true })
    await expect(notice).toContainText(once)
    await expect(notice).toContainText(basis)
    await noOverflow(page)
  }
}
async function runCase(browser, name, run, width = 1366) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en-US', timezoneId: 'Asia/Singapore' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await run(page)
    assert.deepEqual(errors, [])
    results.push({ name, result: 'PASS' })
    console.log(`PASS ${name}`)
  } catch (error) {
    await page.screenshot({ path: path.join(artifacts, `${name}-failure.png`), fullPage: true }).catch(() => {})
    await fs.writeFile(path.join(artifacts, `${name}-failure.txt`), await page.locator('body').innerText().catch(() => ''))
    results.push({ name, result: 'FAIL', error: error.stack })
    console.error(`FAIL ${name}: ${error.message}`)
  } finally { await context.close() }
}
async function main() {
  await fs.mkdir(artifacts, { recursive: true })
  let preview, browser
  try {
    if (process.env.DECEMBER_START_SERVER === '1') {
      preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', new URL(baseUrl).port], {
        windowsHide: true,
        stdio: 'ignore',
        env: { ...process.env, VITE_SUPABASE_URL: 'https://december-local.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_mock_only' },
      })
      const deadline = Date.now() + 30000
      while (true) {
        try { if ((await fetch(baseUrl)).ok) break } catch {}
        assert.ok(Date.now() < deadline, 'Local preview starts within 30 seconds')
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }
    browser = await chromium.launch({ headless: true, channel: 'msedge' })
    await runCase(browser, 'desktop-catalog', page => catalog(page, false))
    await runCase(browser, 'mobile-catalog', page => catalog(page, true), 390)
    await runCase(browser, 'checkout-and-mocked-submission', checkout, 390)
    await runCase(browser, 'six-locales-mobile', locales, 390)
    await fs.writeFile(path.join(artifacts, 'results.json'), JSON.stringify(results, null, 2))
    if (results.some(result => result.result === 'FAIL')) process.exitCode = 1
  } finally {
    await browser?.close()
    preview?.kill()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
