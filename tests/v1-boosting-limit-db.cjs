// Both actual migrations run in isolated PostgreSQL; never uses a live database.
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { before, after, test } = require('node:test')
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
const migration = readFileSync(path.join(__dirname, '../supabase/migrations/20261016_v1_boosting_purchase_limit.sql'), 'utf8')
let original, oldIds, effectiveAt
async function purchase(player, tier = 50, options = {}) {
  const row = {
    player_id: player, server: 'v1', selected_package_id: `boosting-${tier}`,
    selected_package_title: 'BOOSTING PACKAGE', selected_package_amount: tier,
    package_quantity: 1, currency: 'USD', amount: tier, ...options,
  }
  const keys = Object.keys(row)
  return (await db.query(`insert into donations(${keys.join(',')}) values(${keys.map((_, i) => '$' + (i + 1)).join(',')}) returning *`, Object.values(row))).rows[0]
}
async function eligible(player, tier = 50, order = null) {
  return (await db.query('select check_v1_boosting_eligibility($1,$2,$3) as eligible', [player, `boosting-${tier}`, order])).rows[0].eligible
}
async function reserve(player, order, tier = 50) {
  return db.query('select reserve_v1_boosting_paypal($1,$2,$3)', [player, `boosting-${tier}`, order])
}
before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table donations (
      id uuid primary key default gen_random_uuid(), player_id text not null, server text not null,
      created_at timestamptz not null default clock_timestamp(), selected_package_id text,
      selected_package_title text, selected_package_amount numeric, package_quantity integer,
      currency text, amount numeric, status text not null default 'pending',
      payment_verified_at timestamptz, fulfillment_status text not null default 'not_delivered',
      payment_method text default 'gcash', paypal_order_id text, paypal_capture_id text unique);
    create function normalize_playcrows_player_id(value text) returns text language sql immutable strict
      as $$select lower(regexp_replace(trim(value), '[[:space:]]+', '', 'g'))$$;`)
  await db.exec(readFileSync(path.join(__dirname, '../supabase/migrations/20261015_boosting_packages.sql'), 'utf8'))
  const past = '2026-01-01T00:00:00Z'
  oldIds = [
    await purchase('History', 50, { package_quantity: 2, amount: 100, created_at: past }),
    await purchase(' HISTORY ', 50, { package_quantity: 3, amount: 150, created_at: past }),
    await purchase('Paid', 500, { package_quantity: 3, amount: 1500, created_at: past, payment_verified_at: past }),
    await purchase('Rejected', 200, { created_at: past, status: 'rejected' }),
    await purchase('RejectedPaid', 1000, { created_at: past, status: 'rejected', payment_verified_at: past }),
    await purchase('RejectedFree', 200, { created_at: past, status: 'rejected', package_quantity: 3, amount: 600 }),
  ]
  original = (await db.query('select * from donations order by id')).rows
  await db.exec(migration)
  effectiveAt = (await db.query('select effective_at from v1_boosting_limit_settings')).rows[0].effective_at
})
after(async () => db.close())

test('backfill preserves historical orders and quantities, including duplicate and rejected paid orders', async () => {
  assert.deepEqual((await db.query('select * from donations order by id')).rows, original)
  assert.equal(await eligible(' H i S t O r Y '), false)
  assert.equal(await eligible('Paid', 500), false)
  assert.equal(await eligible('Rejected', 200), true)
  assert.equal(await eligible('RejectedPaid', 1000), false)
  // Reviewing an old multi-quantity order must still work.
  await db.query("update donations set status='approved' where id=$1", [oldIds[0].id])
})

test('V1 allows one of EACH tier per normalized account, while V2 and ordinary packages remain unrestricted', async () => {
  for (const tier of [50, 200, 500, 1000]) {
    await purchase('SingleAccount', tier)
    await assert.rejects(purchase(' SINGLE ACCOUNT ', tier), /V1_BOOSTING_LIMIT/)
  }
  for (let i = 0; i < 2; i++) {
    await purchase('SingleAccount', 50, { server: 'v2', package_quantity: 3, amount: 150 })
    await purchase('SingleAccount', 50, { selected_package_id: 'currency-50', selected_package_title: 'Diamond Package', package_quantity: 3, amount: 150 })
  }
  await assert.rejects(purchase('TooMany', 50, { package_quantity: 2, amount: 100 }), /V1_BOOSTING_LIMIT/)
  assert.equal(await eligible('TooMany'), true)
})

test('unpaid rejection releases its tier; reactivating that rejected order cannot bypass a later purchase', async () => {
  const first = await purchase('RejectedRetry')
  await db.query("update donations set status='rejected' where id=$1", [first.id])
  assert.equal(await eligible('RejectedRetry'), true)
  await purchase('RejectedRetry')
  await assert.rejects(db.query("update donations set status='approved' where id=$1", [first.id]), /V1_BOOSTING_LIMIT/)
  await db.query("update donations set status='rejected' where id=$1", [first.id])
})

test('verified or delivered purchases remain consumed through rejection, clearing fields, and deletion', async () => {
  for (const state of [{ payment_verified_at: new Date().toISOString() }, { fulfillment_status: 'delivered' }]) {
    const player = state.payment_verified_at ? 'VerifiedForever' : 'DeliveredForever'
    const row = await purchase(player, 200, state)
    await db.query("update donations set status='rejected',payment_verified_at=null,fulfillment_status='not_delivered' where id=$1", [row.id])
    assert.equal(await eligible(player, 200), false)
    await db.query('delete from donations where id=$1', [row.id])
    await assert.rejects(purchase(player, 200), /V1_BOOSTING_LIMIT/)
  }
})

test('historical duplicate pending orders keep the hold until every unpaid order is rejected', async () => {
  await db.query("update donations set status='rejected' where id=$1", [oldIds[0].id])
  assert.equal(await eligible('History'), false)
  await db.query("update donations set status='rejected' where id=$1", [oldIds[1].id])
  assert.equal(await eligible('History'), true)
  await purchase('Rejected', 200)
  await assert.rejects(db.query("update donations set status='approved' where id=$1", [oldIds[3].id]), /V1_BOOSTING_LIMIT/)
  // A historical rejected multi-quantity order cannot be revived as a fresh bulk purchase.
  await db.query("update donations set status='rejected' where id=$1", [oldIds[5].id])
  await assert.rejects(db.query("update donations set status='approved' where id=$1", [oldIds[5].id]), /V1_BOOSTING_LIMIT/)
  assert.equal(await eligible('RejectedFree', 200), true)
  await purchase('RejectedFree', 200)
})

test('competing PayPal reservations have one winner; same order retries and final insertion share its hold', async () => {
  const attempts = await Promise.allSettled([reserve('Racing', 'ORDERA'), reserve(' RACING ', 'ORDERB')])
  assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1)
  const claim = (await db.query("select * from v1_boosting_purchase_claims where player_id_normalized='racing'")).rows[0]
  await reserve('Racing', claim.paypal_order_id)
  assert.equal(await eligible('Racing'), false)
  assert.equal(await eligible('Racing', 50, claim.paypal_order_id), true)
  await assert.rejects(purchase('Racing'), /V1_BOOSTING_LIMIT/)
  await purchase('Racing', 50, { payment_method: 'paypal', paypal_order_id: claim.paypal_order_id,
    paypal_capture_id: 'CAPTUREA', payment_verified_at: new Date().toISOString() })
  await reserve('Racing', claim.paypal_order_id)
  await assert.rejects(reserve('Racing', 'ORDERC'), /V1_BOOSTING_LIMIT/)
})

test('duplicate manual inserts serialize, and a failed donation rolls back its claim', async () => {
  const attempts = await Promise.allSettled([purchase('ManualRace'), purchase(' MANUAL RACE ')])
  assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1)
  await assert.rejects(purchase('Rollback', 500, { selected_package_amount: 50 }), /Invalid Boosting/)
  assert.equal(await eligible('Rollback', 500), true)
})

test('late recovery preserves already paid historical quantities; current captured quantities must be one', async () => {
  const prior = new Date(new Date(effectiveAt).getTime() - 1000).toISOString()
  const old = await purchase('Paid', 500, { package_quantity: 4, amount: 2000,
    payment_method: 'paypal', paypal_order_id: 'OLDORDER', paypal_capture_id: 'OLDCAPTURE', payment_verified_at: prior })
  assert.equal(old.package_quantity, 4)
  assert.equal(Number(old.cumulative_credit_usd), 2000)
  await db.query("update donations set status='approved' where id=$1", [old.id])
  await assert.rejects(purchase('CurrentCaptured', 500, { package_quantity: 4, amount: 2000,
    payment_method: 'paypal', paypal_order_id: 'NEWORDER', paypal_capture_id: 'NEWCAPTURE', payment_verified_at: new Date().toISOString() }), /V1_BOOSTING_LIMIT/)
})

test('migration rerun retains cutoff, reservations and business records; browser roles cannot call private RPCs', async () => {
  const rows = (await db.query('select * from donations order by id')).rows
  await reserve('WaitingCapture', 'WAITORDER')
  await db.exec(migration)
  assert.deepEqual((await db.query('select effective_at from v1_boosting_limit_settings')).rows[0].effective_at, effectiveAt)
  assert.deepEqual((await db.query('select * from donations order by id')).rows, rows)
  assert.equal(await eligible('WaitingCapture'), false)
  await db.exec('set role anon')
  await assert.rejects(eligible('PublicCaller'), /permission denied/)
  await db.exec('reset role')
})
