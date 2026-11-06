// Run with an isolated @playwright/test install and a local preview using fake API keys.
// Every external request is mocked or blocked. No real payment or upload can occur.
const { chromium, expect } = require('@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')

const baseUrl = process.env.CHECKOUT_TEST_URL || 'http://127.0.0.1:4173'
const artifacts = process.env.CHECKOUT_TEST_ARTIFACTS || path.resolve('work/qa/boosting')
const results = []
const price = amount => `$${amount.toLocaleString('en-US')}`
const canonical = text => text.toLowerCase().replace(/\s+/g, ' ').trim()
const weaponNames = [
  "Gaspard's Savage Greatsword (Bound)",
  "Theophil's Creed Spear (Bound)",
  "Brandt's Domination Twin Sword (Bound)",
  "Alyn's Illusion Longbow (Bound)",
  "Johannes' Motive Scepter (Bound)",
  "Ludwig's Straight Sword of Justice (Bound)",
  "Clemens' Freedom Dagger (Bound)",
  "Zenesia's Ruling Segum (Attributed)",
  "Eleanor's Ambition Staff (Bound)",
]
const accessories = [
  ['Golden Necklace Insignia (Attributed)', 4],
  ['Golden Ring Insignia (Attribution)', 4],
]

// Independently transcribed from the requested reward table. Maps allow the $50
// rewards to be reordered into the same categories as the higher-priced packs.
const smallTier = [
  ['Diamonds', 200000],
  ['[L] Weapon Style Summon Challenge Ticket (Bound)', 100],
  ['[L] Mount Summon Challenge Ticket (Bound)', 100],
  ['Element Extraction of Harmony (Bound)', 2000],
  ["Master's Aircraft Toolbox (Bound)", 30],
  ['Old Aircraft Component (Bound)', 2000],
  ["Eligio's Stimulant of EXP (Bound)", 100],
  ["Night Crow's Stimulant of Growth (Bound)", 150],
  ['Torn Seniority Letter (Bound)', 100],
  ['Torn Invoices (Bound)', 100],
  ['Source of Growth (Bound)', 500],
  ['Source of Wisdom (Bound)', 10],
  ['Ancient Papyrus (Bound)', 3000],
  ['Metal Fragment (Bound)', 15000],
  ['Golden Weighing Scale (Bound)', 2000],
  ['Golden Key (Bound)', 2000],
  ['Golden Carving Knife (Bound)', 2000],
  ['Shining Weapon Enhancement Scroll (Bound)', 500],
  ['Shining Armor Enhancement Scroll (Bound)', 500],
  ['Shining Accessory Enhancement Scroll (Bound)', 500],
  ['Brilliant Refinement Stone Selection Chest (Bound)', 1000],
  ['Superior Arcane Scroll of Enlightenment (Bound)', 20],
  ['[UC] Crafting Material Selection Chest (Bound)', 150],
  ['[R] Arcane Scroll Selection Chest (Bound)', 150],
  ['Time Charging Device - Harpenon Sanctum (Bound)', 100],
  ['Contribution Coin', 8000],
  ['Star Memory (Bound)', 500],
  ['Morion (Bound)', 15000],
  ['Gold Chest (Bound)', 10000],
  ['[C] Crafting Material x40 Selection Chest (Bound)', 100],
  ['Brilliant Enhancement Scroll Selection Chest (Bound)', 50],
  ['Pitch-black Enhancement Scroll Selection Chest (Bound)', 50],
  ["Ancient Master's Alloy (Bound)", 40],
  ['Seal of Advancement (Bound)', 5000],
]
const commonNames = [
  'Diamonds',
  'Mileage',
  'Contribution Coin',
  'Gold Chest (Bound)',
  "Star's Memory (Bound)",
  'Morion (Bound)',
  'Seal of Advancement (Bound)',
  'Party Dungeon Raid Ticket (Bound)',
  'Time Recharger - Masarta Special Dungeon (Bound)',
  'Time Charging Device - Harpenon Sanctum (Bound)',
  'Crusade Loot Chest (Attributed)',
  "Forgotten One's Remnant Selection Chest (Bound)",
  '[L] Weapon Style Summon Challenge Ticket (Bound)',
  '[L] Mount Summon Challenge Ticket (Bound)',
  'Elemental Extraction of Fusion 11 Times (Attribution)',
  'Element Extraction of Harmony (Bound)',
  "Eligio's Stimulant of EXP (Bound)",
  "Night Crow's Stimulant of Growth (Bound)",
  'Night Crows Blessing Stimulant of Growth (Bound)',
  'Source of Growth (Bound)',
  'Source of Wisdom (Bound)',
  'Torn Invoices (Bound)',
  'Torn Seniority Letter (Bound)',
  'Brilliant Refinement Stone Selection Chest (Bound)',
  'Shining Weapon Enhancement Scroll (Bound)',
  'Shining Armor Enhancement Scroll (Bound)',
  'Shining Accessory Enhancement Scroll (Bound)',
  'Higher Arcane Scroll of Enlightenment (Bound)',
  'Superior Arcane Scroll of Enlightenment (Bound)',
  'Brilliant Enhancement Scroll Selection Chest (Bound)',
  'Pitch-black Enhancement Scroll Selection Chest (Bound)',
  "Ancient Master's Alloy (Bound)",
  'Spell Rune Crystal I (Bound)',
  'Spell Starlight Crystal I (Bound)',
  'Enchantment Frost Crystal I (Attributed)',
  'Wind Orb Chest (Attributed)',
  '[UC] Crafting Material Selection Chest (Bound)',
  '[C] Crafting Material x40 Selection Chest (Bound)',
  '[R] Arcane Scroll Selection Chest (Bound)',
  'Metal Fragment (Bound)',
  'Ancient Papyrus (Bound)',
  'Golden Weighing Scale (Bound)',
  'Golden Key (Bound)',
  'Golden Carving Knife (Bound)',
  "Master's Aircraft Toolbox (Bound)",
  'Old Aircraft Component (Bound)',
]
const quantities = {
  200: [1200000, 200000, 100000, 35000, 1750, 75000, 25000, 75, 300, 500, 100, 30, 500, 500, 650, 9000, 500, 750, 3, 2500, 50, 600, 600, 4000, 2500, 2500, 2500, 40, 100, 250, 250, 200, 7500, 7500, 7500, 45, 700, 700, 700, 75000, 15000, 10000, 10000, 10000, 160, 10000],
  500: [4000000, 750000, 400000, 110000, 5200, 225000, 100000, 220, 850, 1500, 300, 90, 1500, 1500, 2250, 28000, 1600, 2500, 9, 8000, 160, 2000, 2000, 12500, 7500, 7500, 7500, 110, 300, 800, 800, 700, 22000, 22000, 22000, 125, 2100, 2100, 2100, 225000, 45000, 30000, 30000, 30000, 500, 35000],
  1000: [9000000, 2000000, 1000000, 250000, 15000, 550000, 250000, 500, 2000, 3000, 700, 200, 3500, 3500, 5000, 60000, 4000, 6000, 20, 20000, 400, 5000, 5000, 30000, 20000, 20000, 20000, 250, 750, 2000, 2000, 2000, 50000, 50000, 50000, 300, 5000, 5000, 5000, 550000, 120000, 80000, 80000, 80000, 1400, 85000],
}
function expectedRewards(amount) {
  if (amount === 50) return smallTier
  assert.equal(quantities[amount].length, commonNames.length)
  const rows = commonNames.map((name, index) => [name, quantities[amount][index]])
  if (amount >= 500) rows.push(['Total War Supply Crates (Attributed)', amount === 500 ? 4500 : 10000])
  if (amount === 1000) {
    rows.push(["Guardian's Scepter (Attribution)", 200000])
    for (const row of rows) {
      if (/^(Time Charging Device|Torn Invoices|Torn Seniority Letter)/.test(row[0])) row[0] = row[0].replace('(Bound)', '(Attribution)')
    }
  }
  return rows
}
function normalizeName(name) {
  return canonical(name).replace(/^star memory /, "star's memory ")
}
function sortedRows(rows) {
  return rows.map(([name, quantity]) => [normalizeName(name), quantity]).sort(([a], [b]) => a.localeCompare(b))
}

async function mockNetwork(page) {
  const state = { paypal: [], eligibility: [], submissions: [], blocked: [], catalogs: [], captureResponses: [] }
  const sdk = `window.paypal = { Buttons(options) { let button; return {
    async render(container) { button = document.createElement('button'); button.textContent = 'Complete mocked PayPal payment';
      button.onclick = async () => { try { const orderID = await options.createOrder(); await options.onApprove({orderID}); } catch (error) { options.onError(error); } }; container.appendChild(button); },
    async close() { if (button) button.remove(); }
  }; } };`
  await page.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.hostname === 'www.paypal.com' && url.pathname === '/sdk/js') return route.fulfill({ contentType: 'text/javascript', body: sdk })
    if (url.pathname.endsWith('/rpc/get_donation_event_bonus_catalog')) {
      const body = request.postDataJSON()
      state.catalogs.push(body)
      return json(Array.from({ length: 8 }, (_, index) => ({ event_number: index + 1, title: `Test reward ${index + 1}`, rewards: [`Local mock material ${index + 1}`] })))
    }
    if (url.pathname.endsWith('/functions/v1/paypal-checkout')) {
      const body = request.postDataJSON()
      if (body.action === 'check-boosting-eligibility') {
        state.eligibility.push(body)
        if (state.paypal.some(entry => entry.action === 'capture') && body.paypalOrderId !== 'LOCAL-BOOSTING-ORDER') {
          return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'This tier is already reserved by the completed payment.', code: 'V1_BOOSTING_LIMIT' }) })
        }
        return json({ eligible: true })
      }
      state.paypal.push(body)
      if (body.action === 'capture' && state.captureResponses.length) return state.captureResponses.shift()(route, body)
      const order = state.paypal.find(entry => entry.action === 'create')
      const amount = order ? Number(order.selectedPackageId.split('-').at(-1)) * order.packageQuantity : 50
      return json(body.action === 'create' ? { orderId: 'LOCAL-BOOSTING-ORDER' } : { orderId: 'LOCAL-BOOSTING-ORDER', captureId: 'LOCAL-BOOSTING-CAPTURE', status: 'COMPLETED', amount: amount.toFixed(2), currency: 'USD' })
    }
    if (url.pathname.endsWith('/functions/v1/submit-donation')) {
      state.submissions.push(request.postDataBuffer().toString('utf8'))
      return json({ success: true, message: 'Local test only', donation: { id: 'local-boosting', referenceCode: 'LOCAL-BOOSTING-123', createdAt: '2026-10-15T00:00:00Z', status: 'pending' } })
    }
    if (url.origin === new URL(baseUrl).origin) return route.continue()
    state.blocked.push(request.url())
    return route.abort('blockedbyclient')
  })
  return state
}
async function openShop(page, server) {
  await page.goto(baseUrl)
  await page.getByRole('button', { name: new RegExp(`PlayCrows ${server.toUpperCase()}`) }).click()
  const tabs = page.locator('.gift-package-tabs button')
  assert.deepEqual(await tabs.allTextContents(), ['Boosting Packs', 'Currency', 'Support Packages', 'September Supply Packages', 'October Packages'])
  await tabs.filter({ hasText: /^Boosting Packs$/ }).click()
  await expect(page.locator('.gift-package-tabs__button--active')).toHaveText('Boosting Packs')
}
function getCard(page, amount) {
  return page.locator('article.gift-package-card').filter({ has: page.getByText(price(amount), { exact: true }) })
}
async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Page fits viewport')
  for (const selector of ['.gift-rewards-modal__panel', '.gift-rewards-modal__list']) {
    for (const element of await page.locator(selector).all()) assert.equal(await element.evaluate(el => el.scrollWidth <= el.clientWidth), true, `${selector} fits viewport`)
  }
}
async function screenshot(page, name) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(120)
  await page.screenshot({ path: path.join(artifacts, name), fullPage: await page.getByRole('dialog').count() === 0, animations: 'disabled' })
}
async function checkRewardContents(dialog, amount) {
  const rows = dialog.locator('.gift-rewards-modal__list > .gift-package-card__reward-row')
  await expect(rows).toHaveCount(expectedRewards(amount).length)
  const actual = await rows.evaluateAll(elements => elements.map(element => [
    element.querySelector('.gift-package-card__reward-name')?.textContent.trim(),
    Number(element.querySelector('.gift-package-card__reward-quantity')?.textContent.replace(/[^0-9]/g, '')),
  ]))
  assert.deepEqual(sortedRows(actual), sortedRows(expectedRewards(amount)), `${amount} exact reward content`)
  assert.ok(actual.every(([name, quantity]) => name && Number.isSafeInteger(quantity) && quantity > 0), 'Every row has name and numeric quantity')
  await expect(dialog).not.toContainText(/choose (?:one|1) weapon|select (?:one|1) weapon|weapon of your choice/i)
}
async function checkBonusNotice(scope, server, amount, quantity = 1) {
  const notice = scope.getByRole('complementary', { name: 'Boosting Package Bonuses', exact: true })
  await expect(notice).toHaveCount(1)
  if (server === 'v1') await expect(notice).toContainText(/once per account|one purchase per account/i)
  if (server === 'v2') {
    await expect(notice).toContainText('V2 EXCLUSIVE · 2× CUMULATIVE VALUE')
    if (amount !== undefined) await expect(notice.getByText(price(amount * quantity * 2), { exact: true })).toHaveCount(1)
    else await expect(notice).toContainText('$50 Boosting package = $100 cumulative value.')
  } else await expect(notice).not.toContainText('2× CUMULATIVE')
  const expected = amount === undefined ? [...accessories, ...weaponNames.map(name => [name, 1])] : amount === 500 ? accessories : amount === 1000 ? weaponNames.map(name => [name, 1]) : []
  const rows = notice.locator('li')
  await expect(rows).toHaveCount(expected.length)
  const actual = await rows.evaluateAll(elements => elements.map(element => [element.querySelector('span')?.textContent, Number(element.querySelector('strong')?.textContent.replace(/[^0-9]/g, ''))]))
  assert.deepEqual(sortedRows(actual), sortedRows(expected.map(([name, count]) => [name, count * quantity])), 'Correct per-package bonus set and quantity')
  if (amount === 1000) {
    await expect(notice).toContainText('all nine weapons')
    await expect(notice).not.toContainText('Golden Necklace Insignia')
  }
  if (amount === 500) await expect(notice).not.toContainText("Gaspard's")
}
async function checkCatalog(page, server, viewportName) {
  const state = await mockNetwork(page)
  await openShop(page, server)
  const cards = page.locator('article.gift-package-card')
  await expect(cards).toHaveCount(4)
  await checkBonusNotice(page, server)
  await noOverflow(page)
  await screenshot(page, `boosting-${server}-${viewportName}.png`)
  for (const amount of [50, 200, 500, 1000]) {
    const card = getCard(page, amount)
    await expect(card).toHaveCount(1)
    await expect(card.getByRole('heading')).toContainText(/Boosting Package/i)
    await card.getByRole('button', { name: 'View rewards', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('.gift-rewards-modal__price')).toHaveText(price(amount))
    await checkRewardContents(dialog, amount)
    await checkBonusNotice(dialog, server, amount)
    await noOverflow(page)
    if (amount === 50 || amount === 1000) await screenshot(page, `boosting-${server}-${viewportName}-${amount}-rewards.png`)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  }
  assert.equal(state.paypal.length, 0)
  assert.equal(state.submissions.length, 0)
}
async function selectPackage(page, server, amount, quantity = 1) {
  await openShop(page, server)
  await getCard(page, amount).getByRole('button', { name: 'Select BOOSTING PACKAGE', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Support Amount', exact: true })).toBeVisible()
  if (quantity !== 1) await page.getByRole('spinbutton').fill(String(quantity))
  await checkBonusNotice(page, server, amount, quantity)
  const total = page.getByText('Total payment', { exact: true }).locator('..')
  await expect(total).toContainText(price(amount * quantity))
}
async function checkQuantities(page, server) {
  const state = await mockNetwork(page)
  if (server === 'v1') {
    for (const amount of [50, 200, 500, 1000]) {
      await selectPackage(page, server, amount)
      await expect(page.getByRole('spinbutton')).toHaveValue('1')
      await expect(page.getByRole('spinbutton')).toHaveAttribute('readonly', '')
      await expect(page.getByRole('spinbutton')).toHaveAttribute('max', '1')
      await expect(page.getByRole('button', { name: /(?:increase|decrease) quantity/i })).toHaveCount(0)
      await expect(page.locator('main')).toContainText(/once per account|one purchase per account/i)
      await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
      await noOverflow(page)
    }
    await screenshot(page, 'boosting-v1-quantity-one.png')
    assert.equal(state.paypal.length, 0)
    assert.equal(state.submissions.length, 0)
    return
  }
  for (const amount of [50, 200, 500, 1000]) {
    await selectPackage(page, server, amount, 2)
    await noOverflow(page)
    if (amount === 1000) {
      await page.getByRole('complementary', { name: 'Boosting Package Bonuses' }).locator('summary').click()
      await screenshot(page, `boosting-${server}-quantity-two.png`)
    }
  }
  // Combining smaller packages must never unlock the $500/$1,000 package bonus.
  await selectPackage(page, server, 50, 20)
  await expect(page.locator('body')).not.toContainText('Golden Necklace Insignia')
  await expect(page.locator('body')).not.toContainText("Gaspard's Savage Greatsword")
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
  await page.getByRole('spinbutton').fill('0')
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
  assert.equal(state.paypal.length, 0)
  assert.equal(state.submissions.length, 0)
}
function formValue(body, name) {
  const marker = `name="${name}"\r\n\r\n`
  const start = body.indexOf(marker)
  assert.notEqual(start, -1, `Submission contains ${name}`)
  return body.slice(start + marker.length).split('\r\n')[0]
}
async function checkCheckout(page, server, amount, quantity = 1, paypal = false, resumePayment = false) {
  const state = await mockNetwork(page)
  await selectPackage(page, server, amount, quantity)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByPlaceholder('Enter your Login ID').fill('local-boosting-test')
  await page.getByPlaceholder('Enter your in-game character name').fill('Local Boosting Hero')
  await page.getByRole('button', { name: 'Continue to Payment', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Choose Your Payment Method' })).toBeVisible()
  await expect(page.getByText(price(amount * quantity), { exact: true })).toBeVisible()
  if (paypal) {
    await page.getByRole('button', { name: /PayPal Pay securely/ }).click()
    await page.getByRole('button', { name: 'Complete mocked PayPal payment', exact: true }).click()
  } else {
    await page.getByRole('button', { name: /GCash/ }).click()
    await page.getByRole('button', { name: 'Continue to Receipt', exact: true }).click()
    await page.locator('#payment-receipt').setInputFiles({ name: 'local-boosting-receipt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nLocal mock only.\n%%EOF') })
    await page.getByRole('button', { name: /Continue to Bonus/i }).click()
  }
  await expect(page.getByRole('heading', { name: /Choose your bonus rewards/i })).toBeVisible()
  if (resumePayment) {
    // A captured order owns the once-per-tier reservation. Returning through
    // player information must identify that same order, not block its owner.
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.getByText('PayPal payment completed', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await page.getByRole('button', { name: 'Continue to Payment', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Choose Your Payment Method' })).toBeVisible()
    await expect(page.getByText('PayPal payment completed', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: /Continue to bonus rewards/i }).click()
    await expect(page.getByRole('heading', { name: /Choose your bonus rewards/i })).toBeVisible()
  }
  const entitlement = Math.floor(amount * quantity / 100)
  if (entitlement > 0) {
    await expect(page.getByText(`${price(amount * quantity)} in package value · Bonus bundles: ${entitlement}`, { exact: true })).toBeVisible()
    const allRemaining = page.getByRole('button', { name: `Use all ${entitlement} remaining choices here`, exact: true }).first()
    if (entitlement > 1) await allRemaining.click()
    else await page.getByRole('button', { name: /^Add 1 bundle: EVENT001/ }).click()
  } else {
    await expect(page.getByRole('button', { name: /^Add 1 bundle:/ })).toHaveCount(0)
    assert.equal(state.catalogs.length, 0, 'V2 doubled cumulative does not create unrelated event-bonus entitlement')
  }
  await page.getByRole('button', { name: 'Review submission', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Review Your Submission' })).toBeVisible()
  await checkBonusNotice(page, server, amount, quantity)
  await noOverflow(page)
  await screenshot(page, `boosting-${server}-${amount}-${quantity}-review.png`)
  await page.getByRole('button', { name: 'Submit Donation Form', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Donation Form Submitted' })).toBeVisible()
  assert.equal(state.submissions.length, 1)
  const body = state.submissions[0]
  assert.equal(formValue(body, 'server'), server)
  assert.equal(formValue(body, 'selectedPackageId'), `boosting-${amount}`)
  assert.equal(formValue(body, 'selectedPackageAmount'), String(amount))
  assert.equal(formValue(body, 'packageQuantity'), String(quantity))
  assert.equal(formValue(body, 'amount'), String(amount * quantity), 'Submitted actual payment remains undoubled')
  assert.equal(formValue(body, 'eventBonusSelections'), entitlement ? JSON.stringify({ '001': entitlement }) : '{}')
  assert.equal(state.eligibility.length, server === 'v1' ? (resumePayment ? 2 : 1) : 0, 'Only V1 Boosting requires the pre-payment purchase-limit check')
  if (server === 'v1') {
    assert.deepEqual(state.eligibility[0], {
      action: 'check-boosting-eligibility', server: 'v1', selectedPackageId: `boosting-${amount}`, playerId: 'local-boosting-test',
    })
    if (resumePayment) assert.deepEqual(state.eligibility[1], { ...state.eligibility[0], paypalOrderId: 'LOCAL-BOOSTING-ORDER' })
  }
  if (paypal) {
    assert.equal(state.paypal.length, 2)
    assert.deepEqual(state.paypal.map(request => request.action), ['create', 'capture'])
    assert.equal(state.paypal[0].selectedPackageId, `boosting-${amount}`)
    assert.equal(state.paypal[0].packageQuantity, quantity)
    assert.equal(state.paypal[0].server, server)
  }
}
async function checkCaptureRetry(page) {
  const state = await mockNetwork(page)
  let finishRetry
  state.captureResponses.push(
    route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Payment confirmation temporarily unavailable. Retry the same order.' }) }),
    route => new Promise(resolve => {
      finishRetry = async () => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ orderId: 'LOCAL-BOOSTING-ORDER', captureId: 'LOCAL-BOOSTING-CAPTURE', status: 'COMPLETED', amount: '50.00', currency: 'USD' }) })
        resolve()
      }
    }),
  )
  await selectPackage(page, 'v1', 50)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByPlaceholder('Enter your Login ID').fill('local-capture-retry')
  await page.getByPlaceholder('Enter your in-game character name').fill('Capture Retry Hero')
  await page.getByRole('button', { name: 'Continue to Payment', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Choose Your Payment Method' })).toBeVisible()
  await page.getByRole('button', { name: /PayPal Pay securely/ }).click()
  // A populated promo input would normally enable Apply. It must also be
  // locked while this approved order awaits confirmation.
  const promoInput = page.locator('input[type="text"]').first()
  await promoInput.fill('TEST-CODE')
  await page.getByRole('button', { name: 'Complete mocked PayPal payment', exact: true }).click()
  const retry = page.getByRole('button', { name: 'Retry payment confirmation', exact: true })
  await expect(retry).toBeEnabled()
  await expect(page.getByText('PayPal order: LOCAL-BOOSTING-ORDER', { exact: true })).toBeVisible()
  await expect(page.locator('main')).toContainText('Payment confirmation temporarily unavailable.')
  await expect(page.getByRole('button', { name: 'Complete mocked PayPal payment', exact: true })).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeDisabled()
  await expect(promoInput).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Apply Code', exact: true })).toBeDisabled()
  const methods = page.getByRole('button', { name: /^(?:PayPal|GCash|Wise|Bybit) /i })
  await expect(methods).toHaveCount(4)
  for (const method of await methods.all()) await expect(method).toBeDisabled()
  await screenshot(page, 'boosting-v1-paypal-capture-retry.png')
  assert.deepEqual(state.paypal.map(request => request.action), ['create', 'capture'])

  await retry.click()
  await expect.poll(() => state.paypal.filter(request => request.action === 'capture').length).toBe(2)
  await expect(page.getByRole('button', { name: /retry payment confirmation|confirming/i })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeDisabled()
  await expect(page.getByRole('heading', { name: /Choose your bonus rewards/i })).toHaveCount(0)
  assert.deepEqual(state.paypal.map(request => request.action), ['create', 'capture', 'capture'], 'Retry confirms the existing order without creating a second order')
  await finishRetry()

  await expect(page.getByRole('heading', { name: /Choose your bonus rewards/i })).toBeVisible()
  await page.getByRole('button', { name: 'Review submission', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Review Your Submission' })).toBeVisible()
  await page.getByRole('button', { name: 'Submit Donation Form', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Donation Form Submitted' })).toBeVisible()
  assert.equal(state.eligibility.length, 1)
  assert.deepEqual(state.paypal.filter(request => request.action === 'capture').map(request => request.orderId), ['LOCAL-BOOSTING-ORDER', 'LOCAL-BOOSTING-ORDER'])
  assert.equal(state.submissions.length, 1)
  assert.equal(formValue(state.submissions[0], 'paypalOrderId'), 'LOCAL-BOOSTING-ORDER')
  assert.equal(formValue(state.submissions[0], 'paypalCaptureId'), 'LOCAL-BOOSTING-CAPTURE')
  assert.equal(formValue(state.submissions[0], 'packageQuantity'), '1')
}
async function runCase(browser, name, fn, mobile = false) {
  if (process.env.CHECKOUT_TEST_CASE && !name.includes(process.env.CHECKOUT_TEST_CASE)) return
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
    for (const server of ['v1', 'v2']) {
      for (const viewportName of ['desktop', 'mobile']) await runCase(browser, `boosting-${server}-${viewportName}`, page => checkCatalog(page, server, viewportName), viewportName === 'mobile')
      await runCase(browser, `boosting-${server}-quantities`, page => checkQuantities(page, server), server === 'v2')
      await runCase(browser, `boosting-${server}-50-manual-checkout`, page => checkCheckout(page, server, 50), server === 'v2')
    }
    await runCase(browser, 'boosting-v1-paypal-capture-retry', checkCaptureRetry, true)
    await runCase(browser, 'boosting-v1-50-paypal-resume', page => checkCheckout(page, 'v1', 50, 1, true, true))
    await runCase(browser, 'boosting-v2-1000-paypal-quantity-two', page => checkCheckout(page, 'v2', 1000, 2, true), true)
  } finally {
    await browser.close()
    await fs.writeFile(path.join(artifacts, 'boosting-results.json'), JSON.stringify(results, null, 2))
  }
  if (!results.length || results.some(result => result.result === 'FAIL')) process.exitCode = 1
}
main().catch(error => { console.error(error); process.exitCode = 1 })
