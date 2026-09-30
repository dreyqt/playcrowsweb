import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

// Execute the deployed notification formatters with in-memory services only.
// These tests never connect to Supabase or send Discord messages.
function loadSource(name, overrides = {}) {
  const source = readFileSync(new URL(`../supabase/edgefunction/${name}/index.ts`, import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '')
    .replace(/^export default /gm, 'const app = ')
  const sandbox = {
    Request, Response,
    console: { error() {}, warn() {}, log() {} },
    withSupabase: (_config, handler) => handler,
    ...overrides,
  }
  vm.runInNewContext(stripTypeScriptTypes(source), sandbox)
  return sandbox
}

function donation(overrides = {}) {
  return {
    id: 'order', reference_code: 'PC-OCTOBER', created_at: '2026-10-01T00:00:00Z',
    server: 'v1', player_id: 'PLAYER', username: 'Character', currency: 'USD',
    amount: 2000, selected_package_id: 'october-supply-1000',
    selected_package_title: 'OCTOBER PACKAGE', selected_package_amount: 1000,
    package_quantity: 2, additional_notes: '', payment_method: 'gcash',
    status: 'pending', discord_message_id: 'message',
    event_bonus_name: null, event_bonus_eligible: null,
    october_bonus_name: null, october_bonus_eligible: null, october_verified_total_usd: null,
    ...overrides,
  }
}

async function initialEmbed(record) {
  let payload
  const sandbox = loadSource('submit-donation', {
    fetch: async (_url, options) => {
      payload = JSON.parse(options.body)
      return Response.json({ id: 'message' })
    },
  })
  await sandbox.sendDiscordDonationNotification({
    webhookUrl: 'https://example.test/webhook', adminDashboardUrl: 'https://example.test/admin',
    donation: {
      referenceCode: record.reference_code, createdAt: record.created_at,
      eventBonusName: record.event_bonus_name, eventBonusEligible: record.event_bonus_eligible,
      octoberBonusName: record.october_bonus_name, octoberBonusEligible: record.october_bonus_eligible,
      octoberVerifiedTotalUsd: record.october_verified_total_usd,
    },
    server: record.server, playerId: record.player_id, username: record.username,
    currency: record.currency, finalAmount: record.amount,
    selectedPackageId: record.selected_package_id, selectedPackageTitle: record.selected_package_title,
    selectedPackageAmount: record.selected_package_amount, packageQuantity: record.package_quantity,
    paymentMethod: record.payment_method, additionalNotes: '', eventBonusSelections: [],
    receipt: null, receiptExtension: null,
  })
  return payload.embeds[0]
}

async function updatedEmbed(record) {
  let handler
  let payload
  let selectedFields = ''
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) },
    from(table) {
      const query = {
        select(fields) { if (table === 'donations') selectedFields = fields; return query },
        eq() { return query },
        maybeSingle: async () => ({ data: { user_id: 'admin' } }),
        single: async () => ({ data: record }),
      }
      return query
    },
  }
  loadSource('update-donation-discord-status', {
    createClient: () => client,
    Deno: { env: { get: () => 'https://example.test' }, serve: callback => { handler = callback } },
    fetch: async (_url, options) => {
      assert.equal(options.method, 'PATCH')
      payload = JSON.parse(options.body)
      return Response.json({ id: 'message' })
    },
  })
  const response = await handler(new Request('https://example.test/update', {
    method: 'POST', headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify({ donationId: record.id }),
  }))
  assert.equal(response.status, 200)
  for (const field of ['october_bonus_name', 'october_bonus_eligible', 'october_verified_total_usd']) {
    assert.ok(selectedFields.includes(field), `Persisted ${field} must be read before rendering`)
  }
  return payload.embeds[0]
}

function field(embed, name) {
  return embed.fields.find(item => item.name.includes(name))
}

for (const [stage, render] of [['initial submission', initialEmbed], ['admin update', updatedEmbed]]) {
  test(`${stage}: October mount labels require verified one-time eligibility`, async () => {
    for (const server of ['v1', 'v2']) {
      for (const [amount, mount] of [[500, 'The White Tiger of Manouille I'], [1000, "Balian's Battle Griffin"]]) {
        for (const eligible of [null, false, true]) {
          const embed = await render(donation({
            server, selected_package_id: `october-supply-${amount}`,
            selected_package_amount: amount, event_bonus_eligible: eligible,
          }))
          assert.match(field(embed, 'Package').value, /October Package/)
          const bonus = field(embed, 'One-Time Event Bonus').value
          assert.ok(bonus.includes(mount))
          if (eligible === true) assert.match(bonus, /Reserved for this verified order\. Grant exactly once/)
          else if (eligible === false) assert.match(bonus, /Do NOT grant/)
          else {
            assert.match(bonus, /verification|verified/)
            assert.doesNotMatch(bonus, /✅|Grant exactly once/)
          }
        }
      }
    }
  })

  test(`${stage}: October cumulative bonus respects the saved threshold decision`, async () => {
    for (const [eligible, total, expected] of [
      [null, null, /verification|verified yet/],
      [false, 1950, /Threshold not reached.*\$1,950.*\$2,000/],
      [true, 2000, /Reserved for this verified order\. Grant this mount exactly once/],
      [false, 3000, /Already reserved by another verified order\. Do NOT grant again/],
    ]) {
      const embed = await render(donation({ october_bonus_eligible: eligible, october_verified_total_usd: total }))
      const bonus = field(embed, 'Cumulative Mount Bonus').value
      assert.ok(bonus.includes("Nureddin's Red Death"))
      assert.match(bonus, expected)
      assert.match(bonus, /Only October packages for this Player ID on this server count/)
      if (eligible !== true) assert.doesNotMatch(bonus, /✅|Grant this mount exactly once/)
    }
  })

  test(`${stage}: a lower October tier can cross the cumulative threshold`, async () => {
    const embed = await render(donation({
      selected_package_id: 'october-supply-50', selected_package_amount: 50,
      package_quantity: 1, october_bonus_eligible: true, october_verified_total_usd: 2000,
    }))
    assert.equal(field(embed, 'One-Time Event Bonus'), undefined)
    assert.match(field(embed, 'Cumulative Mount Bonus').value, /Grant this mount exactly once/)
  })

  test(`${stage}: September retains its original bonus and earns no October mount`, async () => {
    const embed = await render(donation({
      selected_package_id: 'september-supply-500', event_bonus_eligible: true,
      october_bonus_eligible: true, october_verified_total_usd: 2000,
    }))
    assert.match(field(embed, 'One-Time Event Bonus').value, /Rare Monster Weapon Style SET/)
    assert.equal(field(embed, 'Cumulative Mount Bonus'), undefined)
  })
}

test('admin updates preserve category formatting for historical August orders', async () => {
  const embed = await updatedEmbed(donation({ selected_package_id: 'august-supply-500' }))
  assert.match(field(embed, 'Package').value, /August Supply Package/)
  assert.equal(field(embed, 'Cumulative Mount Bonus'), undefined)
})
