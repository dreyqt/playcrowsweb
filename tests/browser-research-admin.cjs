// Local-only administration QA. All Supabase and external traffic is mocked or blocked.
// No production data, credentials, accounts, or invitations are used.
const { chromium, expect } = require(process.env.PLAYWRIGHT_MODULE_PATH || '@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')

const baseUrl = process.env.RESEARCH_TEST_URL || 'http://127.0.0.1:4176'
const artifacts = process.env.RESEARCH_TEST_ARTIFACTS || path.resolve('../qa')
const executablePath = process.env.RESEARCH_BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const adminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const firstId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const secondId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const storageKey = 'sb-hicrkrhhfhvjgpwpifde-auth-token'
const fakeCode = 'QA_private_invitation_01234567890123456789012'
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
const results = []

function session() {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600
  const user = { id: adminId, aud: 'authenticated', role: 'authenticated', email: 'qa-admin@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: adminId, aud: 'authenticated', role: 'authenticated', exp: expiresAt })).toString('base64url')}.mocked-signature`
  return { access_token: token, refresh_token: 'qa-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt, user }
}

async function setup(browser, options = {}) {
  const context = await browser.newContext({ viewport: options.mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, timezoneId: 'Asia/Singapore' })
  if (options.signedIn) await context.addInitScript(({ key, value }) => {
    if (!sessionStorage.getItem('qa-session-seeded')) {
      localStorage.setItem(key, JSON.stringify(value)); sessionStorage.setItem('qa-session-seeded', 'true')
    }
  }, { key: storageKey, value: session() })
  const page = await context.newPage()
  const state = { actions: [], blocked: [], pageErrors: [], loginCalls: 0, logoutCalls: 0, conflictNext: false, status: 'pending', reviewedAt: null, invites: [], reviews: [] }
  page.on('pageerror', error => state.pageErrors.push(error.message))
  const profile = { displayName: 'QA Researcher', contact: 'qa-player#1234', region: 'Global', server: 'QA Official Server', characterName: 'Evidence Crow', characterClass: 'Orb', level: 80, playedSince: '2025-01-01', lastPlayed: '2026-11-17' }
  const entry = { tableId: 'section-7', rowLabel: 'Class Role (Official Description)', values: ['Class Role (Official Description)', '<img src=x onerror=alert(1)> QA evidence', '', '', 'Official source'], sourceUrl: 'https://www.nightcrows.com/en/notice/release', observedAt: '2026-11-17', certainty: 'observed', notes: 'Mock source text for local QA only.' }
  const item = id => ({ id, reference: id === firstId ? 'NCR-QA-FIRST' : 'NCR-QA-SECOND', status: id === firstId ? state.status : 'pending', created_at: id === firstId ? '2026-11-18T04:00:00Z' : '2026-11-17T04:00:00Z', profile, entry_count: 1, reviewed_at: id === firstId ? state.reviewedAt : null })
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    const json = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })
    if (url.origin === new URL(baseUrl).origin) return route.continue()
    if (url.hostname === 'research-fixture.invalid') return route.fulfill({ status: 200, contentType: 'image/png', body: png })
    if (url.pathname.endsWith('/auth/v1/token')) { state.loginCalls++; return json(session()) }
    if (url.pathname.endsWith('/auth/v1/user')) return json(session().user)
    if (url.pathname.endsWith('/auth/v1/logout')) { state.logoutCalls++; return route.fulfill({ status: 204, body: '' }) }
    if (url.pathname.endsWith('/rest/v1/admin_users')) return json(options.nonadmin ? [] : [{ user_id: adminId }])
    if (url.pathname.endsWith('/functions/v1/research-api')) {
      const body = request.postDataJSON()
      state.actions.push({ ...body, authPresent: /^Bearer /.test(request.headers().authorization || '') })
      if (options.nonadmin) return json({ error: 'Unauthorized' }, 403)
      if (body.action === 'list') return json({ submissions: body.before ? [item(secondId)] : [item(firstId)], invites: state.invites, invitesTruncated: true, nextBefore: body.before ? null : '2026-11-18T04:00:00Z|bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' })
      if (body.action === 'detail') return json({ submission: { ...item(body.id), payload: { profile, entries: [entry], consent: true }, proof_path: `${body.id}/qa.png`, proof_sha256: 'a'.repeat(64), review_notes: state.reviews[0]?.notes || '', reviewed_by: state.reviews.length ? adminId : null }, proofUrl: 'https://research-fixture.invalid/evidence.png', reviews: state.reviews, duplicateEvidence: [{ id: secondId, reference: 'NCR-QA-SECOND' }] })
      if (body.action === 'createInvite') {
        const invite = { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', label: body.label, created_at: '2026-11-18T04:00:00Z', expires_at: new Date(Date.now() + 14 * 86400000).toISOString(), used_at: null, revoked_at: null }
        state.invites.unshift(invite); return json({ code: fakeCode, invite })
      }
      if (body.action === 'review') {
        if (state.conflictNext) { state.conflictNext = false; return json({ error: 'Another administrator changed this submission. Refresh before reviewing.' }, 409) }
        assert.equal(body.expectedStatus, state.status)
        assert.equal(body.expectedReviewedAt, state.reviewedAt)
        const old = state.status; state.status = body.status; state.reviewedAt = '2026-11-18T05:00:00.123456Z'
        state.reviews.unshift({ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', submission_id: firstId, actor_id: adminId, previous_status: old, status: state.status, notes: body.notes, created_at: state.reviewedAt })
        return json({ submission: item(firstId) })
      }
      if (body.action === 'revokeInvite') return json({ success: true })
      return json({ error: 'Unexpected mocked action' }, 400)
    }
    state.blocked.push(request.url())
    return route.abort('blockedbyclient')
  })
  return { context, page, state }
}

async function run() {
  await fs.mkdir(artifacts, { recursive: true })
  const browser = await chromium.launch({ executablePath, headless: true })
  let page
  try {
    {
      const test = await setup(browser); page = test.page
      await page.goto(`${baseUrl}/admin/research`)
      await expect(page.getByRole('heading', { name: 'Research review' })).toBeVisible()
      await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
      assert.equal(test.state.actions.length, 0, 'Logged-out browser must not access research data')
      await page.screenshot({ path: path.join(artifacts, 'research-admin-login.png'), fullPage: true })
      await page.getByLabel('Email', { exact: true }).fill('qa-admin@example.invalid')
      await page.getByLabel('Password', { exact: true }).fill('mock-password-only')
      await page.getByRole('button', { name: 'Sign in', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Submissions', exact: true })).toBeVisible()
      assert.equal(test.state.loginCalls, 1)
      await expect(page.locator('.ra-submission')).toHaveCount(1)
      results.push('logged-out access denied; existing administrator password sign-in loads the review queue')

      await page.getByText('Player invitations', { exact: false }).first().click()
      await expect(page.getByText('Latest 100 invitations shown.', { exact: false })).toBeVisible()
      await page.getByLabel('Player label / Discord name').fill('Trusted QA player')
      await page.getByRole('button', { name: 'Create invitation', exact: true }).click()
      await expect(page.locator('.ra-code-box code')).toHaveText(fakeCode)
      const stored = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage }, url: location.href }))
      assert.ok(!stored.includes(fakeCode), 'Invitation code must not enter storage or URL')
      await page.getByRole('button', { name: 'Hide code', exact: true }).click()
      await expect(page.locator('.ra-code-box')).toHaveCount(0)
      results.push('private invitation displayed once without URL/localStorage/sessionStorage persistence')

      await page.locator('.ra-submission').first().click()
      await expect(page.getByRole('heading', { name: 'Staff decision' })).toBeVisible()
      await expect(page.getByText('Reused screenshot detected.', { exact: true })).toBeVisible()
      await expect(page.locator('.ra-proof')).toBeVisible()
      assert.equal(await page.locator('.ra-proof').evaluate(img => img.complete && img.naturalWidth > 0), true)
      await expect(page.getByText('<img src=x onerror=alert(1)> QA evidence', { exact: true })).toBeVisible()
      assert.equal(await page.locator('.ra-fields img').count(), 0, 'Contributor values must render as text')
      const source = page.locator('.ra-source')
      await expect(source).toHaveAttribute('href', 'https://www.nightcrows.com/en/notice/release')
      await expect(source).toHaveAttribute('rel', 'noopener noreferrer')
      const approve = page.getByRole('button', { name: 'Approve research', exact: true })
      await expect(approve).toBeDisabled()
      await page.getByLabel('Review notes (at least 10 characters)').fill('Checked official character evidence and each source.')
      await expect(approve).toBeDisabled()
      await page.getByLabel('I checked official-server proof and cited sources.').check()
      await expect(approve).toBeEnabled()
      await approve.click()
      await expect(page.getByRole('status')).toContainText('marked approved')
      const review = test.state.actions.find(action => action.action === 'review')
      assert.equal(review.expectedReviewedAt, null)
      assert.equal(review.expectedStatus, 'pending')
      assert.equal(review.evidenceChecked, true)
      assert.ok(review.authPresent)
      await expect(page.locator('.ra-history')).toContainText(adminId)
      await expect(page.getByLabel('I checked official-server proof and cited sources.')).not.toBeChecked()
      results.push('details/source text render safely; approval needs notes + checkbox; actor history and optimistic revision payload verified')

      test.state.conflictNext = true
      await page.getByLabel('Review notes (at least 10 characters)').fill('A second reviewed decision must detect concurrent changes.')
      await page.getByLabel('I checked official-server proof and cited sources.').check()
      await approve.click()
      await expect(page.getByRole('alert')).toContainText('Another administrator changed this submission')
      const lastReview = test.state.actions.filter(action => action.action === 'review').at(-1)
      assert.equal(lastReview.expectedReviewedAt, '2026-11-18T05:00:00.123456Z')
      results.push('409 stale-review conflict displayed and latest exact review timestamp forwarded')

      await page.getByRole('button', { name: 'Refresh evidence', exact: true }).click()
      await expect(page.getByLabel('I checked official-server proof and cited sources.')).not.toBeChecked()
      await page.screenshot({ path: path.join(artifacts, 'research-admin-desktop.png'), fullPage: true })
      await page.getByLabel('Filter loaded submissions').selectOption('all')
      await page.getByRole('button', { name: 'Load older submissions', exact: true }).click()
      await expect(page.locator('.ra-submission')).toHaveCount(2)
      assert.equal(test.state.actions.filter(action => action.action === 'list').at(-1).before, '2026-11-18T04:00:00Z|bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
      results.push('opaque pagination cursor forwarded and older results appended')

      await page.getByRole('button', { name: 'Sign out', exact: true }).click()
      await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
      await expect(page.locator('.ra-submission')).toHaveCount(0)
      await expect(page.locator('.ra-proof')).toHaveCount(0)
      await expect(page.locator('.ra-code-box')).toHaveCount(0)
      assert.equal(test.state.logoutCalls, 1)
      assert.deepEqual(test.state.pageErrors, [])
      assert.deepEqual(test.state.blocked, [])
      results.push('sign-out clears queue, evidence, invitation code, and active admin session')
      await test.context.close()
    }
    {
      const test = await setup(browser, { signedIn: true, nonadmin: true }); page = test.page
      await page.goto(`${baseUrl}/admin/research`)
      await expect(page.getByRole('heading', { name: 'Administrator access required' })).toBeVisible()
      assert.equal(test.state.actions.length, 0)
      await expect(page.getByRole('button', { name: 'Sign out and use another account' })).toBeVisible()
      assert.deepEqual(test.state.pageErrors, [])
      results.push('signed-in non-administrator cannot load any research data')
      await test.context.close()
    }
    {
      const test = await setup(browser, { signedIn: true, mobile: true }); page = test.page
      await page.goto(`${baseUrl}/admin/research`)
      await expect(page.locator('.ra-submission')).toHaveCount(1)
      await page.locator('.ra-submission').first().click()
      await expect(page.getByRole('heading', { name: 'Staff decision' })).toBeVisible()
      const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }))
      assert.ok(widths.document <= widths.viewport + 1, `Mobile horizontal overflow: ${JSON.stringify(widths)}`)
      await page.screenshot({ path: path.join(artifacts, 'research-admin-mobile.png'), fullPage: true })
      assert.deepEqual(test.state.pageErrors, [])
      assert.deepEqual(test.state.blocked, [])
      results.push('390px mobile view renders complete review form without horizontal overflow')
      await test.context.close()
    }
    console.log(JSON.stringify({ passed: results.length, checks: results, screenshots: artifacts }, null, 2))
  } catch (error) {
    if (page && !page.isClosed()) await page.screenshot({ path: path.join(artifacts, 'research-admin-failure.png'), fullPage: true }).catch(() => {})
    throw error
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
