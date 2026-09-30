// Actual PostgreSQL migration upgrade tests. Requires isolated @electric-sql/pglite.
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { before, after, test } = require('node:test')
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
const sql = name => readFileSync(path.join(__dirname, '../supabase/migrations', name), 'utf8')
const update = sql('20261002_october_single_mount_rules.sql')
const legacy = {}
const tiger = 'The White Tiger of Manouille I'

async function purchase(player, amount, overrides = {}) {
  const { server='v1', quantity=1, verified=true, status='approved', delivered=false, packageId='october-supply-'+amount } = overrides
  return (await db.query(`insert into donations (player_id, server, selected_package_id,
    package_quantity, selected_package_amount, payment_verified_at, status, fulfillment_status,
    items_delivered, fulfillment_notes, reference_code)
    values ($1,$2,$3,$4,$5,$6,$7,$8,'Recorded package delivery','Original evidence','LOCAL') returning *`,
    [player,server,packageId,quantity,amount,verified?'2026-10-01T12:00:00Z':null,status,delivered?'delivered':'not_delivered'])).rows[0]
}
async function current(id) { return (await db.query('select * from donations where id=$1',[id])).rows[0] }
async function claims(player, server='v1') {
  return (await db.query('select * from october_event_bonus_claims where player_id_normalized=normalize_playcrows_player_id($1) and server=$2 order by bonus_key',[player,server])).rows
}

before(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create table admin_users (user_id uuid);
    create table donations (
      id uuid primary key default gen_random_uuid(), player_id text, reference_code text,
      selected_package_id text, package_quantity integer, selected_package_amount numeric,
      payment_verified_at timestamptz, created_at timestamptz default now(),
      status text not null default 'pending' check (status in ('pending','approved','rejected')),
      fulfillment_status text not null default 'not_delivered', items_delivered text, fulfillment_notes text
    );`)
  await db.exec(sql('20260901_september_event_bonus_claim_guard.sql'))
  await db.exec(sql('20260901_dual_server_donation_center.sql'))
  await db.exec(sql('20261001_october_mount_bonuses.sql'))
  legacy.hundred = await purchase('prior-hundred',100,{delivered:true})
  legacy.tiger = await purchase('prior-tiger',500)
  legacy.retired = await purchase('prior-retired',1000,{quantity:2})
  legacy.delivered = await purchase('prior-delivered',1000,{quantity:2,delivered:true})
  const draft="Recorded package delivery + Balian's Battle Griffin (One-Time Event Bonus) + Nureddin's Red Death (One-Time October $2,000 Bonus)"
  await db.query('update donations set items_delivered=$1, fulfillment_notes=$1 where id=$2',[draft,legacy.retired.id])
  await db.exec(update)
})
after(async()=>db.close())

test('migration retires outstanding bonuses and draft suffixes without deleting audit entries',async()=>{
  const order=await current(legacy.retired.id)
  assert.equal(order.event_bonus_name,null)
  assert.equal(order.event_bonus_eligible,null)
  assert.equal(order.october_bonus_eligible,null)
  assert.equal(order.items_delivered,'Recorded package delivery')
  assert.equal(order.fulfillment_notes,'Recorded package delivery')
  assert.equal((await claims('prior-retired')).length,2,'Historical ledger retained')
  const delivered=await current(legacy.delivered.id)
  assert.equal(delivered.items_delivered,legacy.delivered.items_delivered)
  assert.equal(delivered.fulfillment_notes,legacy.delivered.fulfillment_notes)
  assert.equal(delivered.event_bonus_name,"Balian's Battle Griffin",'Completed audit retained')
})
test('past verified $100 purchases qualify without changing completed delivery evidence',async()=>{
  const order=await current(legacy.hundred.id)
  assert.equal(order.event_bonus_name,tiger)
  assert.equal(order.event_bonus_eligible,true)
  assert.equal(order.items_delivered,legacy.hundred.items_delivered)
  assert.equal(order.fulfillment_notes,legacy.hundred.fulfillment_notes)
  assert.equal(order.fulfillment_status,'delivered')
})
test('an existing $500 Tiger claim prevents another Tiger through the newly eligible $100 tier',async()=>{
  const order=await purchase('prior-tiger',100)
  assert.equal(order.event_bonus_eligible,false)
  assert.equal((await claims('prior-tiger')).filter(c=>c.bonus_key==='white-tiger-of-manouille-i').length,1)
  assert.equal((await current(legacy.tiger.id)).event_bonus_eligible,true)
})
test('either $100 or $500 qualifies on both servers with one shared entitlement',async()=>{
  for(const server of ['v1','v2']) for(const first of [100,500]) {
    const player='eligible-'+first
    const order=await purchase(player,first,{server,quantity:3})
    assert.equal(order.event_bonus_name,tiger)
    assert.equal(order.event_bonus_eligible,true)
    assert.equal(order.october_bonus_eligible,null)
    const other=await purchase(player,first===100?500:100,{server})
    assert.equal(other.event_bonus_eligible,false)
    assert.equal((await claims(player,server)).length,1)
  }
})
test('neither $50 quantities nor $1,000 packages nor $2,000 total unlock any mount',async()=>{
  for(const amount of [50,1000]) {
    const player='excluded-'+amount
    const order=await purchase(player,amount,{quantity:40})
    assert.equal(order.event_bonus_eligible,null)
    assert.equal(order.october_bonus_eligible,null)
    assert.equal((await claims(player)).length,0)
  }
  const progress=await db.query("select * from october_verified_purchase_totals where player_id_normalized like 'excluded-%'")
  assert.equal(progress.rows.length,0,'Retired cumulative totals are not updated')
})
test('unverified or rejected eligible purchases reserve nothing until verified and accepted',async()=>{
  const pending=await purchase('pending',100,{verified:false,status:'pending'})
  const rejected=await purchase('rejected',500,{status:'rejected'})
  assert.equal((await claims('pending')).length,0)
  assert.equal((await claims('rejected')).length,0)
  await db.query("update donations set payment_verified_at=now() where id=$1",[pending.id])
  assert.equal((await current(pending.id)).event_bonus_eligible,true,'Verified pending fulfillment counts')
  await db.query("update donations set status='approved' where id=$1",[rejected.id])
  assert.equal((await current(rejected.id)).event_bonus_eligible,true)
})
test('normalized player IDs deduplicate while server scope remains independent',async()=>{
  await purchase(' Same Player ',100)
  const same=await purchase('sameplayer',500)
  const other=await purchase('SAME PLAYER',100,{server:'v2'})
  assert.equal(same.event_bonus_eligible,false)
  assert.equal(other.event_bonus_eligible,true)
})
test('verification retries and migration reruns neither reaward nor rewrite evidence',async()=>{
  const first=await purchase('retry',100)
  for(let i=0;i<3;i++) await db.query('update donations set payment_verified_at=now() where id=$1',[first.id])
  const snapshot=async()=>({claims:(await db.query('select * from october_event_bonus_claims order by id')).rows,
    orders:(await db.query('select * from donations order by id')).rows})
  const prior=await snapshot()
  await db.exec(update)
  assert.deepEqual(await snapshot(),prior)
})
test('September rewards remain independent and invalid eligible orders fail',async()=>{
  const september=await purchase('september',500,{packageId:'september-supply-500'})
  assert.equal(september.event_bonus_name,'Rare Monster Weapon Style SET')
  assert.equal((await purchase('september',100)).event_bonus_name,tiger)
  await assert.rejects(purchase(' ',100),/Player ID is required/)
  await assert.rejects(purchase('invalid',500,{quantity:0}),/positive package quantity/)
})
