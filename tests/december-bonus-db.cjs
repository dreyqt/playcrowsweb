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
const deliver = (id, garuda) => update(id, { fulfillment_status: 'delivered', fulfilled_at: new Date().toISOString(), items_delivered: 'Package' + (garuda ? ` + ${reward} (One-Time December $2,500 Bonus)` : '') })
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

test('installation preserves historical purchases and keeps private ledgers inaccessible', async () => {
  const current = await row(historical.id)
  for (const [key,value] of Object.entries(historical)) assert.deepEqual(current[key],value)
  for (const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`)
    try {
      await assert.rejects(db.query('select * from december_bonus_private.purchase_credits'), /permission denied/)
      await assert.rejects(db.query('update december_bonus_private.reward_claims set delivered_at=null'), /permission denied/)
      await assert.rejects(db.query('select december_bonus_private.process_donation()'), /permission denied/)
    } finally { await db.exec('reset role') }
  }
})

test('full listed price combines all December tiers and quantities for one normalized player', async () => {
  const first = await purchase(' MixPlayer ',50,{package_quantity:2,amount:5400,currency:'PHP',discount_percent:10})
  await purchase('mixplayer',100)
  await purchase('MIXPLAYER',200,{package_quantity:4})
  await purchase('mixplayer',500)
  assert.equal(await total('mixplayer'),1500)
  assert.equal((await row(first.id)).december_bonus_eligible,false)
  const threshold=await purchase('mixplayer',1000,{amount:900,discount_percent:10})
  assert.equal(await total('mixplayer'),2500)
  assert.equal(threshold.december_bonus_eligible,true)
  assert.equal((await claim('mixplayer')).source_donation_id,threshold.id)
  const more=await purchase('mixplayer',1000,{package_quantity:5})
  assert.equal(await total('mixplayer'),7500)
  assert.equal(more.december_bonus_eligible,false)
  assert.equal((await claim('mixplayer')).source_donation_id,threshold.id)
})

test('unverified/rejected/other packages never contribute and one large order grants only once', async () => {
  const unpaid=await purchase('unpaid',1000,{package_quantity:3,payment_verified_at:null})
  assert.equal(unpaid.december_bonus_eligible,null)
  await purchase('unpaid',1000,{status:'rejected'})
  await purchase('unpaid',1000,{selected_package_id:'currency-1000',selected_package_title:'Diamond Package'})
  assert.equal(await total('unpaid'),0)
  const verified=await update(unpaid.id,{payment_verified_at:new Date().toISOString()})
  assert.equal(verified.december_bonus_eligible,true)
  assert.equal(await total('unpaid'),3000)
  assert.equal(Number(await scalar('select count(*) from december_bonus_private.reward_claims where player_id_normalized=$1',['unpaid'])),1)
})

test('forged package details, server, title and quantities fail before credit', async () => {
  for(const options of [{server:'v2'},{selected_package_id:'december-supply-2500'},
    {selected_package_amount:1},{selected_package_title:'NOVEMBER PACKAGE'},{package_quantity:0},{package_quantity:1000},{player_id:' '}]) {
    await assert.rejects(purchase('forged',500,options),/Invalid December/)
  }
  assert.equal(await total('forged'),0)
  const pending=await purchase('spoof-flags',500,{december_bonus_eligible:true,december_verified_total_usd:2500,december_bonus_reserved_at:new Date().toISOString()})
  assert.equal(pending.december_bonus_eligible,false)
  assert.equal(Number(pending.december_verified_total_usd),500)
})

test('verification retries are idempotent and verified purchase identity cannot be changed', async () => {
  const paid=await purchase('retry',500)
  for(let i=0;i<3;i++) await update(paid.id,{status:'approved',payment_verified_at:new Date().toISOString()})
  assert.equal(await total('retry'),500)
  for(const values of [{player_id:'another'},{package_quantity:5},{selected_package_amount:1000},
    {selected_package_id:'currency-500'},{paypal_capture_id:'NEW'},{currency:'PHP'},{amount:1}]) {
    await assert.rejects(update(paid.id,values),/immutable/)
  }
  assert.equal(await total('another'),0)
})

test('replayed payment evidence cannot count twice, including after donation deletion', async () => {
  for(const provider of ['paypal_order_id','paypal_capture_id','paddle_transaction_id']) {
    const paid=await purchase(`dup-${provider}`,500,{[provider]:`UNIQUE-${provider}`})
    await assert.rejects(purchase('duplicate',500,{[provider]:`UNIQUE-${provider}`}),/duplicate key/)
    await db.query('delete from donations where id=$1',[paid.id])
    await assert.rejects(purchase('duplicate',500,{[provider]:`UNIQUE-${provider}`}),/duplicate key/)
  }
  assert.equal(await total('duplicate'),0)
})

test('rejection and unverification revoke undelivered credit, and re-verification restores exactly once', async () => {
  const a=await purchase('reverse',1000,{package_quantity:2})
  const b=await purchase('reverse',500)
  assert.equal(b.december_bonus_eligible,true)
  await update(a.id,{status:'rejected'})
  assert.equal(await total('reverse'),500)
  assert.equal((await claim('reverse')).source_donation_id,null)
  await assert.rejects(deliver(b.id,true),/DECEMBER_REVIEW_REQUIRED/)
  const refreshed=await update(b.id,{items_delivered:`Package + ${reward} (One-Time December $2,500 Bonus)`})
  assert.equal(refreshed.december_bonus_eligible,false)
  assert.equal(refreshed.items_delivered,'Package')
  const restored=await update(a.id,{status:'approved'})
  assert.equal(restored.december_bonus_eligible,true)
  assert.equal(await total('reverse'),2500)
  await update(a.id,{payment_verified_at:null})
  assert.equal(await total('reverse'),500)
  await update(a.id,{payment_verified_at:new Date().toISOString()})
  assert.equal(await total('reverse'),2500)
})

test('losing a reserved source transfers eligibility, refreshed on review without rewriting sibling records', async () => {
  const a=await purchase('transfer',1000,{package_quantity:3})
  const b=await purchase('transfer',1000,{package_quantity:3})
  assert.equal(a.december_bonus_eligible,true)
  assert.equal(b.december_bonus_eligible,false)
  await update(a.id,{status:'rejected'})
  assert.equal((await claim('transfer')).source_donation_id,b.id)
  await assert.rejects(deliver(b.id,true),/DECEMBER_REVIEW_REQUIRED/)
  const refreshed=await update(b.id,{items_delivered:'Package'})
  assert.equal(refreshed.december_bonus_eligible,true)
  await deliver(b.id,true)
  assert.ok((await claim('transfer')).delivered_at)
})

test('delivery requires saved verification and exact reservation; evidence remains immutable once delivered', async () => {
  const a=await purchase('fulfill',500,{package_quantity:5,payment_verified_at:null})
  await assert.rejects(update(a.id,{payment_verified_at:new Date().toISOString(),fulfillment_status:'delivered',items_delivered:reward}),/DECEMBER_REVIEW_REQUIRED/)
  await update(a.id,{payment_verified_at:new Date().toISOString()})
  await assert.rejects(deliver(a.id,false),/DECEMBER_REVIEW_REQUIRED/)
  const delivered=await deliver(a.id,true)
  const proof=await claim('fulfill')
  assert.ok(proof.delivered_at)
  await assert.rejects(update(a.id,{items_delivered:'rewritten'}),/immutable/)
  await update(a.id,{status:'rejected'})
  assert.equal((await row(a.id)).items_delivered,delivered.items_delivered)
  const next=await purchase('fulfill',1000,{package_quantity:5})
  assert.equal(next.december_bonus_eligible,false)
  await assert.rejects(deliver(next.id,true),/DECEMBER_REVIEW_REQUIRED/)
  await deliver(next.id,false)
  await db.query('delete from donations where id=$1',[a.id])
  assert.deepEqual(await claim('fulfill'),proof)
})

test('new retired month orders fail closed, historical manual orders and old captured recovery survive', async () => {
  for(const month of ['september','october','november']) {
    for(const values of [{payment_verified_at:null},{payment_verified_at:new Date().toISOString()},
      {payment_method:'paypal',paypal_order_id:'x',paypal_capture_id:'y',payment_verified_at:null}]) {
      await assert.rejects(purchase('old-month',50,{selected_package_id:`${month}-supply-50`,...values}),/PACKAGE_RETIRED/)
    }
    const recovered=await purchase('old-month',50,{selected_package_id:`${month}-supply-50`,payment_method:'paypal',paypal_order_id:`${month}-ORDER`,paypal_capture_id:`${month}-CAPTURE`,payment_verified_at:'2026-01-01T00:00:00Z'})
    assert.equal(recovered.december_bonus_eligible,null)
  }
  await update(historical.id,{payment_verified_at:new Date().toISOString(),status:'approved'})
  assert.equal(await total('history'),0)
})

test('December integrates with the existing mount campaign while keeping its separate discount rule', async () => {
  await db.query("select set_config('app.user_id',$1,false)",[admin])
  await db.query('select start_mount_preorder_campaign()')
  await purchase('both-campaigns',500,{package_quantity:5,discount_percent:10,amount:2250})
  assert.equal(await total('both-campaigns'),2500)
  const progress=await scalar('select get_mount_preorder_progress($1)',['both-campaigns'])
  assert.equal(progress.total_paid_usd,2250)
  assert.equal((await claim('both-campaigns')).delivered_at,null)
})
