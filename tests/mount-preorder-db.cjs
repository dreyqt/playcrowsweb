// Runs the actual migration in isolated PostgreSQL. No live data or payments.
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { before, after, test } = require('node:test')
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
const migration = readFileSync(path.join(__dirname, '../supabase/migrations/20261111143850_mount_preorder_bonus.sql'), 'utf8')
const priceMigration = readFileSync(path.join(__dirname, '../supabase/migrations/20261113180731_reduce_mount_preorder_step_three_price.sql'), 'utf8')
const admin = '00000000-0000-0000-0000-000000000099'
let oldOrder, prelaunchOrder, launchedAt
async function scalar(sql, args = []) { return Object.values((await db.query(sql, args)).rows[0])[0] }
async function asUser(id, fn, role = 'authenticated') {
  await db.exec(`set role ${role}`)
  await db.query("select set_config('app.user_id',$1,false)", [id])
  try { return await fn() } finally { await db.exec("reset role; set app.user_id=''") }
}
async function progress(player) { return asUser(admin, () => scalar('select public.get_mount_preorder_progress($1)', [player])) }
async function purchase(player, price = 500, options = {}) {
  return (await db.query(`insert into donations(player_id,server,selected_package_id,selected_package_amount,package_quantity,
    discount_percent,payment_verified_at,created_at,status,paypal_capture_id,paddle_transaction_id,currency,amount)
    values($1,$2,$3,$4,$5,$6,case when $7 then now() else null end,coalesce($8::timestamptz,now()),$9,$10,$11,$12,$13) returning *`,
    [player,options.server || 'v1',options.packageId || `november-supply-${price}`,options.face ?? price,
      options.quantity ?? 1,options.discount ?? 0,options.verified !== false,options.createdAt || null,
      options.status || 'pending',options.capture || null,options.paddle || null,options.currency || 'USD',options.amount ?? price])).rows[0]
}
before(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated;
    create table admin_users(user_id uuid primary key);
    insert into admin_users values('${admin}');
    create function public.normalize_playcrows_player_id(text) returns text language sql immutable as $$select lower(btrim($1))$$;
    create table donations(id uuid primary key default gen_random_uuid(), player_id text, server text,
      selected_package_id text,selected_package_amount numeric,package_quantity integer,discount_percent numeric,
      payment_verified_at timestamptz,created_at timestamptz default now(),status text,
      paypal_capture_id text,paddle_transaction_id text,currency text,amount numeric,
      fulfillment_status text default 'not_delivered',items_delivered text);
    grant select on admin_users to authenticated;
  `)
  oldOrder = await purchase('before-install', 1000)
  await db.exec(migration)
})
after(async () => db.close())

test('installation preserves history, starts disabled and exposes only launch status publicly', async () => {
  assert.deepEqual((await db.query('select * from donations where id=$1',[oldOrder.id])).rows[0],oldOrder)
  assert.deepEqual(await asUser('',()=>scalar('select get_mount_preorder_campaign()'),'anon'),{active:false,starts_at:null})
  assert.equal(Number(await scalar('select count(*) from mount_preorder_private.purchase_credits')),0)
  prelaunchOrder = await purchase('prelaunch',500,{verified:false})
  await purchase('disabled-paid',1000)
  assert.equal((await progress('disabled-paid')).total_paid_usd,0)
  await asUser('',async()=>{
    await assert.rejects(db.query('select get_mount_preorder_progress($1)',['someone']),/permission denied/)
    await assert.rejects(db.query('select start_mount_preorder_campaign()'),/permission denied/)
    await assert.rejects(db.query('select * from mount_preorder_private.purchase_totals'),/permission denied/)
  },'anon')
})
test('ordinary signed-in users cannot launch, read another account or deliver rewards',async()=>{
  await asUser('00000000-0000-0000-0000-000000000011',async()=>{
    await assert.rejects(db.query('select start_mount_preorder_campaign()'),/Administrator access required/)
    await assert.rejects(db.query('select get_mount_preorder_progress($1)',['someone']),/Administrator access required/)
    await assert.rejects(db.query('select mark_mount_preorder_delivered($1,1)',['someone']),/Administrator access required/)
    await assert.rejects(db.query('select * from mount_preorder_private.purchase_totals'),/permission denied/)
    await assert.rejects(db.query('update mount_preorder_campaign set active=true'),/permission denied/)
  })
})
test('admin launch is idempotent and old orders/captures remain excluded after launch',async()=>{
  await asUser(admin,()=>scalar('select start_mount_preorder_campaign()'))
  const campaign=await scalar('select get_mount_preorder_campaign()')
  assert.equal(campaign.active,true)
  launchedAt=campaign.starts_at
  await asUser(admin,()=>scalar('select start_mount_preorder_campaign()'))
  assert.equal((await scalar('select get_mount_preorder_campaign()')).starts_at,launchedAt)
  await db.query('update donations set payment_verified_at=now() where id=$1',[prelaunchOrder.id])
  assert.equal((await progress('prelaunch')).total_paid_usd,0)
  const recovered=await purchase('old-paypal',1000,{verified:false,capture:'PRE-LAUNCH'})
  await db.query("update donations set payment_verified_at=$1::timestamptz-interval '1 day' where id=$2",[launchedAt,recovered.id])
  assert.equal((await progress('old-paypal')).total_paid_usd,0)
})
test('verified purchases add up by normalized Login ID and unlock all three in order',async()=>{
  const first=await purchase(' StepPlayer ',500,{verified:false})
  assert.equal((await progress('stepplayer')).total_paid_usd,0)
  await db.query("update donations set status='approved' where id=$1",[first.id])
  assert.equal((await progress('stepplayer')).total_paid_usd,0)
  await db.query('update donations set payment_verified_at=now() where id=$1',[first.id])
  let p=await progress('STEPPLAYER')
  assert.equal(p.total_paid_usd,500)
  assert.deepEqual(p.steps.map(s=>s.unlocked),[true,false,false])
  assert.equal(p.remaining_usd,1000)
  await purchase('stepplayer',1000)
  p=await progress('stepplayer')
  assert.equal(p.total_paid_usd,1500)
  assert.deepEqual(p.steps.map(s=>s.unlocked),[true,true,false])
  await purchase('stepplayer',1000,{quantity:2})
  p=await progress('stepplayer')
  assert.equal(p.total_paid_usd,3500)
  assert.deepEqual(p.steps.map(s=>s.delivery_status),['reserved','reserved','reserved'])
  assert.equal(p.next_step,null)
  assert.equal(p.remaining_usd,0)
})
test('a large purchase includes earlier steps without allowing a standalone mount purchase',async()=>{
  await purchase('all-at-once',500,{quantity:7})
  assert.deepEqual((await progress('all-at-once')).steps.map(s=>s.unlocked),[true,true,true])
  await purchase('mount-product',500,{packageId:'rodrigos-flame-horse'})
  assert.equal((await progress('mount-product')).total_paid_usd,0)
})
test('counts actual discounted USD package value and excludes V2, unpaid and rejected orders',async()=>{
  await purchase('discounted',500,{discount:10,currency:'PHP',amount:27000})
  assert.equal((await progress('discounted')).total_paid_usd,450)
  assert.equal((await progress('discounted')).steps[0].unlocked,false)
  await purchase('discounted',50)
  assert.equal((await progress('discounted')).steps[0].unlocked,true)
  await purchase('ineligible',1000,{server:'v2'})
  await purchase('ineligible',1000,{verified:false})
  await purchase('ineligible',1000,{status:'rejected'})
  assert.equal((await progress('ineligible')).total_paid_usd,0)
  for(const options of [{face:1},{quantity:0},{quantity:1000},{discount:100},{discount:-5}]) {
    await assert.rejects(purchase('invalid',500,options),/Invalid verified gift-package details/)
  }
})
test('re-verification, account/value edits and duplicate provider receipts cannot multiply credit',async()=>{
  const paid=await purchase('idempotent',500,{capture:'CAPTURE-UNIQUE'})
  for(let i=0;i<3;i++)await db.query("update donations set payment_verified_at=now(),status='approved' where id=$1",[paid.id])
  await db.query("update donations set player_id='redirect',selected_package_amount=1000,package_quantity=99,status='approved' where id=$1",[paid.id])
  assert.equal((await progress('idempotent')).total_paid_usd,500)
  assert.equal((await progress('redirect')).total_paid_usd,0)
  await purchase('duplicate',500,{capture:'CAPTURE-UNIQUE'})
  assert.equal((await progress('duplicate')).total_paid_usd,0)
  await db.query('delete from donations where id=$1',[paid.id])
  await purchase('duplicate',500,{capture:'CAPTURE-UNIQUE'})
  assert.equal((await progress('duplicate')).total_paid_usd,0)
  await purchase('paddle',500,{paddle:'PADDLE-UNIQUE'})
  await purchase('duplicate',500,{paddle:'PADDLE-UNIQUE'})
  assert.equal((await progress('duplicate')).total_paid_usd,0)
})
test('normal package fulfillment leaves mounts reserved; separate delivery is ordered and idempotent',async()=>{
  await db.query("update donations set fulfillment_status='delivered',items_delivered='Gift contents' where lower(trim(player_id))='stepplayer'")
  assert.deepEqual((await progress('stepplayer')).steps.map(s=>s.delivery_status),['reserved','reserved','reserved'])
  await asUser(admin,async()=>{
    await assert.rejects(db.query('select mark_mount_preorder_delivered($1,3)',['stepplayer']),/earlier mount steps first/)
    await assert.rejects(db.query('select mark_mount_preorder_delivered($1,1)',['not-earned']),/not been reserved/)
    for(const step of [1,2,3])await scalar('select mark_mount_preorder_delivered($1,$2)',['stepplayer',step])
  })
  const delivered=await progress('stepplayer')
  assert.deepEqual(delivered.steps.map(s=>s.delivery_status),['delivered','delivered','delivered'])
  await asUser(admin,()=>scalar('select mark_mount_preorder_delivered($1,3)',['stepplayer']))
  assert.deepEqual(await progress('stepplayer'),delivered)
})

test('price reduction grants newly eligible reservations without altering launch, spending or deliveries',async()=>{
  await purchase('price-below',500,{quantity:5})
  await purchase('price-below',5,{packageId:'currency-5',quantity:99})
  const exact = await purchase('price-exact',500,{quantity:6})
  const over = await purchase('price-over',500,{quantity:6})
  await purchase('price-over',5,{packageId:'currency-5',quantity:99})
  assert.equal((await progress('price-exact')).steps[2].unlocked,false)
  const campaignBefore = await scalar('select get_mount_preorder_campaign()')
  const donationsBefore = (await db.query('select * from donations order by id')).rows
  const creditsBefore = (await db.query('select * from mount_preorder_private.purchase_credits order by source_donation_id')).rows
  const reservationsBefore = (await db.query('select * from mount_preorder_private.reservations order by player_id_normalized,step')).rows
  await db.exec(`begin; ${priceMigration} commit;`)
  assert.deepEqual(await scalar('select get_mount_preorder_campaign()'),campaignBefore)
  assert.deepEqual((await db.query('select * from donations order by id')).rows,donationsBefore)
  assert.deepEqual((await db.query('select * from mount_preorder_private.purchase_credits order by source_donation_id')).rows,creditsBefore)
  const reservationsAfter = (await db.query('select * from mount_preorder_private.reservations order by player_id_normalized,step')).rows
  for(const row of reservationsBefore) assert.deepEqual(reservationsAfter.find(r=>r.player_id_normalized===row.player_id_normalized && r.step===row.step),row)
  assert.equal(reservationsAfter.length,reservationsBefore.length+2)
  for(const [player,source] of [['price-exact',exact.id],['price-over',over.id]]) {
    const p=await progress(player)
    assert.equal(p.steps[2].delivery_status,'reserved')
    assert.equal(p.steps[2].source_donation_id,source)
    assert.equal(p.steps[2].step_usd,1500)
    assert.equal(p.steps[2].total_required_usd,3000)
  }
  const below=await progress('price-below')
  assert.equal(below.steps[2].unlocked,false)
  assert.equal(below.remaining_usd,5)
  assert.equal((await progress('prelaunch')).total_paid_usd,0)
})

test('after reduction, the final $1,500 completes Step 3 at exactly $3,000 total',async()=>{
  await purchase('reduced-steps',500)
  await purchase('reduced-steps',1000)
  assert.equal((await progress('reduced-steps')).remaining_usd,1500)
  await purchase('reduced-steps',500,{quantity:3})
  const p=await progress('reduced-steps')
  assert.equal(p.total_paid_usd,3000)
  assert.deepEqual(p.steps.map(s=>s.unlocked),[true,true,true])
  assert.deepEqual(p.steps.map(s=>s.total_required_usd),[500,1500,3000])
  await purchase('price-below',5,{packageId:'currency-5'})
  assert.equal((await progress('price-below')).steps[2].unlocked,true)
})

test('reapplying the price update neither duplicates reservations nor changes their timestamps',async()=>{
  const before=(await db.query('select * from mount_preorder_private.reservations order by player_id_normalized,step')).rows
  await db.exec(`begin; ${priceMigration} commit;`)
  assert.deepEqual((await db.query('select * from mount_preorder_private.reservations order by player_id_normalized,step')).rows,before)
})
