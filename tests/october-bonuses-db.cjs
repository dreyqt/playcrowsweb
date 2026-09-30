// Run: NODE_PATH=<isolated QA node_modules> node --test tests/october-bonuses-db.cjs
// Requires @electric-sql/pglite. Runs the actual SQL in an isolated in-memory
// PostgreSQL engine; no live database, payment service or credentials are used.
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { before, after, test } = require('node:test')
const { PGlite } = require('@electric-sql/pglite')

const db = new PGlite()
const migration = name => readFileSync(path.join(__dirname, '../supabase/migrations', name), 'utf8')
const octoberSql = migration('20261001_october_mount_bonuses.sql')
const ADMIN_ID = '11111111-1111-4111-8111-111111111111'
const backfilled = {}

async function purchase({ player = 'default-player', server = 'v1', amount = 500, quantity = 1, packageId = `october-supply-${amount}`, verified = true, status = 'approved', verifiedAt = '2026-10-01T12:00:00Z', submittedValue = amount, currency = 'USD' } = {}) {
  const result = await db.query(`insert into donations (
    player_id, server, selected_package_id, package_quantity, selected_package_amount,
    amount, currency, payment_verified_at, status, reference_code
  ) values ($1,$2,$3,$4,$5,$5,$6,$7,$8,'LOCAL-TEST') returning *`, [
    player, server, packageId, quantity, submittedValue, currency, verified ? verifiedAt : null, status,
  ])
  return result.rows[0]
}

async function current(id) {
  return (await db.query('select * from donations where id=$1', [id])).rows[0]
}

async function total(player, server = 'v1') {
  return Number((await db.query('select total_usd from october_verified_purchase_totals where player_id_normalized = normalize_playcrows_player_id($1) and server=$2', [player, server])).rows[0]?.total_usd || 0)
}

async function claims(player, server = 'v1') {
  return (await db.query('select * from october_event_bonus_claims where player_id_normalized = normalize_playcrows_player_id($1) and server=$2 order by bonus_key', [player, server])).rows
}

before(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to authenticated;
    create table public.admin_users (user_id uuid primary key);
    grant select on public.admin_users to authenticated;
    insert into public.admin_users values ('${ADMIN_ID}');
    create table public.donations (
      id uuid primary key default gen_random_uuid(),
      reference_code text,
      player_id text,
      selected_package_id text,
      package_quantity integer,
      selected_package_amount numeric,
      amount numeric,
      currency text,
      payment_verified_at timestamptz,
      status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
      created_at timestamptz not null default now()
    );
  `)
  await db.exec(migration('20260901_september_event_bonus_claim_guard.sql'))
  await db.exec(migration('20260901_dual_server_donation_center.sql'))
  // Deliberately insert out of verification order to exercise migration backfill.
  backfilled.last = await purchase({ player: 'backfill', amount: 500, verifiedAt: '2026-10-03T12:00:00Z' })
  backfilled.middle = await purchase({ player: 'backfill', amount: 1000, verifiedAt: '2026-10-02T12:00:00Z' })
  backfilled.first = await purchase({ player: 'backfill', amount: 500, verifiedAt: '2026-10-01T12:00:00Z' })
  backfilled.pending = await purchase({ player: 'backfill', amount: 1000, verified: false, status: 'pending' })
  backfilled.rejected = await purchase({ player: 'backfill', amount: 1000, status: 'rejected' })
  await db.exec(octoberSql)
})

after(async () => { await db.close() })

test('backfill follows payment verification order and excludes pending or rejected purchases', async () => {
  assert.equal(await total('backfill'), 2000)
  const first = await current(backfilled.first.id)
  const middle = await current(backfilled.middle.id)
  const last = await current(backfilled.last.id)
  assert.equal(Number(first.october_verified_total_usd), 500)
  assert.equal(Number(middle.october_verified_total_usd), 1500)
  assert.equal(Number(last.october_verified_total_usd), 2000)
  assert.equal(first.event_bonus_eligible, true)
  assert.equal(middle.event_bonus_eligible, true)
  assert.equal(last.event_bonus_eligible, false)
  assert.equal(last.october_bonus_eligible, true)
  assert.equal((await current(backfilled.pending.id)).october_bonus_eligible, null)
  assert.equal((await current(backfilled.rejected.id)).october_bonus_eligible, null)
  assert.equal((await claims('backfill')).length, 3)
})

test('every October tier contributes its fixed catalog value times package quantity', async () => {
  for (const amount of [50, 100, 500, 1000]) {
    const player = `tier-${amount}`
    const order = await purchase({ player, amount, quantity: 2, submittedValue: 99999999, currency: 'PHP' })
    assert.equal(await total(player), amount * 2)
    assert.equal(Number(order.october_verified_total_usd), amount * 2)
    assert.equal(order.october_bonus_eligible, amount === 1000)
    assert.equal(order.event_bonus_eligible, amount >= 500 ? true : null)
  }
})

test('mixed October purchases reach $2,000 exactly; all other packages are excluded', async () => {
  const player = 'mixed-tiers'
  for (const packageId of ['september-supply-1000', 'august-supply-1000', 'currency-1000', 'support-class-change-500', 'october-supply-2000']) {
    await purchase({ player, packageId, amount: 1000, quantity: 10 })
  }
  assert.equal(await total(player), 0)
  await purchase({ player, amount: 1000 })
  await purchase({ player, amount: 500 })
  await purchase({ player, amount: 100, quantity: 4 })
  const below = await purchase({ player, amount: 50 })
  assert.equal(Number(below.october_verified_total_usd), 1950)
  assert.equal(below.october_bonus_eligible, false)
  const crossing = await purchase({ player, amount: 50 })
  assert.equal(Number(crossing.october_verified_total_usd), 2000)
  assert.equal(crossing.october_bonus_eligible, true)
  assert.equal(crossing.october_bonus_name, "Nureddin's Red Death")
  const extra = await purchase({ player, amount: 1000 })
  assert.equal(extra.october_bonus_eligible, false)
  assert.equal((await claims(player)).filter(claim => claim.bonus_key === 'nureddins-red-death').length, 1)
})

test('verified quantity purchases grant each mount once regardless of quantity or subsequent purchases', async () => {
  const player = 'quantity-bonus'
  const first = await purchase({ player, amount: 500, quantity: 4 })
  assert.equal(first.event_bonus_name, 'The White Tiger of Manouille I')
  assert.equal(first.event_bonus_eligible, true)
  assert.equal(first.october_bonus_eligible, true)
  const repeat = await purchase({ player, amount: 500, quantity: 4 })
  assert.equal(repeat.event_bonus_eligible, false)
  assert.equal(repeat.october_bonus_eligible, false)
  const griffin = await purchase({ player, amount: 1000, quantity: 2 })
  assert.equal(griffin.event_bonus_name, "Balian's Battle Griffin")
  assert.equal(griffin.event_bonus_eligible, true)
  assert.equal(griffin.october_bonus_eligible, false)
  assert.equal((await claims(player)).length, 3)
})

test('player normalization deduplicates grants while V1 and V2 totals stay independent', async () => {
  await purchase({ player: ' Test Player ', server: 'v1', amount: 1000 })
  const samePlayer = await purchase({ player: 'testplayer', server: 'v1', amount: 1000 })
  assert.equal(samePlayer.event_bonus_eligible, false)
  assert.equal(samePlayer.october_bonus_eligible, true)
  const otherServer = await purchase({ player: 'TEST PLAYER', server: 'v2', amount: 1000 })
  assert.equal(otherServer.event_bonus_eligible, true)
  assert.equal(otherServer.october_bonus_eligible, false)
  assert.equal(await total('testplayer', 'v1'), 2000)
  assert.equal(await total('testplayer', 'v2'), 1000)
  assert.equal((await claims('testplayer', 'v1')).length, 2)
  assert.equal((await claims('testplayer', 'v2')).length, 1)
})

test('unverified and rejected submissions reserve nothing; later verification counts once', async () => {
  const player = 'later-verified'
  const pending = await purchase({ player, amount: 1000, verified: false, status: 'pending' })
  const rejected = await purchase({ player, amount: 1000, status: 'rejected' })
  assert.equal(await total(player), 0)
  assert.equal((await claims(player)).length, 0)
  await db.query("update donations set payment_verified_at=now(), status='approved' where id=$1", [pending.id])
  assert.equal(await total(player), 1000)
  await db.query("update donations set status='approved' where id=$1", [rejected.id])
  assert.equal(await total(player), 2000)
  assert.equal((await current(rejected.id)).october_bonus_eligible, true)
})

test('a verified payment counts while fulfillment is pending', async () => {
  const order = await purchase({ player: 'verified-pending-fulfillment', amount: 1000, quantity: 2, status: 'pending' })
  assert.equal(Number(order.october_verified_total_usd), 2000)
  assert.equal(order.event_bonus_eligible, true)
  assert.equal(order.october_bonus_eligible, true)
})

test('review updates and verification retries preserve original snapshots without double credit', async () => {
  const player = 'retry-player'
  const first = await purchase({ player, amount: 1000 })
  const second = await purchase({ player, amount: 1000 })
  for (let i = 0; i < 3; i++) {
    await db.query("update donations set payment_verified_at=now(), status='approved' where id in ($1,$2)", [first.id, second.id])
  }
  assert.equal(await total(player), 2000)
  assert.equal(Number((await current(first.id)).october_verified_total_usd), 1000)
  assert.equal(Number((await current(second.id)).october_verified_total_usd), 2000)
  assert.equal((await claims(player)).length, 2)
})

test('verified credit and grants are immutable if verification is later removed or order rejected', async () => {
  const player = 'immutable-credit'
  const order = await purchase({ player, amount: 1000, quantity: 2 })
  await db.query("update donations set payment_verified_at=null, status='rejected' where id=$1", [order.id])
  assert.equal(await total(player), 2000)
  assert.equal((await current(order.id)).october_bonus_eligible, true)
  assert.equal((await claims(player)).length, 2)
  await db.query("update donations set payment_verified_at=now(), status='approved' where id=$1", [order.id])
  assert.equal(await total(player), 2000)
})

test('rapid independent orders accumulate all credits and assign a single crossing award', async () => {
  // PGlite serializes calls on one session; this verifies exact totals and the
  // uniqueness rule. Multi-session PostgreSQL concurrency is not simulated.
  const player = 'rapid-orders'
  const orders = await Promise.all(Array.from({ length: 24 }, () => purchase({ player, amount: 100 })))
  assert.equal(await total(player), 2400)
  assert.equal(orders.filter(order => order.october_bonus_eligible).length, 1)
  assert.equal((await claims(player)).length, 1)
})

test('invalid verified player IDs and nonpositive quantities fail without reserving credit', async () => {
  for (const player of ['', '   ', null]) await assert.rejects(purchase({ player }), /Player ID is required/)
  for (const quantity of [0, -1]) await assert.rejects(purchase({ player: 'invalid-quantity', quantity }), /positive package quantity/)
  assert.equal(await total('invalid-quantity'), 0)
  const legacyQuantity = await purchase({ player: 'legacy-quantity', amount: 100, quantity: null })
  assert.equal(Number(legacyQuantity.october_verified_total_usd), 100)
})

test('September grants still work and remain separate from October mounts', async () => {
  const player = 'both-months'
  const september = await purchase({ player, packageId: 'september-supply-500', amount: 500 })
  assert.equal(september.event_bonus_name, 'Rare Monster Weapon Style SET')
  assert.equal(september.event_bonus_eligible, true)
  const october = await purchase({ player, amount: 500 })
  assert.equal(october.event_bonus_name, 'The White Tiger of Manouille I')
  assert.equal(october.event_bonus_eligible, true)
  assert.equal(await total(player), 500)
})

test('rerunning October migration is idempotent for purchases, totals, snapshots and grants', async () => {
  const snapshot = async () => ({
    credits: (await db.query('select * from october_verified_purchase_credits order by source_donation_id')).rows,
    totals: (await db.query('select * from october_verified_purchase_totals order by server, player_id_normalized')).rows,
    claims: (await db.query('select * from october_event_bonus_claims order by id')).rows,
    donations: (await db.query('select * from donations order by id')).rows,
  })
  const initial = await snapshot()
  await db.exec(octoberSql)
  assert.deepEqual(await snapshot(), initial)
})

test('clients cannot mutate October ledgers; only admins can read their rows', async () => {
  await db.exec('set role anon')
  try {
    await assert.rejects(db.query('select * from october_verified_purchase_totals'), /permission denied/)
  } finally { await db.exec('reset role') }

  await db.exec('set role authenticated')
  try {
    for (const table of ['october_event_bonus_claims', 'october_verified_purchase_credits', 'october_verified_purchase_totals']) {
      assert.equal((await db.query(`select * from ${table}`)).rows.length, 0)
      await assert.rejects(db.query(`delete from ${table}`), /permission denied/)
    }
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [ADMIN_ID])
    assert.ok((await db.query('select * from october_verified_purchase_totals')).rows.length > 0)
    await assert.rejects(db.query('delete from october_verified_purchase_totals'), /permission denied/)
  } finally {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub','',false)")
  }
})
