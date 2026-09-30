// Run against a local Vite preview with fake API keys. External requests are blocked.
// NODE_PATH can point to an isolated @playwright/test installation.
const { chromium, expect } = require('@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')

const baseUrl = process.env.CHECKOUT_TEST_URL || 'http://127.0.0.1:4173'
const artifacts = process.env.CHECKOUT_TEST_ARTIFACTS || path.resolve('work/qa/artifacts')
const expectedTabs = ['Currency', 'Support Packages', 'September Supply Packages', 'October Packages']
const tiers = [
  { amount: 50, quantities: [175000, 30000, 10, 50, 50, 50, 100, 5, 75, 100, 100, 100, 500, 500, 500] },
  { amount: 100, quantities: [280000, 70000, 25, 125, 50, 150, 150, 300, 2000, 20, 12, 175, 200, 200, 200, 1500, 1500, 1500] },
  { amount: 500, bonus: 'The White Tiger of Manouille I', quantities: [2800000, 300000, 150000, 100, 500, 300, 1500, 2000, 2000, 5, 5000, 15000, 100, 1000, 1000, 1000, 1000, 12000, 12000, 12000] },
  { amount: 1000, bonus: 'The White Tiger of Manouille I', quantities: [6500000, 600000, 500000, 250, 1500, 1000, 4500, 5000, 5000, 10, 15000, 40000, 250, 2500, 2500, 2500, 2500, 30000, 30000, 30000] },
]
const results = []
const tabsByServer = new Map()

function price(amount) { return `$${amount.toLocaleString('en-US')}` }

async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Page fits viewport width')
  const dialog = page.getByRole('dialog')
  if (await dialog.count()) {
    assert.equal(await dialog.locator('.gift-rewards-modal__panel').evaluate(element => element.scrollWidth <= element.clientWidth), true, 'Reward panel fits its width')
    assert.equal(await dialog.locator('.gift-rewards-modal__list').evaluate(element => element.scrollWidth <= element.clientWidth), true, 'Reward list fits its width')
  }
}

async function screenshot(page, name) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.screenshot({ path: path.join(artifacts, name), fullPage: true, animations: 'disabled' })
}

async function checkSpecialBonus(page) {
  const notice = page.getByRole('complementary', { name: 'October Special Mount Bonus' })
  await expect(notice).toBeVisible()
  await expect(notice).toContainText('$500 or $1,000 October package')
  await expect(notice).toContainText('New Mount: The White Tiger of Manouille I')
  await expect(notice).toContainText('One mount per player on each server, shared across both eligible tiers.')
  await expect(notice).toContainText('No cumulative spending requirement.')
  await expect(page.locator('body')).not.toContainText('Battle Griffin')
  await expect(page.locator('body')).not.toContainText('Red Death')
}

async function checkShop(page, server, viewportName) {
  const blocked = []
  const paymentAttempts = []
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (/\/functions\/v1\/(?:paypal-checkout|submit-donation|paddle-checkout)/.test(url.pathname)) paymentAttempts.push(url.pathname)
    if (url.origin === new URL(baseUrl).origin) return route.continue()
    blocked.push(url.origin)
    return route.abort('blockedbyclient')
  })
  await page.goto(baseUrl)
  await page.getByRole('button', { name: new RegExp(`PlayCrows ${server.toUpperCase()}`) }).click()
  const tabs = page.locator('.gift-package-tabs button')
  const labels = await tabs.allTextContents()
  assert.deepEqual(labels, expectedTabs, `${server} uses the expected ordered tabs`)
  tabsByServer.set(`${server}-${viewportName}`, labels)
  await expect(tabs.filter({ hasText: /August/i })).toHaveCount(0)
  await checkSpecialBonus(page)
  await tabs.filter({ hasText: 'October Packages' }).click()
  await expect(page.locator('.gift-package-tabs__button--active')).toHaveText('October Packages')
  const cards = page.locator('article.gift-package-card')
  await expect(cards).toHaveCount(4)
  await noOverflow(page)
  await screenshot(page, `october-${server}-${viewportName}.png`)

  for (const tier of tiers) {
    const card = cards.filter({ has: page.getByText(price(tier.amount), { exact: true }) })
    await expect(card).toHaveCount(1)
    await expect(card.getByRole('heading', { name: 'OCTOBER PACKAGE', exact: true })).toBeVisible()
    await expect(card.getByText('NEW', { exact: true })).toBeVisible()
    await expect(card.getByText('EVENT BONUS', { exact: true })).toHaveCount(tier.bonus ? 1 : 0)
    if (tier.bonus) await expect(card).toContainText(`New Mount: ${tier.bonus}`)
    await card.getByRole('button', { name: 'View rewards', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'OCTOBER PACKAGE', exact: true })
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('.gift-rewards-modal__price')).toHaveText(price(tier.amount))
    const rewards = dialog.locator('.gift-package-card__reward-row')
    await expect(rewards).toHaveCount(tier.quantities.length)
    assert.deepEqual(await rewards.locator('.gift-package-card__reward-quantity').allTextContents(), tier.quantities.map(quantity => `×${quantity.toLocaleString('en-US')}`))
    await expect(rewards.first()).toContainText('Diamond')
    await expect(rewards.filter({ hasText: 'Party Dungeon Raid Ticket' })).toHaveCount(1)
    await expect(rewards.filter({ hasText: 'Torn Invoices (Attribution)' })).toHaveCount(1)
    await expect(dialog).not.toContainText('Missing English Name')
    if (tier.bonus) {
      await expect(dialog).toContainText(`New Mount: ${tier.bonus}`)
      await expect(dialog).toContainText('One-Time Reward')
      await expect(dialog).toContainText('Buying multiple quantities does not grant additional copies')
    } else {
      await expect(dialog).not.toContainText('New Mount:')
      await expect(dialog).not.toContainText('One-Time Reward')
    }
    await noOverflow(page)
    if (tier.amount === 500) await screenshot(page, `october-${server}-${viewportName}-500-rewards.png`)
    if (tier.amount === 1000) {
      await dialog.getByRole('button', { name: 'Select OCTOBER PACKAGE', exact: true }).click()
      await expect(dialog).toHaveCount(0)
    } else {
      // Verify both supported close controls.
      if (tier.amount === 50) await page.keyboard.press('Escape')
      else await dialog.getByRole('button', { name: 'Close', exact: true }).click()
      await expect(dialog).toHaveCount(0)
    }
  }

  await expect(page.getByRole('heading', { name: 'Support Amount', exact: true })).toBeVisible()
  await expect(page.getByText('OCTOBER PACKAGE · $1,000', { exact: true })).toBeVisible()
  await expect(page.getByRole('spinbutton')).toHaveValue('1')
  await checkSpecialBonus(page)
  await page.getByRole('spinbutton').fill('2')
  await expect(page.getByText('$2,000', { exact: true })).toBeVisible()
  await noOverflow(page)
  await screenshot(page, `october-${server}-${viewportName}-checkout.png`)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Player Information', exact: true })).toBeVisible()
  await expect(page.getByPlaceholder('Enter your Login ID')).toBeVisible()
  for (const amount of [50, 100, 500]) {
    await page.goto(baseUrl)
    await page.getByRole('button', { name: new RegExp(`PlayCrows ${server.toUpperCase()}`) }).click()
    await page.locator('.gift-package-tabs button').filter({ hasText: 'October Packages' }).click()
    const card = page.locator('article.gift-package-card').filter({ has: page.getByText(price(amount), { exact: true }) })
    await card.getByRole('button', { name: 'Select OCTOBER PACKAGE', exact: true }).click()
    if (amount === 500) await checkSpecialBonus(page)
    else {
      await expect(page.getByRole('complementary', { name: 'October Special Mount Bonus' })).toHaveCount(0)
      await page.getByRole('spinbutton').fill('20')
      await expect(page.getByRole('complementary', { name: 'October Special Mount Bonus' })).toHaveCount(0)
    }
    await noOverflow(page)
  }
  assert.deepEqual(paymentAttempts, [], 'No payment or submission request occurs')
  return { blockedExternalOrigins: [...new Set(blocked)] }
}

async function main() {
  await fs.mkdir(artifacts, { recursive: true })
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    for (const server of ['v1', 'v2']) {
      for (const [viewportName, viewport] of Object.entries({ desktop: { width: 1280, height: 1000 }, mobile: { width: 390, height: 844 } })) {
        const name = `october-${server}-${viewportName}`
        const context = await browser.newContext({ viewport, locale: 'en-US', timezoneId: 'Asia/Singapore', serviceWorkers: 'block' })
        await context.addInitScript(() => localStorage.setItem('playcrows-language', 'en'))
        const page = await context.newPage()
        const errors = []
        page.on('pageerror', error => errors.push(error.message))
        try {
          await page.clock.setFixedTime(new Date('2026-09-30T04:00:00Z'))
          const details = await checkShop(page, server, viewportName)
          assert.deepEqual(errors, [], 'No uncaught browser errors')
          results.push({ name, result: 'PASS', ...details })
          console.log(`PASS ${name}`)
        } catch (error) {
          await screenshot(page, `${name}-failure.png`).catch(() => {})
          await fs.writeFile(path.join(artifacts, `${name}-failure.txt`), await page.locator('body').innerText().catch(() => '')).catch(() => {})
          results.push({ name, result: 'FAIL', error: error.stack })
          console.error(`FAIL ${name}: ${error.message}`)
        } finally {
          await context.close()
        }
      }
    }
    for (const viewport of ['desktop', 'mobile']) assert.deepEqual(tabsByServer.get(`v1-${viewport}`), tabsByServer.get(`v2-${viewport}`), 'Server tabs match')
  } finally {
    await browser.close()
    await fs.writeFile(path.join(artifacts, 'october-results.json'), JSON.stringify(results, null, 2))
  }
  if (results.some(result => result.result === 'FAIL')) process.exitCode = 1
}

main().catch(error => { console.error(error); process.exitCode = 1 })
