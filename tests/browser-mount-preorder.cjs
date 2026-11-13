// Local-only browser QA. All external requests are fulfilled with fixtures or blocked.
const { chromium, expect } = require('@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')

const baseUrl = process.env.CHECKOUT_TEST_URL || 'http://127.0.0.1:4176'
const artifacts = process.env.CHECKOUT_TEST_ARTIFACTS || path.resolve('../qa/mount-preorder-20261111')
const results = []
// Independent user-supplied stats, including the newly added attributes marked with +.
const mounts = [
  { name: "Rodrigo's Flame Horse", step: 500, total: 500, stats: [
    ['ATK SPD', '250%'], ['Skill SPD', '165%'], ['DEF', '80'], ['DMG RED', '90'],
    ['Skill DMG Tolerance', '15%'], ['MAX HP', '30,000'], ['INC DMG RED Rate', '15%'],
    ['Basic DMG', '50'], ['ACC', '20'], ['+Status Effect RES', '25%'],
  ] },
  { name: "Supreme Conqueror's Qilin", step: 1000, total: 1500, stats: [
    ['ATK SPD', '250%'], ['Skill SPD', '165%'], ['DEF', '90'], ['DMG RED', '100'],
    ['Skill DMG Tolerance', '15%'], ['MAX HP', '35,000'], ['INC DMG RED Rate', '15%'],
    ['Status Effect RES', '30%'], ['Status Effect Duration RED Rate', '30%'],
    ['+ACC', '30'], ['+Status Effect ACC', '35%'],
  ] },
  { name: 'Golden Jackal of Ramses II', step: 1500, total: 3000, stats: [
    ['ATK SPD', '250%'], ['Skill SPD', '165%'], ['DEF', '100'], ['DMG RED', '120'],
    ['Skill DMG Tolerance', '15%'], ['MAX HP', '40,000'], ['INC DMG RED Rate', '15%'],
    ['Basic DMG', '60'], ['DMG Boost Rate', '10%'], ['Status Effect RES', '30%'],
    ['+ACC', '30'], ['+Status Effect ACC', '35%'], ['+Debuff Rate', '15%'], ['+Debuff Res', '12%'],
  ] },
]
const price = value => `$${value.toLocaleString('en-US')}`

async function mockNetwork(page, options = {}) {
  const state = { submissions: [], paypal: [], campaigns: [], progress: [], blocked: [] }
  const sdk = `window.paypal={Buttons(options){let button;return{async render(container){button=document.createElement('button');button.textContent='Complete mocked PayPal payment';button.onclick=async()=>{try{const orderID=await options.createOrder();await options.onApprove({orderID})}catch(error){options.onError(error)}};container.appendChild(button)},async close(){button?.remove()}}}};`
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.hostname === 'www.paypal.com' && url.pathname === '/sdk/js') return route.fulfill({ contentType: 'text/javascript', body: sdk })
    if (url.pathname.endsWith('/rpc/get_mount_preorder_campaign')) {
      state.campaigns.push(req.postDataJSON())
      if (options.campaignError) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Temporarily unavailable"}' })
      return json({ active: options.active !== false, starts_at: options.active === false ? null : '2026-11-11T00:00:00Z' })
    }
    if (url.pathname.endsWith('/rpc/get_donation_event_bonus_catalog')) {
      return json(Array.from({ length: 7 }, (_, i) => ({ event_number: i + 1, title: `Local reward ${i + 1}`, rewards: ['Local mock material'] })))
    }
    if (url.pathname.endsWith('/functions/v1/paypal-checkout')) {
      const body = req.postDataJSON()
      state.paypal.push(body)
      const order = state.paypal.find(item => item.action === 'create')
      const amount = order ? Number(order.selectedPackageId.split('-').at(-1)) * order.packageQuantity : 50
      return json(body.action === 'create' ? { orderId: 'LOCALMOUNTORDER' } : {
        orderId: 'LOCALMOUNTORDER', captureId: 'LOCALMOUNTCAPTURE', status: 'COMPLETED', amount: amount.toFixed(2), currency: 'USD',
      })
    }
    if (url.pathname.endsWith('/functions/v1/submit-donation')) {
      state.submissions.push(req.postDataBuffer().toString('utf8'))
      return json({ success: true, donation: { id: 'local-mount-qa', referenceCode: 'LOCAL-MOUNT-123', createdAt: '2026-11-11T04:00:00Z', status: 'pending' } })
    }
    if (url.origin === new URL(baseUrl).origin) return route.continue()
    state.blocked.push(req.url())
    return route.abort('blockedbyclient')
  })
  return state
}

function mountSection(page) { return page.locator('section[aria-labelledby="mount-preorder-title"]') }
function packageCard(page, amount) {
  return page.locator('article.gift-package-card').filter({ has: page.getByText(price(amount), { exact: true }) })
}
async function openShop(page) {
  await page.goto(baseUrl)
  await expect(page.locator('.gift-package-tabs__button--active')).toHaveText('November Packages')
  await expect(page.locator('article.gift-package-card')).toHaveCount(5)
  await expect(page.getByRole('button', { name: /PlayCrows V[12]/ })).toHaveCount(0)
}
async function openMounts(page) {
  await openShop(page)
  await page.getByRole('button', { name: 'Explore the mounts', exact: true }).click()
  await expect(mountSection(page)).toBeVisible()
}
async function fitsViewport(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal page overflow')
  for (const article of await mountSection(page).locator('article').all()) {
    assert.equal(await article.evaluate(node => node.scrollWidth <= node.clientWidth), true, 'Mount card fits its available width')
  }
}
async function screenshot(page, name) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.screenshot({ path: path.join(artifacts, name), fullPage: true, animations: 'disabled' })
}
async function catalog(page, mobile) {
  const state = await mockNetwork(page)
  await openMounts(page)
  const section = mountSection(page)
  await expect(section.getByRole('heading', { name: 'Mount Pre-order', exact: true })).toBeVisible()
  await expect(section.locator('article')).toHaveCount(3)
  await expect(section).toContainText('Only new gift-package purchases after the pre-order launches count.')
  await expect(section).toContainText('Previous purchases do not count')
  await expect(section).toContainText('They cannot be purchased individually or claimed by skipping steps.')
  await expect(section).toContainText('Receive your usual gift-package contents')
  await expect(section).toContainText('$500, then an additional $1,000, then an additional $1,500')
  for (const [index, mount] of mounts.entries()) {
    const article = section.getByRole('article', { name: mount.name, exact: true })
    await expect(article).toContainText(price(mount.step))
    await expect(article.getByText('Total to unlock', { exact: true }).locator('..')).toContainText(price(mount.total))
    if (index) await expect(article).toContainText(`Complete Step ${index} first`)
    await expect(article.getByRole('button')).toHaveCount(0)
    await expect(article.getByRole('link')).toHaveCount(0)
    const img = article.getByRole('img', { name: mount.name, exact: true })
    await img.scrollIntoViewIfNeeded()
    await expect.poll(() => img.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true)
    const visibleFraction = await img.evaluate(node => {
      const parent = node.parentElement.getBoundingClientRect(), image = node.getBoundingClientRect()
      return (parent.left - image.left) / image.width
    })
    assert.ok(visibleFraction >= 0.29, 'Hide the screenshot panel containing outdated stats')
    await article.locator('summary').click()
    const actual = await article.locator('details dl > div').evaluateAll(rows => rows.map(row => [row.querySelector('dt').textContent.trim(), row.querySelector('dd').textContent.trim()]))
    assert.deepEqual(actual, mount.stats, `${mount.name}: exact requested new stats`)
  }
  await fitsViewport(page)
  await screenshot(page, `mount-preorder-${mobile ? 'mobile' : 'desktop'}-expanded.png`)
  await section.getByRole('button', { name: 'Browse gift packages', exact: true }).click()
  await expect(page.locator('.gift-package-tabs__button--active')).toHaveText('November Packages')
  await expect(page.locator('article.gift-package-card')).toHaveCount(5)
  assert.equal(state.submissions.length + state.paypal.length, 0, 'Mount browsing never creates a payment')
}
async function korean(page) {
  const state = await mockNetwork(page)
  await openShop(page)
  await page.getByRole('button', { name: 'Language: English', exact: true }).click()
  await page.getByRole('option', { name: /한국어/ }).click()
  await page.getByRole('button', { name: '탈것 자세히 보기', exact: true }).click()
  const section = mountSection(page)
  await expect(section.getByRole('heading', { name: '탈것 사전 예약', exact: true })).toBeVisible()
  await expect(section).toContainText('총 $3,000 구매 시 탈것 3종을 모두 획득합니다.')
  await expect(section).toContainText('이전 구매 내역은 이번 사전 예약에 포함되지 않습니다.')
  await expect(section).toContainText('개별 구매나 단계 건너뛰기는 불가능합니다.')
  await expect(section.locator('summary')).toHaveText(Array(3).fill('새로운 능력치 전체 보기'))
  await section.locator('summary').last().click()
  await fitsViewport(page)
  await screenshot(page, 'mount-preorder-korean-mobile.png')
  await section.getByRole('button', { name: '기프트 패키지 보기', exact: true }).click()
  await expect(page.locator('.gift-package-tabs__button--active')).toHaveText('11월 패키지')
  assert.equal(state.submissions.length + state.paypal.length, 0)
}
function formValue(body, name) {
  const marker = `name="${name}"\r\n\r\n`, start = body.indexOf(marker)
  assert.notEqual(start, -1, `Submission includes ${name}`)
  return body.slice(start + marker.length).split('\r\n')[0]
}
async function checkout(page, paypal) {
  const state = await mockNetwork(page)
  await openMounts(page)
  await mountSection(page).getByRole('button', { name: 'Browse gift packages', exact: true }).click()
  const amount = paypal ? 100 : 50
  await packageCard(page, amount).getByRole('button', { name: 'Select NOVEMBER PACKAGE', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Support Amount', exact: true })).toBeVisible()
  await expect(page.locator('main')).toContainText('Mount pre-order')
  await expect(page.locator('main')).toContainText('$500, $1,500 and $3,000')
  await expect(page.locator('main')).toContainText('Previous purchases do not count')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByPlaceholder('Enter your Login ID').fill('local-mount-account')
  await page.getByPlaceholder('Enter your in-game character name').fill('Mount Test Hero')
  await page.getByRole('button', { name: 'Continue to Payment', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Choose Your Payment Method' })).toBeVisible()
  if (paypal) {
    await page.getByRole('button', { name: /PayPal Pay securely/ }).click()
    await page.getByRole('button', { name: 'Complete mocked PayPal payment', exact: true }).click()
  } else {
    await page.getByRole('button', { name: /GCash/ }).click()
    await page.getByRole('button', { name: 'Continue to Receipt', exact: true }).click()
    await page.locator('#payment-receipt').setInputFiles({ name: 'local-mount-qa-receipt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nLocal mock only.\n%%EOF') })
    await page.getByRole('button', { name: /Continue to Bonus/i }).click()
  }
  await expect(page.getByRole('heading', { name: /Choose your bonus rewards/i })).toBeVisible()
  if (paypal) await page.getByRole('button', { name: /^Add 1 bundle: EVENT001/ }).click()
  await page.getByRole('button', { name: 'Review submission', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Review Your Submission' })).toBeVisible()
  await fitsViewport(page)
  await screenshot(page, `mount-preorder-${paypal ? 'paypal' : 'manual'}-review.png`)
  await page.getByRole('button', { name: 'Submit Donation Form', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Donation Form Submitted' })).toBeVisible()
  assert.equal(state.submissions.length, 1)
  const body = state.submissions[0]
  assert.equal(formValue(body, 'selectedPackageId'), `november-supply-${amount}`)
  assert.equal(formValue(body, 'amount'), String(amount))
  assert.equal(formValue(body, 'server'), 'v1')
  assert.equal(formValue(body, 'packageQuantity'), '1')
  assert.equal(formValue(body, 'eventBonusSelections'), paypal ? '{"001":1}' : '{}')
  if (paypal) assert.deepEqual(state.paypal.map(item => item.action), ['create', 'capture'])
  else assert.equal(state.paypal.length, 0)
}
async function runCase(browser, name, fn, mobile = false) {
  if (process.env.CHECKOUT_TEST_CASE && !name.includes(process.env.CHECKOUT_TEST_CASE)) return
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 1000 }, locale: 'en-US', timezoneId: 'Asia/Singapore', serviceWorkers: 'block' })
  await context.addInitScript(() => localStorage.setItem('playcrows-language', 'en'))
  const page = await context.newPage(), errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.clock.setFixedTime(new Date('2026-11-11T04:00:00Z'))
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
async function campaignState(page, unavailable) {
  await mockNetwork(page, unavailable ? { campaignError: true } : { active: false })
  await openShop(page)
  await expect(page.locator('main')).toContainText(unavailable ? 'Pre-order status is temporarily unavailable' : 'Purchases made before launch do not count')
  await page.getByRole('button', { name: 'Explore the mounts', exact: true }).click()
  await expect(mountSection(page).getByText('Pre-orders open', { exact: true })).toHaveCount(0)
  await mountSection(page).getByRole('button', { name: 'Browse gift packages', exact: true }).click()
  await packageCard(page, 50).getByRole('button', { name: 'Select NOVEMBER PACKAGE', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByPlaceholder('Enter your Login ID')).toBeVisible()
}
async function adminMounts(page) {
  const adminId = '00000000-0000-4000-8000-000000000099'
  const user = { id: adminId, email: 'local-admin@example.test', app_metadata: { provider: 'email' }, user_metadata: {}, aud: 'authenticated', created_at: '2026-01-01T00:00:00Z' }
  await page.addInitScript(({ user }) => localStorage.setItem('sb-local-qa-auth-token', JSON.stringify({ access_token: 'local-test-token', refresh_token: 'local-test-refresh', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user })), { user })
  let active = false, deliveries = []
  const donation = { id: '00000000-0000-4000-8000-000000000001', server: 'v1', reference_code: 'LOCAL-MOUNT-ADMIN', player_id: 'mount-admin-player', username: 'Mount Hero', created_at: '2026-11-11T01:00:00Z', payment_method: 'paypal', status: 'pending', currency: 'USD', amount: 500, selected_package_id: 'november-supply-500', selected_package_title: 'NOVEMBER PACKAGE', selected_package_amount: 500, package_quantity: 1, discount_percent: 0, payment_verified_at: '2026-11-11T01:00:00Z', fulfillment_status: 'not_delivered', event_bonus_selections: [], boosting_bonus_rewards: [], cumulative_credit_usd: 500 }
  const progress = () => ({ active, starts_at: active ? '2026-11-11T00:00:00Z' : null, total_paid_usd: 3000, next_step: null, remaining_usd: 0, steps: mounts.map((mount, index) => ({ step: index + 1, mount_key: String(index), mount_name: mount.name, step_usd: mount.step, total_required_usd: mount.total, unlocked: true, reserved_at: '2026-11-11T01:00:00Z', source_donation_id: donation.id, delivery_status: deliveries.includes(index + 1) ? 'delivered' : 'reserved' })) })
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname.endsWith('/auth/v1/user')) return json(user)
    if (url.pathname.endsWith('/rest/v1/admin_users')) return json({ user_id: adminId })
    if (url.pathname.endsWith('/rest/v1/donations') && request.method() === 'GET') return json([donation])
    if (url.pathname.endsWith('/rpc/get_mount_preorder_campaign')) return json({ active, starts_at: active ? '2026-11-11T00:00:00Z' : null })
    if (url.pathname.endsWith('/rpc/start_mount_preorder_campaign')) { active = true; return json({ active, starts_at: '2026-11-11T00:00:00Z' }) }
    if (url.pathname.endsWith('/rpc/get_mount_preorder_progress')) { assert.equal(request.postDataJSON().p_player_id, donation.player_id); return json(progress()) }
    if (url.pathname.endsWith('/rpc/mark_mount_preorder_delivered')) { const body = request.postDataJSON(); assert.equal(body.p_player_id, donation.player_id); deliveries.push(body.p_step); return json(progress()) }
    if (url.origin === new URL(baseUrl).origin) return route.continue()
    return route.abort('blockedbyclient')
  })
  page.on('dialog', dialog => dialog.accept())
  await page.goto(`${baseUrl}/admin`)
  await expect(page.getByRole('heading', { name: 'Donation Admin Dashboard' })).toBeVisible()
  const control = page.getByRole('region', { name: 'Mount pre-order campaign' })
  await expect(control).toContainText('Not launched')
  await control.getByRole('button', { name: 'Launch mount pre-orders', exact: true }).click()
  await expect(control).toContainText('Open since')
  await page.getByRole('button', { name: 'Review', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Mount pre-order progress' })
  await expect(panel).toContainText('$3,000.00')
  const buttons = panel.getByRole('button', { name: 'Record mount delivery', exact: true })
  await expect(buttons).toHaveCount(3)
  await expect(buttons.nth(0)).toBeEnabled()
  await expect(buttons.nth(1)).toBeDisabled()
  await expect(buttons.nth(2)).toBeDisabled()
  await buttons.first().click()
  await expect(panel.locator('li').first()).toContainText('Delivered')
  await expect(buttons.first()).toBeEnabled()
  assert.deepEqual(deliveries, [1])
  await screenshot(page, 'mount-preorder-admin-progress.png')
}
async function main() {
  await fs.mkdir(artifacts, { recursive: true })
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    await runCase(browser, 'mount-catalog-desktop', page => catalog(page, false))
    await runCase(browser, 'mount-catalog-mobile', page => catalog(page, true), true)
    await runCase(browser, 'mount-korean-mobile', korean, true)
    await runCase(browser, 'mount-normal-manual-checkout', page => checkout(page, false), true)
    await runCase(browser, 'mount-normal-paypal-checkout', page => checkout(page, true))
    await runCase(browser, 'mount-before-launch', page => campaignState(page, false), true)
    await runCase(browser, 'mount-status-unavailable', page => campaignState(page, true), true)
    await runCase(browser, 'mount-admin-launch-and-delivery', adminMounts)
  } finally {
    await browser.close()
    await fs.writeFile(path.join(artifacts, 'mount-preorder-results.json'), JSON.stringify(results, null, 2))
  }
  if (results.some(item => item.result === 'FAIL')) process.exitCode = 1
}
main().catch(error => { console.error(error); process.exitCode = 1 })
