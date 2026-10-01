// Execute the full SQL upgrade in an isolated PostgreSQL engine; no live database.
const assert=require('node:assert/strict')
const {readFileSync}=require('node:fs')
const path=require('node:path')
const {before,after,test}=require('node:test')
const {PGlite}=require('@electric-sql/pglite')
const db=new PGlite()
const sql=name=>readFileSync(path.join(__dirname,'../supabase/migrations',name),'utf8')
const removal=sql('20261004_remove_october_mount_bonuses.sql')
const prior={}
const stale="Package + The White Tiger of Manouille I (One-Time Event Bonus) + Balian's Battle Griffin (One-Time Event Bonus) + Nureddin's Red Death (One-Time October $2,000 Bonus)"
const bonusFields=['event_bonus_key','event_bonus_name','event_bonus_eligible','event_bonus_reserved_at',
  'october_bonus_name','october_bonus_eligible','october_bonus_reserved_at','october_verified_total_usd']
async function purchase(player,amount,{server='v1',quantity=1,verified=true,status='approved',delivered=false,packageId='october-supply-'+amount}={}){
  return(await db.query(`insert into donations(player_id,server,selected_package_id,package_quantity,
    payment_verified_at,status,fulfillment_status,items_delivered,fulfillment_notes,event_bonus_selections)
    values($1,$2,$3,$4,$5,$6,$7,'Package','Notes','[{"event_number":"001","quantity":1}]') returning *`,
    [player,server,packageId,quantity,verified?'2026-10-02T00:00:00Z':null,status,delivered?'delivered':'not_delivered'])).rows[0]
}
async function current(id){return(await db.query('select * from donations where id=$1',[id])).rows[0]}
async function ledgerSnapshot(){
  const result={}
  for(const table of ['october_event_bonus_claims','october_verified_purchase_credits','october_verified_purchase_totals'])
    result[table]=(await db.query('select * from '+table+' order by 1')).rows
  return result
}
function noBonus(order){for(const field of bonusFields)assert.equal(order[field],null,field)}
before(async()=>{
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
    create table admin_users(user_id uuid);
    create table donations(id uuid primary key default gen_random_uuid(),player_id text,reference_code text,
      selected_package_id text,package_quantity integer,payment_verified_at timestamptz,created_at timestamptz default now(),
      status text not null default 'pending' check(status in('pending','approved','rejected')),
      fulfillment_status text not null default 'not_delivered',items_delivered text,fulfillment_notes text,
      event_bonus_selections jsonb);`)
  for(const file of ['20260901_september_event_bonus_claim_guard.sql','20260901_dual_server_donation_center.sql',
    '20261001_october_mount_bonuses.sql','20261002_october_single_mount_rules.sql','20261003_correct_october_mount_tiers.sql'])
    await db.exec(sql(file))
  prior.outstanding=await purchase('outstanding',500)
  prior.completed=await purchase('completed',1000,{delivered:true})
  prior.unpaid=await purchase('unpaid',1000,{verified:false,status:'pending'})
  await db.query(`update donations set items_delivered=$1,fulfillment_notes=$1,
    october_bonus_name='Nureddin''s Red Death',october_bonus_eligible=true,
    october_bonus_reserved_at=now(),october_verified_total_usd=2000 where id in($2,$3)`,[stale,prior.outstanding.id,prior.completed.id])
  prior.completed=await current(prior.completed.id)
  prior.ledgers=await ledgerSnapshot()
  await db.exec(removal)
})
after(async()=>db.close())
test('outstanding mount entitlements and generated draft suffixes are removed',async()=>{
  const order=await current(prior.outstanding.id)
  noBonus(order)
  assert.equal(order.items_delivered,'Package')
  assert.equal(order.fulfillment_notes,'Package')
  assert.deepEqual(order.event_bonus_selections,[{event_number:'001',quantity:1}])
})
test('completed records and historical claim ledgers remain untouched',async()=>{
  assert.deepEqual(await current(prior.completed.id),prior.completed)
  assert.deepEqual(await ledgerSnapshot(),prior.ledgers)
})
test('all October tiers and quantities on both servers reserve no mounts or credits',async()=>{
  for(const server of ['v1','v2'])for(const amount of [50,100,500,1000])for(const quantity of [1,20]){
    const order=await purchase('new-'+server+'-'+amount+'-'+quantity,amount,{server,quantity})
    noBonus(order)
    assert.equal(order.package_quantity,quantity)
    assert.deepEqual(order.event_bonus_selections,[{event_number:'001',quantity:1}])
  }
  assert.deepEqual(await ledgerSnapshot(),prior.ledgers)
})
test('late verification of an old unpaid order creates no mount entitlement',async()=>{
  await db.query("update donations set payment_verified_at=now(),status='approved' where id=$1",[prior.unpaid.id])
  noBonus(await current(prior.unpaid.id))
  assert.deepEqual(await ledgerSnapshot(),prior.ledgers)
})
test('stale mount metadata is cleared even on fulfillment-only writes',async()=>{
  const order=await purchase('stale-draft',1000)
  await db.query(`update donations set event_bonus_name='The White Tiger of Manouille I',
    event_bonus_eligible=true,items_delivered=$1,fulfillment_notes=$1 where id=$2`,[stale,order.id])
  noBonus(await current(order.id))
  assert.equal((await current(order.id)).items_delivered,'Package')
  await db.query(`update donations set fulfillment_status='delivered',event_bonus_eligible=true,
    event_bonus_name='The White Tiger of Manouille I',items_delivered=$1 where id=$2`,[stale,order.id])
  noBonus(await current(order.id))
  assert.equal((await current(order.id)).items_delivered,'Package')
})
test('new already-delivered inserts cannot carry a retired grant',async()=>{
  const order=(await db.query(`insert into donations(player_id,server,selected_package_id,package_quantity,
    fulfillment_status,event_bonus_eligible,event_bonus_name,items_delivered)
    values('new-completed','v1','october-supply-500',1,'delivered',true,'The White Tiger of Manouille I',$1) returning *`,[stale])).rows[0]
  noBonus(order)
  assert.equal(order.items_delivered,'Package')
})
test('September weapon bonuses and other package delivery text remain unchanged',async()=>{
  for(const [amount,name]of[[500,'Rare Monster Weapon Style SET'],[1000,'Epic Monster Weapon Style']]){
    const order=await purchase('september-'+amount,amount,{packageId:'september-supply-'+amount})
    assert.equal(order.event_bonus_eligible,true)
    assert.equal(order.event_bonus_name,name)
  }
  const currency=await purchase('currency',500,{packageId:'currency-500'})
  await db.query("update donations set items_delivered='Sunset Splendid Mount Summon x11 (Bound) ×500' where id=$1",[currency.id])
  assert.equal((await current(currency.id)).items_delivered,'Sunset Splendid Mount Summon x11 (Bound) ×500')
})
test('repeated verification and rerunning retirement are idempotent',async()=>{
  await db.query('update donations set payment_verified_at=now() where id=$1',[prior.outstanding.id])
  noBonus(await current(prior.outstanding.id))
  const records=(await db.query('select * from donations order by id')).rows
  await db.exec(removal)
  assert.deepEqual((await db.query('select * from donations order by id')).rows,records)
  assert.deepEqual(await ledgerSnapshot(),prior.ledgers)
})
