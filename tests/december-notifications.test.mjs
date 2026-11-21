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
    id: 'order', reference_code: 'PC-DECEMBER', created_at: '2026-10-01T00:00:00Z',
    server: 'v1', player_id: 'PLAYER', username: 'Character', currency: 'USD',
    amount: 2000, selected_package_id: 'december-supply-1000',
    selected_package_title: 'DECEMBER PACKAGE', selected_package_amount: 1000,
    package_quantity: 2, additional_notes: '', payment_method: 'gcash',
    status: 'pending', discord_message_id: 'message',
    event_bonus_name: null, event_bonus_eligible: null,
    december_bonus_name: null, december_bonus_eligible: null, december_verified_total_usd: null,
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
      decemberBonusName: record.december_bonus_name, decemberBonusEligible: record.december_bonus_eligible,
      decemberVerifiedTotalUsd: record.december_verified_total_usd,
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
  for (const field of ['december_bonus_name', 'december_bonus_eligible', 'december_verified_total_usd']) {
    assert.ok(selectedFields.includes(field), `Persisted ${field} must be read before rendering`)
  }
  return payload.embeds[0]
}

function field(embed, name) {
  return embed.fields.find(item => item.name.includes(name))
}


for (const [stage, render] of [['initial submission', initialEmbed], ['admin update', updatedEmbed]]) {
  test(stage + ': December milestone uses persisted eligibility and once-per-player delivery wording', async () => {
    for (const eligible of [null,false,true]) {
      const embed=await render(donation({december_bonus_eligible:eligible, december_verified_total_usd:eligible===null?null:2500}))
      const bonus=field(embed,'December $2,500 Milestone')
      assert.match(bonus.value,/Garuda of Eternity Wings/)
      assert.match(bonus.value,/once per player/)
      if(eligible===true) assert.match(bonus.value,/Save Review in Admin.*exactly one/)
      if(eligible===false) assert.match(bonus.value,/No Garuda grant/)
      if(eligible===null) assert.match(bonus.value,/Payment verification pending/)
      if(eligible!==null) assert.match(bonus.value,/at last review.*2,500/)
    }
  })
}
test('rejected December orders never instruct staff to grant a reward',async()=>{
  const embed=await updatedEmbed(donation({status:'rejected',december_bonus_eligible:true,december_verified_total_usd:2500}))
  assert.match(field(embed,'December $2,500 Milestone').value,/Rejected order: do not grant Garuda/)
})
