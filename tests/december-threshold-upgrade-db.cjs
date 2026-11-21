// Execute the real migrations in isolated PostgreSQL; never a live project.
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { before, after, test } = require('node:test')
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
const migration = name => readFileSync(path.join(__dirname, '../supabase/migrations', name), 'utf8')
const reward = 'Garuda of Eternity Wings'
const admin = '00000000-0000-0000-0000-000000000099'
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0]
const row = async id => (await db.query('select * from donations where id=$1', [id])).rows[0]
const total = async player => Number(await scalar('select coalesce((select total_usd from december_bonus_private.player_totals where player_id_normalized=lower(btrim($1))),0)', [player]))
const claim = async player => (await db.query('select * from december_bonus_private.reward_claims where player_id_normalized=lower(btrim($1))', [player])).rows[0]
async function purchase(player, price = 500, options = {}) {
  const values = { player_id: player, server: 'v1', selected_package_id: `december-supply-${price}`,
    selected_package_title: 'DECEMBER PACKAGE', selected_package_amount: price, package_quantity: 1,
    amount: price, currency: 'USD', discount_percent: 0, payment_method: 'gcash', status: 'pending',
    payment_verified_at: new Date().toISOString(), ...options }
  return (await db.query(`insert into donations(${Object.keys(values).join(',')}) values(${Object.keys(values).map((_,i) => `$${i+1}`).join(',')}) returning *`, Object.values(values))).rows[0]
}
async function update(id, values) {
  return (await db.query(`update donations set ${Object.keys(values).map((key,i) => `${key}=$${i+2}`).join(',')} where id=$1 returning *`, [id, ...Object.values(values)])).rows[0]
}
const deliver = (id, garuda) => update(id, { fulfillment_status: 'delivered', fulfilled_at: new Date().toISOString(), items_delivered: 'Package' + (garuda ? ` + ${reward} (One-Time December $1,500 Bonus)` : '') })
let historical
before(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated;
    create table admin_users(user_id uuid primary key); insert into admin_users values('${admin}');
    grant select on admin_users to authenticated;
    create function public.normalize_playcrows_player_id(text) returns text language sql immutable as $$select lower(btrim($1))$$;
    create table donations(id uuid primary key default gen_random_uuid(), reference_code text default 'TEST',
      player_id text, server text, selected_package_id text, selected_package_title text,
      selected_package_amount numeric, package_quantity integer, discount_percent numeric,
      payment_verified_at timestamptz, created_at timestamptz default now(), status text,
      payment_method text, paypal_order_id text, paypal_capture_id text,paddle_transaction_id text,currency text,amount numeric,
      fulfillment_status text default 'not_delivered',items_delivered text, fulfilled_at timestamptz,
      delivered_to text, fulfilled_by text, fulfillment_evidence_path text, fulfillment_evidence_name text,
      fulfillment_evidence_mime_type text, fulfillment_evidence_size_bytes bigint);
  `)
  historical = await purchase('history', 100, { selected_package_id: 'november-supply-100', selected_package_title: 'NOVEMBER PACKAGE', payment_verified_at: null })
  await db.exec(migration('20261111143850_mount_preorder_bonus.sql'))
  await db.exec(migration('20261113180731_reduce_mount_preorder_step_three_price.sql'))
  await db.exec(migration('20261121172350_december_packages_and_garuda_bonus.sql'))
})
after(async () => db.close())

const loweredMigration = () => migration('20261121175319_lower_december_garuda_threshold.sql')
const deliveryFields = ['fulfillment_status','items_delivered','fulfilled_at','delivered_to','fulfilled_by',
  'fulfillment_evidence_path','fulfillment_evidence_name','fulfillment_evidence_mime_type','fulfillment_evidence_size_bytes']
let legacyConsumed, legacyClaim, legacyReserved, pending1500, revocableContribution, deliveredSources = new Map()
async function asUser(id, fn, role='authenticated') {
  await db.exec(`set role ${role}`)
  await db.query("select set_config('app.user_id',$1,false)",[id])
  try { return await fn() } finally { await db.exec("reset role; set app.user_id=''") }
}
const supplement = id => scalar('select public.mark_december_bonus_delivered($1)',[id])

test('seed real previous-threshold orders including already delivered ordinary packages',async()=>{
  for(const price of [1000,500]) {
    const paid=await purchase('old-all-delivered',price)
    assert.equal(paid.december_bonus_eligible,false)
    const completed=await deliver(paid.id,false)
    deliveredSources.set(paid.id,completed)
    const revocable=await purchase('old-supplement-reversal',price)
    await deliver(revocable.id,false)
    if(price===1000) revocableContribution=revocable
  }
  await purchase('old-pending',1000)
  pending1500=await purchase('old-pending',500)
  assert.equal(pending1500.december_bonus_eligible,false)
  legacyReserved=await purchase('old-reserved',500,{package_quantity:5})
  assert.equal(legacyReserved.december_bonus_eligible,true)
  await update(legacyReserved.id,{items_delivered:`Package + ${reward} (One-Time December $2,500 Bonus)`})
  legacyConsumed=await purchase('old-consumed',500,{package_quantity:5})
  legacyConsumed=await update(legacyConsumed.id,{fulfillment_status:'delivered',fulfilled_at:new Date().toISOString(),
    items_delivered:`Package + ${reward} (One-Time December $2,500 Bonus)`,fulfillment_evidence_path:'historical-evidence.png'})
  legacyClaim=await claim('old-consumed')
  await purchase('old-rejected',1000,{package_quantity:3,status:'rejected'})
  await purchase('old-unverified',1000,{package_quantity:3,payment_verified_at:null})
})

test('upgrade unlocks existing $1500 accounts without inventing delivery or rewriting completed evidence',async()=>{
  await db.exec(loweredMigration())
  for(const player of ['old-pending','old-all-delivered']) {
    const reserved=await claim(player)
    assert.ok(reserved.source_donation_id)
    assert.equal(reserved.delivered_at,null)
    const source=await row(reserved.source_donation_id)
    assert.equal(source.december_bonus_eligible,true)
    assert.equal(source.december_bonus_delivered_at,null)
    assert.equal(Number(source.december_verified_total_usd),1500)
  }
  for(const [id,old] of deliveredSources) {
    const current=await row(id)
    for(const field of deliveryFields) assert.deepEqual(current[field],old[field])
  }
  const historicalGrant=await row(legacyConsumed.id)
  for(const field of deliveryFields) assert.deepEqual(historicalGrant[field],legacyConsumed[field])
  assert.deepEqual(historicalGrant.december_bonus_delivered_at,legacyClaim.delivered_at)
  assert.equal((await claim('old-consumed')).source_donation_id,legacyConsumed.id)
  assert.equal((await row(legacyReserved.id)).items_delivered,`Package + ${reward} (One-Time December $1,500 Bonus)`)
  assert.equal((await claim('old-rejected')).source_donation_id,null)
  assert.equal((await claim('old-unverified')).source_donation_id,null)
})

test('$1450 does not qualify; exactly $1500 does, using full price despite discounts',async()=>{
  await purchase('boundary',1000,{amount:900,discount_percent:10})
  await purchase('boundary',200,{package_quantity:2,amount:360,discount_percent:10})
  await purchase('boundary',50,{amount:45,discount_percent:10})
  assert.equal(await total('boundary'),1450)
  assert.equal((await claim('boundary')).source_donation_id,null)
  const crossing=await purchase('boundary',50,{amount:45,discount_percent:10})
  assert.equal(await total('boundary'),1500)
  assert.equal(crossing.december_bonus_eligible,true)
  assert.equal(crossing.december_bonus_delivered_at,null)
  assert.equal((await claim('boundary')).source_donation_id,crossing.id)
})

test('supplemental delivery is admin-only and cannot be used for an undelivered package',async()=>{
  const source=(await claim('old-all-delivered')).source_donation_id
  await asUser('',()=>assert.rejects(supplement(source),/permission denied/),'anon')
  await asUser('00000000-0000-0000-0000-000000000011',()=>assert.rejects(supplement(source),/Administrator access required/))
  const pendingSource=(await claim('old-pending')).source_donation_id
  await asUser(admin,()=>assert.rejects(supplement(pendingSource),/package delivery workflow/))
  assert.equal((await claim('old-all-delivered')).delivered_at,null)
})

test('admin records supplemental Garuda once without a new purchase or changed package evidence',async()=>{
  const source=(await claim('old-all-delivered')).source_donation_id
  const before=await row(source)
  const result=await asUser(admin,()=>supplement(source))
  assert.equal(result.id,source)
  assert.ok(result.december_bonus_delivered_at)
  const consumed=await claim('old-all-delivered')
  assert.equal(consumed.delivered_by,admin)
  const after=await row(source)
  for(const field of deliveryFields) assert.deepEqual(after[field],before[field])
  const repeated=await asUser(admin,()=>supplement(source))
  assert.deepEqual(repeated,result)
  await purchase('old-all-delivered',1000,{package_quantity:3})
  assert.deepEqual(await claim('old-all-delivered'),consumed)
})

test('current eligibility is checked again before supplemental delivery and fake timestamps are discarded',async()=>{
  const oldSource=(await claim('old-supplement-reversal')).source_donation_id
  await update(revocableContribution.id,{status:'rejected'})
  await asUser(admin,()=>assert.rejects(supplement(oldSource),/not reserved/))
  assert.equal((await claim('old-supplement-reversal')).delivered_at,null)
  await update(revocableContribution.id,{status:'approved'})
  const restoredSource=(await claim('old-supplement-reversal')).source_donation_id
  const restored=await asUser(admin,()=>supplement(restoredSource))
  assert.ok(restored.december_bonus_delivered_at)
  const a=await purchase('supplement-reversal',1000)
  await deliver(a.id,false)
  const b=await purchase('supplement-reversal',500,{payment_verified_at:null})
  // Mimic an old delivered ordinary package becoming verified later.
  await update(b.id,{fulfillment_status:'delivered',payment_verified_at:null}).then(
    ()=>assert.fail('unverified package must not be fulfilled'),
    error=>assert.match(error.message,/DECEMBER_REVIEW_REQUIRED/))
  await update(b.id,{payment_verified_at:new Date().toISOString()})
  const spoof=await update(b.id,{december_bonus_delivered_at:'2001-01-01T00:00:00Z'})
  assert.equal(spoof.december_bonus_delivered_at,null)
  await update(b.id,{status:'rejected'})
  assert.equal(await total('supplement-reversal'),1000)
  await asUser(admin,()=>assert.rejects(supplement(a.id),/not reserved/))
})

test('old delivered Garuda remains consumed and migration reruns preserve current claims and evidence',async()=>{
  const next=await purchase('old-consumed',1000,{package_quantity:3})
  assert.equal(next.december_bonus_eligible,false)
  const before=(await db.query('select * from december_bonus_private.reward_claims order by player_id_normalized')).rows
  const evidence=await row(legacyConsumed.id)
  await db.exec(loweredMigration())
  assert.deepEqual((await db.query('select * from december_bonus_private.reward_claims order by player_id_normalized')).rows,before)
  const current=await row(legacyConsumed.id)
  for(const field of deliveryFields) assert.deepEqual(current[field],evidence[field])
})

