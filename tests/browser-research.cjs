// Local browser checks: all external requests are mocked or blocked.
const { chromium, expect } = require(process.env.PLAYWRIGHT_MODULE_PATH || '@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const base = process.env.RESEARCH_TEST_URL || 'http://127.0.0.1:4176'
const out = process.env.RESEARCH_TEST_ARTIFACTS || path.resolve('../qa/research')
const proof = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOqkAAAAASUVORK5CYII=', 'base64')

;(async () => {
  await fs.mkdir(out, { recursive: true })
  const browser = await chromium.launch({ headless: true, executablePath: process.env.RESEARCH_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Singapore' })
  const page = await context.newPage(), errors = [], submissions = []
  page.on('pageerror', error => errors.push(error.message))
  let shouldFail = true
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.origin === new URL(base).origin) return route.continue()
    if (url.pathname === '/functions/v1/research-api' && request.method() === 'POST') {
      const form = await new Request(request.url(), { method: 'POST', headers: { 'content-type': request.headers()['content-type'] }, body: request.postDataBuffer() }).formData()
      const payload = JSON.parse(form.get('payload'))
      submissions.push({ requestId: form.get('requestId'), inviteCode: form.get('inviteCode'), payload, proofType: form.get('proof').type })
      return route.fulfill({ status: shouldFail ? 403 : 200, contentType: 'application/json', body: JSON.stringify(shouldFail ? { error: 'Test invitation is unavailable. Your entries are still here.' } : { submission: { id: form.get('requestId'), reference: 'NCR-BROWSER-QA', status: 'pending' }, replayed: false }) })
    }
    return route.abort('blockedbyclient')
  })
  try {
    await page.goto(`${base}/research`)
    await expect(page.getByRole('heading', { name: /Your experience/ })).toBeVisible()
    await expect(page.locator('#rq-topic option')).toHaveCount(26)
    await page.getByRole('button', { name: 'Submit for review', exact: true }).click()
    await expect(page.getByRole('alert').first()).toContainText('Please check')
    assert.equal(submissions.length, 0)

    const schema = JSON.parse(await fs.readFile(path.join(__dirname, '../src/research/schema.json'), 'utf8'))
    for (const table of schema.tables.filter(table => table.kind === 'research')) {
      await page.locator('#rq-topic').selectOption(table.id)
      await expect(page.locator('textarea[id^="rq-value-"]')).toHaveCount(table.columns.length)
      if (table.columns.includes('Verified By')) await expect(page.locator(`#rq-value-${table.columns.indexOf('Verified By')}`)).toHaveAttribute('readonly', '')
    }
    await page.locator('#rq-topic').selectOption('section-7')
    await page.locator('#rq-value-1').fill('2026-01-01')
    await page.locator('#rq-sourceUrl').fill('https://www.nightcrows.com/en/notice/release')
    await page.locator('#rq-observedAt').fill('2026-01-01')
    await page.getByRole('button', { name: 'Add entry to submission' }).click()
    await expect(page.locator('.research-entry-list > li')).toHaveCount(1)
    const values = { displayName: 'Browser QA', contact: 'private-qa-contact', server: 'Official QA', characterName: 'Crow QA', level: '60', playedSince: '2025-01-01', lastPlayed: '2026-01-01' }
    for (const [key, value] of Object.entries(values)) await page.locator(`#rq-${key}`).fill(value)
    await page.locator('#rq-inviteCode').fill('A'.repeat(43))
    await page.locator('#rq-proof').setInputFiles({ name: 'qa.png', mimeType: 'image/png', buffer: proof })
    await page.locator('#rq-consent').check()
    await page.getByRole('button', { name: 'Save in this browser', exact: true }).click()
    const draft = await page.evaluate(() => localStorage.getItem('playcrows:official-research:v1'))
    assert.ok(draft && !draft.includes('private-qa-contact') && !draft.includes('A'.repeat(43)) && !draft.includes('base64'))
    await page.getByRole('button', { name: 'Submit for review', exact: true }).click()
    await expect(page.getByRole('alert').last()).toContainText('Test invitation is unavailable')
    assert.equal(submissions.length, 1)
    await expect(page.locator('#rq-contact')).toHaveValue('private-qa-contact')
    shouldFail = false
    await page.getByRole('button', { name: 'Submit for review', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Thank you for sharing what you know.' })).toBeVisible()
    assert.equal(submissions.length, 2)
    assert.equal(submissions[0].requestId, submissions[1].requestId)
    const { validatePayload } = await import('../supabase/functions/research-api/validation.mjs')
    const serverSchema = JSON.parse(await fs.readFile(path.join(__dirname, '../supabase/functions/research-api/schema.json'), 'utf8'))
    assert.doesNotThrow(() => validatePayload(submissions[1].payload, serverSchema))
    assert.equal(submissions[1].proofType, 'image/png')
    assert.equal(await page.evaluate(() => localStorage.getItem('playcrows:official-research:v1')), null)
    await page.screenshot({ path: path.join(out, 'success-desktop.png'), fullPage: true })

    await page.goto(`${base}/research`)
    await page.screenshot({ path: path.join(out, 'form-desktop.png'), fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: path.join(out, 'form-mobile.png'), fullPage: true })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'mobile form overflows viewport')
    await page.goto(`${base}/admin/research`)
    await expect(page.getByRole('heading', { name: 'Research review' })).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByText('Invite experienced players', { exact: false })).toHaveCount(0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'mobile login overflows viewport')
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ passed: true, checks: ['26 topics and all columns', 'empty form rejected', 'meaningful sourced entry', 'draft excludes contact/code/proof', 'rejection preserves input', 'retry reuses request ID', 'frontend payload passes server validation', 'receipt and draft cleanup', 'desktop/mobile layout', 'admin login gate', 'no page errors'], artifacts: out }, null, 2))
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
