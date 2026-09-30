// Tests the deployed correction from $100/$500 to $500/$1,000 using real SQL.
const assert=require('node:assert/strict')
const {readFileSync}=require('node:fs')
const path=require('node:path')
const {before,after,test}=require('node:test')
const {PGlite}=require('@electric-sql/pglite')
const db=new PGlite()
const sql=name=>readFileSync(path.join(__dirname,'../supabase/migrations',name),'utf8')
const correction=sql('20261003_correct_october_mount_tiers.sql')
const prior={}
async function purchase(player,amount,{server='v1',quantity=1,verified=true,status='approved',delivered=false}={}) {
  return (await db.query(`insert into donations(player_id,server,selected_package_id,package_quantity,
    payment_verified_at,status,fulfillment_status,items_delivered,fulfillment_notes)
    values($1,$2,$3,$4,$5,$6,$7,'Package delivered','Original evidence') returning *`,
    [player,server,'october-supply-'+amount,quantity,verified?'2026-10-01T12:00:00Z':null,status,delivered?'delivered':'not_delivered'])).rows[0]
}
async function current(id){return(await db.query('select * from donations where id=$1',[id])).rows[0]}
async function claims(player,server='v1'){return(await db.query("select * from october_event_bonus_claims where player_id_normalized=normalize_playcrows_player_id($1) and server=$2 and bonus_key='white-tiger-of-manouille-i'",[player,server])).rows}
before(async()=>{
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
    create table admin_users(user_id uuid);
    create table donations(id uuid primary key default gen_random_uuid(),player_id text,
      reference_code text, selected_package_id text, package_quantity integer,
      payment_verified_at timestamptz, created_at timestamptz default now(),
      status text not null default 'pending' check(status in('pending','approved','rejected')),
      fulfillment_status text not null default 'not_delivered',items_delivered text,fulfillment_notes text);`)
  for(const name of ['20260901_september_event_bonus_claim_guard.sql','20260901_dual_server_donation_center.sql',
    '20261001_october_mount_bonuses.sql','20261002_october_single_mount_rules.sql']) await db.exec(sql(name))
  prior.wrong=await purchase('corrected',100)
  prior.qualifying=await purchase('corrected',1000)
  prior.tiger=await purchase('kept-tiger',500)
  prior.completed=await purchase('completed',100,{delivered:true})
  prior.thousand=await purchase('old-thousand',1000,{delivered:true})
  await db.query("update donations set items_delivered='Custom package + The White Tiger of Manouille I (One-Time Event Bonus)' where id=$1",[prior.wrong.id])
  await db.exec(correction)
})
after(async()=>db.close())
test('mistaken undelivered $100 claims are archived and reassigned to a qualifying $1,000 order',async()=>{
  const wrong=await current(prior.wrong.id), right=await current(prior.qualifying.id)
  assert.equal(wrong.event_bonus_eligible,null)
  assert.equal(wrong.event_bonus_name,null)
  assert.equal(wrong.items_delivered,'Custom package')
  assert.equal(right.event_bonus_eligible,true)
  assert.equal(right.event_bonus_name,'The White Tiger of Manouille I')
  assert.equal((await claims('corrected')).length,1)
  assert.equal((await claims('corrected'))[0].source_donation_id,prior.qualifying.id)
  assert.equal((await db.query('select * from october_mount_rule_corrections where source_donation_id=$1',[prior.wrong.id])).rows.length,1)
})
test('existing $500 Tiger reservations and completed historical evidence are preserved',async()=>{
  assert.equal((await current(prior.tiger.id)).event_bonus_eligible,true)
  assert.equal((await purchase('kept-tiger',1000)).event_bonus_eligible,false)
  const completed=await current(prior.completed.id)
  assert.equal(completed.items_delivered,prior.completed.items_delivered)
  assert.equal(completed.fulfillment_notes,prior.completed.fulfillment_notes)
  assert.equal((await claims('completed')).length,1,'Completed prior claim prevents duplicate fulfillment')
})
test('past verified $1,000 purchases receive a supplemental Tiger entitlement',async()=>{
  const order=await current(prior.thousand.id)
  assert.equal(order.event_bonus_eligible,true)
  assert.equal(order.items_delivered,prior.thousand.items_delivered)
  assert.equal(order.fulfillment_notes,prior.thousand.fulfillment_notes)
})
test('both eligible tiers share exactly one Tiger per player on each server',async()=>{
  for(const server of ['v1','v2']) for(const amount of [500,1000]){
    const player='new-'+amount
    const first=await purchase(player,amount,{server,quantity:5})
    const second=await purchase(player,amount===500?1000:500,{server})
    assert.equal(first.event_bonus_eligible,true)
    assert.equal(second.event_bonus_eligible,false)
    assert.equal(first.october_bonus_eligible,null)
    assert.equal((await claims(player,server)).length,1)
  }
})
test('$50 and $100 remain ineligible even when multiplied to qualifying amounts',async()=>{
  for(const amount of [50,100]){
    const order=await purchase('excluded-'+amount,amount,{quantity:40})
    assert.equal(order.event_bonus_eligible,null)
    assert.equal(order.october_bonus_eligible,null)
    assert.equal((await claims('excluded-'+amount)).length,0)
  }
})
test('pending and rejected eligible purchases wait for verification and acceptance',async()=>{
  const pending=await purchase('waiting',1000,{verified:false,status:'pending'})
  const rejected=await purchase('rejected',500,{status:'rejected'})
  assert.equal((await claims('waiting')).length,0)
  assert.equal((await claims('rejected')).length,0)
  await db.query('update donations set payment_verified_at=now() where id=$1',[pending.id])
  await db.query("update donations set status='approved' where id=$1",[rejected.id])
  assert.equal((await current(pending.id)).event_bonus_eligible,true)
  assert.equal((await current(rejected.id)).event_bonus_eligible,true)
})
test('normalized player IDs and repeat verification cannot create duplicate rewards',async()=>{
  const first=await purchase(' Same Player ',500)
  assert.equal((await purchase('sameplayer',1000)).event_bonus_eligible,false)
  for(let i=0;i<3;i++) await db.query('update donations set payment_verified_at=now() where id=$1',[first.id])
  assert.equal((await claims('sameplayer')).length,1)
})
test('the correction is safe to rerun and clients cannot read or delete the correction audit',async()=>{
  const snapshot=async()=>({orders:(await db.query('select * from donations order by id')).rows,
    claims:(await db.query('select * from october_event_bonus_claims order by id')).rows,
    corrections:(await db.query('select * from october_mount_rule_corrections order by claim_id')).rows})
  const prior=await snapshot();await db.exec(correction);assert.deepEqual(await snapshot(),prior)
  await db.exec('set role anon')
  try{await assert.rejects(db.query('select * from october_mount_rule_corrections'),/permission denied/)}finally{await db.exec('reset role')}
  await db.exec('set role authenticated')
  try{
    await assert.rejects(db.query('delete from october_mount_rule_corrections'),/permission denied/)
  }finally{await db.exec('reset role')}
})
