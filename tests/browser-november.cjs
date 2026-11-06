// Run against a local preview built with fake API keys. Every external request is mocked or blocked.
// Reward expectations are independently transcribed from the November request, including the confirmed 200-tier correction.
const { chromium, expect } = require('@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')

const baseUrl = process.env.CHECKOUT_TEST_URL || 'http://127.0.0.1:4175'
const artifacts = process.env.CHECKOUT_TEST_ARTIFACTS || path.resolve('work/qa/november')
const results = []
const tiers = [50, 100, 200, 500, 1000]
const price = value => `$${value.toLocaleString('en-US')}`
const names = [
  'Diamond', 'Mileage', 'Contribution Coin', "Star's Memory (Bound)", 'Party Dungeon Raid Ticket',
  'Morion (Bound)', 'Time Recharger - Masarta Special Dungeon (Bound)',
  'Time Charging Device - Harpenon Sanctum (Attribution)', "Guardian's Scepter (Attribution)",
  'Crusade Loot Chest (Attributed)', 'Total War Supply Crates (Attributed)', "Forgotten One's Remnant Selection Chest (Bound)",
  '[L] Weapon Style Summon Challenge Ticket (Bound)', '[L] Mount Summon Challenge Ticket (Bound)',
  'Element Extraction of Fusion x11 (Attribution)', "Eligio's Stimulant of EXP (Bound)",
  "Night Crow's Stimulant of Growth (Bound)", 'Night Crows Blessing Stimulant of Growth (Bound)',
  'Torn Invoices (Attribution)', 'Torn Seniority Letter (Attribution)',
  'Brilliant Refinement Stone Selection Chest (Bound)', 'Shining Armor Enhancement Scroll Chest (Bound)',
  'Shining Weapon Enhancement Scroll Chest (Bound)', 'Shining Accessory Enhancement Scroll Chest (Bound)',
  'Brilliant Enhancement Scroll Selection Chest (Bound)', 'Pitch-black Enhancement Scroll Selection Chest (Bound)',
  'Spell Rune Crystal I (Bound)', 'Spell Starlight Crystal I (Bound)', 'Enchantment Frost Crystal I (Attributed)',
  'Wind Orb Chest (Attributed)', '[UC] Crafting Material Selection Chest (Bound)',
  '[C] Crafting Material x40 Selection Chest (Bound)', '[R] Arcane Scroll Selection Chest (Bound)',
  "Master's Aircraft Toolbox (Bound)",
]
const quantities = {
  50: [180000,35000,10000,750,20,20000,60,100,3000,15,150,8,125,125,120,150,150,1,250,250,1250,550,550,550,75,75,2000,2000,2000,30,300,300,400,40],
  100: [400000,125000,30000,1500,45,50000,175,225,12500,50,500,15,250,250,250,250,250,3,500,500,2500,1250,1250,1250,150,150,4000,4000,4000,75,500,500,800,80],
  200: [900000,250000,60000,3000,95,100000,350,450,25000,100,1000,30,500,500,500,500,500,7,1000,1000,5000,3000,3000,3000,300,300,8000,8000,8000,150,1250,1250,1750,150],
  500: [3500000,700000,350000,3000,200,250000,900,1000,100000,350,4000,100,1500,1500,2000,1500,1500,15,2500,2500,15000,10000,10000,10000,950,950,20000,20000,20000,250,3500,3500,4000,400],
  1000: [9000000,2000000,1000000,5000,500,500000,2000,3000,300000,1000,10000,300,3000,3000,5000,5000,5000,30,5000,5000,30000,20000,20000,20000,2000,2000,50000,50000,50000,500,10000,10000,10000,800],
}
function expectedRewards(amount) {
  assert.equal(quantities[amount].length, names.length)
  const rows = names.map((name, index) => [name, quantities[amount][index]])
  if (amount === 1000) rows[4][0] += ' (Bound)'
  if (amount >= 500) rows.push(
    ['Golden Necklace Insignia (Attributed)', amount === 500 ? 4 : 12],
    ['Golden Ring Insignia (Attribution)', amount === 500 ? 8 : 24],
  )
  return rows
}
function sortedRows(rows) {
  const normalize = name => name.toLowerCase().replace(/’/g, "'").replace(/^diamonds$/, 'diamond').replace(/\s+/g, ' ').trim()
  return rows.map(([name, count]) => [normalize(name), count]).sort(([a], [b]) => a.localeCompare(b))
}
const testEvent = {
  id: '11111111-1111-4111-8111-111111111111', server: 'v1', slug: 'merged-community', event_number: '001',
  title: 'Merged Community Event', short_description: 'Current V1 community event', description: 'Local test event.',
  mechanics: ['Complete the activity.'], rewards: ['Test reward'], form_fields: [], action_links: [],
  status: 'active', starts_at: '2026-11-01T00:00:00Z', ends_at: '2026-12-01T00:00:00Z',
  published_at: '2026-11-01T00:00:00Z', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z',
  require_character_name: true, require_player_id: true,
}
async function mockNetwork(page) {
  const state = { paypal: [], submissions: [], catalogs: [], events: [], blocked: [] }
  const sdk = `window.paypal={Buttons(options){let button;return{async render(container){button=document.createElement('button');button.textContent='Complete mocked PayPal payment';button.onclick=async()=>{try{const orderID=await options.createOrder();await options.onApprove({orderID})}catch(error){options.onError(error)}};container.appendChild(button)},async close(){button?.remove()}}}};`
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.hostname === 'www.paypal.com' && url.pathname === '/sdk/js') return route.fulfill({ contentType: 'text/javascript', body: sdk })
    if (url.pathname.endsWith('/rpc/get_donation_event_bonus_catalog')) {
      state.catalogs.push(req.postDataJSON())
      return json(Array.from({ length: 7 }, (_, i) => ({ event_number: i + 1, title: `Local reward ${i + 1}`, rewards: ['Local mock material'] })))
    }
    if (url.pathname.endsWith('/rest/v1/events')) {
      state.events.push(Object.fromEntries(url.searchParams))
      const allowed = url.searchParams.get('server') === 'eq.v1'
      const slug = url.searchParams.get('slug')
      return json(allowed && (!slug || slug === 'eq.merged-community') ? [testEvent] : [])
    }
    if (url.pathname.endsWith('/functions/v1/paypal-checkout')) {
      const body = req.postDataJSON()
      state.paypal.push(body)
      assert.notEqual(body.action, 'check-boosting-eligibility', 'November has no Boosting purchase limit')
      const order = state.paypal.find(item => item.action === 'create')
      const amount = order ? Number(order.selectedPackageId.split('-').at(-1)) * order.packageQuantity : 50
      return json(body.action === 'create' ? { orderId: 'LOCALNOVEMBERORDER' } : {
        orderId: 'LOCALNOVEMBERORDER', captureId: 'LOCALNOVEMBERCAPTURE', status: 'COMPLETED', amount: amount.toFixed(2), currency: 'USD',
      })
    }
    if (url.pathname.endsWith('/functions/v1/submit-donation')) {
      state.submissions.push(req.postDataBuffer().toString('utf8'))
      return json({ success: true, donation: { id: 'local-november', referenceCode: 'LOCAL-NOVEMBER-123', createdAt: '2026-11-06T00:00:00Z', status: 'pending' } })
    }
    if (url.origin === new URL(baseUrl).origin) return route.continue()
    state.blocked.push(req.url())
    return route.abort('blockedbyclient')
  })
  return state
}
function card(page, amount) {
  return page.locator('article.gift-package-card').filter({ has: page.getByText(price(amount), { exact: true }) })
}
async function noServerSelection(page) {
  await expect(page.getByRole('button', { name: /PlayCrows V[12]/ })).toHaveCount(0)
  await expect(page.locator('a[href*="server=v2"], a[href*="v2-beta-claim"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Change', exact: true })).toHaveCount(0)
}
async function openShop(page, suffix = '') {
  await page.goto(baseUrl + suffix)
  await expect(page.locator('.gift-package-tabs__button--active')).toHaveText('November Packages')
  await expect(page.locator('article.gift-package-card')).toHaveCount(5)
  await noServerSelection(page)
}
async function fitsViewport(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal page overflow')
  for (const selector of ['.gift-rewards-modal__panel', '.gift-rewards-modal__list']) {
    for (const el of await page.locator(selector).all()) assert.equal(await el.evaluate(node => node.scrollWidth <= node.clientWidth), true, `${selector} fits viewport`)
  }
}
async function screenshot(page, name) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.screenshot({ path: path.join(artifacts, name), fullPage: await page.getByRole('dialog').count() === 0, animations: 'disabled' })
}
async function catalog(page, mobile) {
  const state = await mockNetwork(page)
  await openShop(page)
  const tabs = page.locator('.gift-package-tabs button')
  await expect(tabs.first()).toHaveText('November Packages')
  await fitsViewport(page)
  await screenshot(page, `november-${mobile ? 'mobile' : 'desktop'}.png`)
  for (const amount of tiers) {
    await card(page, amount).getByRole('button', { name: 'View rewards', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('.gift-rewards-modal__price')).toHaveText(price(amount))
    const rows = dialog.locator('.gift-rewards-modal__list > .gift-package-card__reward-row')
    await expect(rows).toHaveCount(expectedRewards(amount).length)
    const actual = await rows.evaluateAll(elements => elements.map(el => [
      el.querySelector('.gift-package-card__reward-name')?.textContent.trim(),
      Number(el.querySelector('.gift-package-card__reward-quantity')?.textContent.replace(/[^0-9]/g, '')),
    ]))
    assert.deepEqual(sortedRows(actual), sortedRows(expectedRewards(amount)), `Exact ${amount} November rewards`)
    await expect(dialog).not.toContainText(/once per account|2× cumulative|all nine weapons/i)
    await fitsViewport(page)
    if (amount === 200 || amount === 1000) await screenshot(page, `november-${mobile ? 'mobile' : 'desktop'}-${amount}-rewards.png`)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  }
  assert.equal(state.paypal.length + state.submissions.length, 0, 'Browsing creates no payment')
}
async function selectPackage(page, amount, quantity = 1) {
  await openShop(page)
  await card(page, amount).getByRole('button', { name: 'Select NOVEMBER PACKAGE', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Support Amount', exact: true })).toBeVisible()
  await expect(page.getByRole('spinbutton')).not.toHaveAttribute('readonly', '')
  if (quantity !== 1) await page.getByRole('spinbutton').fill(String(quantity))
  await expect(page.getByText('Total payment', { exact: true }).locator('..')).toContainText(price(amount * quantity))
  await expect(page.locator('main')).not.toContainText(/once per account|2× cumulative|all nine weapons/i)
}
async function quantitiesAndCategories(page) {
  const state = await mockNetwork(page)
  for (const amount of tiers) {
    await selectPackage(page, amount, 2)
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
    await fitsViewport(page)
    await page.getByRole('spinbutton').fill('0')
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
  }
  await openShop(page, '/?server=v2')
  for (const title of ['Boosting Packs', 'Currency', 'Support Packages', 'September Supply Packages', 'October Packages', 'November Packages']) {
    await page.locator('.gift-package-tabs button').filter({ hasText: new RegExp(`^${title}$`) }).click()
    await expect(page.locator('article.gift-package-card').first()).toBeVisible()
    await noServerSelection(page)
  }
  assert.equal(state.paypal.length + state.submissions.length, 0)
}
function formValue(body, name) {
  const marker = `name="${name}"\r\n\r\n`
  const start = body.indexOf(marker)
  assert.notEqual(start, -1, `Submission includes ${name}`)
  return body.slice(start + marker.length).split('\r\n')[0]
}
async function checkout(page, amount, quantity, paypal) {
  const state = await mockNetwork(page)
  await selectPackage(page, amount, quantity)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByPlaceholder('Enter your Login ID').fill('local-november-account')
  await page.getByPlaceholder('Enter your in-game character name').fill('November Hero')
  await page.getByRole('button', { name: 'Continue to Payment', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Choose Your Payment Method' })).toBeVisible()
  if (paypal) {
    await page.getByRole('button', { name: /PayPal Pay securely/ }).click()
    await page.getByRole('button', { name: 'Complete mocked PayPal payment', exact: true }).click()
  } else {
    await page.getByRole('button', { name: /GCash/ }).click()
    await page.getByRole('button', { name: 'Continue to Receipt', exact: true }).click()
    await page.locator('#payment-receipt').setInputFiles({ name: 'local-november-receipt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nLocal mock only.\n%%EOF') })
    await page.getByRole('button', { name: /Continue to Bonus/i }).click()
  }
  await expect(page.getByRole('heading', { name: /Choose your bonus rewards/i })).toBeVisible()
  const total = amount * quantity, entitlement = Math.floor(total / 100)
  if (entitlement > 0) {
    await expect(page.getByText(`${price(total)} in package value · Bonus bundles: ${entitlement}`, { exact: true })).toBeVisible()
    if (entitlement > 1) await page.getByRole('button', { name: `Use all ${entitlement} remaining choices here`, exact: true }).first().click()
    else await page.getByRole('button', { name: /^Add 1 bundle: EVENT001/ }).click()
  }
  await page.getByRole('button', { name: 'Review submission', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Review Your Submission' })).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/once per account|2× cumulative|all nine weapons/i)
  await fitsViewport(page)
  await screenshot(page, `november-${amount}-${quantity}-${paypal ? 'paypal' : 'manual'}-review.png`)
  await page.getByRole('button', { name: 'Submit Donation Form', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Donation Form Submitted' })).toBeVisible()
  assert.equal(state.submissions.length, 1)
  const body = state.submissions[0]
  assert.equal(formValue(body, 'server'), 'v1')
  assert.equal(formValue(body, 'selectedPackageId'), `november-supply-${amount}`)
  assert.equal(formValue(body, 'selectedPackageAmount'), String(amount))
  assert.equal(formValue(body, 'selectedPackageTitle'), 'NOVEMBER PACKAGE')
  assert.equal(formValue(body, 'packageQuantity'), String(quantity))
  assert.equal(formValue(body, 'amount'), String(total))
  assert.equal(formValue(body, 'eventBonusSelections'), entitlement ? JSON.stringify({ '001': entitlement }) : '{}')
  assert.ok(state.catalogs.every(item => item.p_server === 'v1'))
  if (paypal) {
    assert.deepEqual(state.paypal.map(item => item.action), ['create', 'capture'])
    assert.ok(state.paypal.every(item => item.server === 'v1'))
    assert.equal(state.paypal[0].selectedPackageId, `november-supply-${amount}`)
    assert.equal(state.paypal[0].packageQuantity, quantity)
  } else assert.equal(state.paypal.length, 0)
  await noServerSelection(page)
}
async function mergedEvents(page) {
  const state = await mockNetwork(page)
  await page.goto(`${baseUrl}/events?server=v2`)
  await expect(page.getByRole('heading', { name: 'Event Center', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Merged Community Event', exact: true })).toBeVisible()
  await noServerSelection(page)
  await page.getByRole('link').filter({ has: page.getByRole('heading', { name: 'Merged Community Event', exact: true }) }).click()
  await expect(page.getByRole('heading', { name: 'Merged Community Event', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '📌 Mechanics' })).toBeVisible()
  await fitsViewport(page)
  await screenshot(page, 'merged-events.png')
  await page.goto(`${baseUrl}/events/retired-v2-event?server=v2`)
  await expect(page.getByRole('heading', { name: 'Event Center', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Merged Community Event', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit Event Claim', exact: true })).toHaveCount(0)
  await expect(page).toHaveURL(`${baseUrl}/events`)
  await page.goto(`${baseUrl}/events/missing-v1-event`)
  await expect(page.getByText('No published events are available yet.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit Event Claim', exact: true })).toHaveCount(0)
  await noServerSelection(page)
  assert.ok(state.events.length >= 3)
  assert.ok(state.events.every(params => params.server === 'eq.v1'), 'All event queries use surviving V1 server')
  assert.equal(state.submissions.length + state.paypal.length, 0)
}
async function retiredBetaRoute(page) {
  const state = await mockNetwork(page)
  await page.goto(`${baseUrl}/v2-beta-claim`)
  await expect(page.getByRole('heading', { name: 'Event Center', exact: true })).toBeVisible()
  await noServerSelection(page)
  assert.ok(state.events.every(params => params.server === 'eq.v1'))
  assert.equal(state.submissions.length + state.paypal.length, 0)
}
async function koreanCatalog(page) {
  await mockNetwork(page)
  await openShop(page)
  await page.getByRole('button', { name: 'Language: English', exact: true }).click()
  await page.getByRole('option', { name: /한국어/ }).click()
  await expect(page.locator('.gift-package-tabs__button--active')).toHaveText('11월 패키지')
  await expect(page.locator('article.gift-package-card')).toHaveCount(5)
  await expect(page.locator('.gift-package-card__label').first()).toHaveText('11월 패키지')
  await card(page, 200).locator('.gift-package-card__rewards-button').click()
  const rows = page.getByRole('dialog').locator('.gift-rewards-modal__list > .gift-package-card__reward-row')
  await expect(rows).toHaveCount(34)
  await fitsViewport(page)
  await screenshot(page, 'november-korean-mobile.png')
}
async function runCase(browser, name, fn, mobile = false) {
  if (process.env.CHECKOUT_TEST_CASE && !name.includes(process.env.CHECKOUT_TEST_CASE)) return
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 1000 }, locale: 'en-US', timezoneId: 'Asia/Singapore', serviceWorkers: 'block' })
  await context.addInitScript(() => localStorage.setItem('playcrows-language', 'en'))
  const page = await context.newPage(), errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.clock.setFixedTime(new Date('2026-11-06T04:00:00Z'))
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
    await runCase(browser, 'november-exact-catalog-desktop', page => catalog(page, false))
    await runCase(browser, 'november-exact-catalog-mobile', page => catalog(page, true), true)
    await runCase(browser, 'november-quantities-and-existing-categories', quantitiesAndCategories)
    await runCase(browser, 'november-50-manual-checkout', page => checkout(page, 50, 1, false), true)
    await runCase(browser, 'november-200-multiple-manual-checkout', page => checkout(page, 200, 2, false))
    await runCase(browser, 'november-100-paypal-checkout', page => checkout(page, 100, 1, true))
    await runCase(browser, 'november-1000-multiple-paypal-checkout', page => checkout(page, 1000, 2, true), true)
    await runCase(browser, 'merged-v1-events-and-stale-v2-links', mergedEvents)
    await runCase(browser, 'retired-v2-beta-route', retiredBetaRoute)
    await runCase(browser, 'november-korean-mobile', koreanCatalog, true)
  } finally {
    await browser.close()
    await fs.writeFile(path.join(artifacts, 'november-results.json'), JSON.stringify(results, null, 2))
  }
  if (results.some(item => item.result === 'FAIL')) process.exitCode = 1
}
main().catch(error => { console.error(error); process.exitCode = 1 })
