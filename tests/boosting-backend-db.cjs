// Local PostgreSQL integration checks; never connects to the deployed database.
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { before, after, test } = require('node:test')
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
const migration = readFileSync(path.join(__dirname, '../supabase/migrations/20261015_boosting_packages.sql'), 'utf8')
let historical
before(async () => {
  await db.exec(`create table donations (
    id integer generated always as identity primary key, server text, selected_package_id text,
    selected_package_title text, selected_package_amount numeric, package_quantity integer,
    currency text, amount numeric, status text default 'pending', payment_verified_at timestamptz,
    fulfillment_status text default 'not_delivered', event_bonus_selection_count integer default 0);
    insert into donations(server, selected_package_id, selected_package_title, selected_package_amount,
      package_quantity, currency, amount, status, payment_verified_at, fulfillment_status)
    values('v2','october-supply-500','OCTOBER PACKAGE',500,2,'USD',900,'approved',now(),'delivered');`)
  historical = (await db.query('select * from donations where id=1')).rows[0]
  await db.exec(migration)
})
after(async () => db.close())
async function purchase(server, amount, quantity = 1, prefix = 'boosting', options = {}) {
  return (await db.query(`insert into donations(server,selected_package_id,selected_package_title,
    selected_package_amount,package_quantity,currency,amount,cumulative_credit_usd,boosting_bonus_rewards,
    event_bonus_selection_count) values($1,$2,$3,$4,$5,$6,$7,999999,'[{"name":"spoofed","quantity":999}]',$8) returning *`,
    [server, `${prefix}-${amount}`, prefix === 'boosting' ? 'BOOSTING PACKAGE' : 'Other Package', amount, quantity,
      options.currency || 'USD', options.paid ?? amount * quantity, Math.floor(amount * quantity / 100)])).rows[0]
}

test('migration and status-only edits preserve historical payment and fulfillment records', async () => {
  const row = (await db.query('select * from donations where id=1')).rows[0]
  assert.deepEqual(row, { ...historical, cumulative_credit_usd: null, boosting_bonus_rewards: [] })
  const updated = (await db.query(`update donations set status='approved',cumulative_credit_usd=99999,
    boosting_bonus_rewards='[{"name":"spoofed"}]' where id=1 returning *`)).rows[0]
  assert.deepEqual(updated, row)
})

test('both servers and every tier/quantity derive canonical credit and per-package bonus snapshots', async () => {
  for (const server of ['v1', 'v2']) for (const amount of [50, 200, 500, 1000]) for (const quantity of [1, 3, 999]) {
    const row = await purchase(server, amount, quantity)
    assert.equal(Number(row.amount), amount * quantity)
    assert.equal(Number(row.selected_package_amount), amount)
    assert.equal(Number(row.cumulative_credit_usd), amount * quantity * (server === 'v2' ? 2 : 1))
    assert.equal(row.event_bonus_selection_count, Math.floor(amount * quantity / 100))
    assert.equal(row.boosting_bonus_rewards.length, amount === 1000 ? 9 : amount === 500 ? 2 : 0)
    for (const item of row.boosting_bonus_rewards) assert.equal(item.quantity, quantity * (amount === 500 ? 4 : 1))
    assert.equal(row.boosting_bonus_rewards.some(item => item.name === 'spoofed'), false)
    if (amount === 1000) assert.ok(row.boosting_bonus_rewards.some(item => item.name === "Zenesia's Ruling Segum (Attributed)"))
  }
})

test('ordinary packages retain ordinary full-face credit, including discounted and local-currency payments', async () => {
  for (const server of ['v1', 'v2']) for (const category of ['currency', 'support', 'september-supply', 'october-supply']) {
    const row = await purchase(server, 500, 2, category, { paid: 900 })
    assert.equal(Number(row.amount), 900)
    assert.equal(Number(row.cumulative_credit_usd), 1000)
    assert.deepEqual(row.boosting_bonus_rewards, [])
  }
  const php = await purchase('v2', 50, 1, 'boosting', { currency: 'PHP', paid: 3000 })
  assert.equal(Number(php.amount), 3000)
  assert.equal(Number(php.cumulative_credit_usd), 100)
})

test('verification/fulfillment retries preserve snapshots and cannot multiply credit twice', async () => {
  const row = await purchase('v2', 1000, 2)
  for (let index = 0; index < 3; index++) {
    const updated = (await db.query(`update donations set status='approved',payment_verified_at=now(),
      fulfillment_status='delivered',cumulative_credit_usd=999999,boosting_bonus_rewards='[]'
      where id=$1 returning *`, [row.id])).rows[0]
    assert.equal(Number(updated.cumulative_credit_usd), 4000)
    assert.equal(Number(updated.amount), 2000)
    assert.deepEqual(updated.boosting_bonus_rewards, row.boosting_bonus_rewards)
  }
})

test('invalid package IDs, face prices, titles, quantities and servers are rejected at the database boundary', async () => {
  for (const values of [
    ['v2', 'boosting-9999', 'BOOSTING PACKAGE', 9999, 1],
    ['v2', 'boosting-500', 'BOOSTING PACKAGE', 50, 1],
    ['v2', 'boosting-500', 'Fake title', 500, 1],
    ['v2', 'boosting-500', 'BOOSTING PACKAGE', 500, 0],
    ['v2', 'boosting-500', 'BOOSTING PACKAGE', 500, 1000],
    ['v2', 'boosting-500', 'BOOSTING PACKAGE', 500, null],
    ['v3', 'boosting-500', 'BOOSTING PACKAGE', 500, 1],
  ]) {
    await assert.rejects(db.query(`insert into donations(server,selected_package_id,selected_package_title,
      selected_package_amount,package_quantity,currency,amount) values($1,$2,$3,$4,$5,'USD',500)`, values), /Invalid Boosting/)
  }
})

test('actual package/server corrections recalculate once and migration reruns are idempotent', async () => {
  const row = await purchase('v2', 500, 2)
  let updated = (await db.query("update donations set server='v1',package_quantity=3,amount=1500 where id=$1 returning *", [row.id])).rows[0]
  assert.equal(Number(updated.cumulative_credit_usd), 1500)
  assert.ok(updated.boosting_bonus_rewards.every(item => item.quantity === 12))
  updated = (await db.query("update donations set selected_package_id='boosting-1000',selected_package_amount=1000,amount=3000 where id=$1 returning *", [row.id])).rows[0]
  assert.equal(Number(updated.cumulative_credit_usd), 3000)
  assert.equal(updated.boosting_bonus_rewards.length, 9)
  const before = (await db.query('select * from donations order by id')).rows
  await db.exec(migration)
  assert.deepEqual((await db.query('select * from donations order by id')).rows, before)
})
