// Execute the real merge migration in isolated PostgreSQL, never a live project.
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { before, after, test } = require('node:test')
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
const migration = readFileSync(require('node:path').join(__dirname, '../supabase/migrations/20261106_merged_server_events.sql'), 'utf8')
const v1 = '00000000-0000-0000-0000-000000000001'
const v2 = '00000000-0000-0000-0000-000000000002'
let historicalDonations, historicalClaims
before(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;
    create table admin_users(user_id uuid primary key);
    insert into admin_users values ('00000000-0000-0000-0000-000000000099');
    grant select on admin_users to authenticated;
    create table events(id uuid primary key, server text not null, title text, status text, published_at timestamptz,
      event_number text default '001',rewards jsonb default '["Reward"]',created_at timestamptz default now(),updated_at timestamptz default now());
    alter table events enable row level security;
    create policy "Public read published events" on events for select to anon,authenticated
      using(published_at is not null and status in ('active','ended'));
    create policy "Admins manage events" on events for all to authenticated
      using(exists(select 1 from admin_users where user_id=auth.uid()))
      with check(exists(select 1 from admin_users where user_id=auth.uid()));
    grant select,insert,update,delete on events to authenticated;
    grant select on events to anon;
    create table event_submissions(id uuid primary key default gen_random_uuid(), event_id uuid references events(id),
      discord_username text, status text, rejection_reason text, reward_sent_at timestamptz, updated_at timestamptz default now());
    create view event_public_results as select s.id,s.event_id,s.discord_username,s.status,
      case when s.status='rejected' then s.rejection_reason else null end as rejection_reason,s.reward_sent_at,s.updated_at
      from event_submissions s join events e on e.id=s.event_id where e.published_at is not null and s.status in ('approved','rejected');
    grant select on event_public_results to anon,authenticated;
    create table donations(id uuid primary key default gen_random_uuid(), server text not null, payment_method text,
      payment_verified_at timestamptz,paypal_order_id text,paypal_capture_id text,paypal_payment_status text,
      paddle_transaction_id text,paddle_payment_status text,status text default 'pending', amount numeric);
    create table v2_beta_claim_settings(id boolean primary key,enabled boolean,updated_at timestamptz default now());
    insert into v2_beta_claim_settings values(true,true,now());
    create table v2_beta_claims(id uuid primary key default gen_random_uuid(),status text);
    insert into v2_beta_claims(status) values('for_review');
    grant select,update on v2_beta_claims to authenticated;
    create function submit_v2_beta_claim(text,text,text,text,text,jsonb,text) returns text language sql as $$select 'old'::text$$;
    create function get_v2_beta_public_results() returns text language sql as $$select 'old'::text$$;
    grant execute on function submit_v2_beta_claim(text,text,text,text,text,jsonb,text),get_v2_beta_public_results() to anon,authenticated;
    create table storage.objects(id uuid);
    alter table storage.objects enable row level security;
    create policy "Upload V2 beta proof" on storage.objects for insert to anon,authenticated with check(true);
    insert into events(id,server,title,status,published_at) values('${v1}','v1','V1 event','active',now()),('${v2}','v2','V2 event','active',now());
    insert into event_submissions(event_id,discord_username,status) values('${v1}','V1 player','approved'),('${v2}','V2 player','approved');
    insert into donations(server,payment_method,amount) values('v2','gcash',200),('v1','gcash',50);
  `)
  historicalDonations = (await db.query('select * from donations order by id')).rows
  historicalClaims = (await db.query('select * from event_submissions order by id')).rows
  await db.exec(migration)
})
after(async () => db.close())

test('merge ends/unpublishes only V2 events and preserves all payment and claim history', async () => {
  const events = (await db.query('select * from events order by server')).rows
  assert.equal(events[0].status, 'active')
  assert.ok(events[0].published_at)
  assert.equal(events[1].status, 'ended')
  assert.equal(events[1].published_at, null)
  assert.deepEqual((await db.query('select * from donations order by id')).rows, historicalDonations)
  assert.deepEqual((await db.query('select * from event_submissions order by id')).rows, historicalClaims)
})

test('public reads/results stay V1-only even if a V2 event is accidentally republished', async () => {
  await db.query("update events set published_at=now(),status='active' where id=$1", [v2])
  await db.exec('set role anon')
  try {
    assert.deepEqual((await db.query('select server from events')).rows, [{ server: 'v1' }])
    assert.deepEqual((await db.query('select discord_username from event_public_results')).rows, [{ discord_username: 'V1 player' }])
    assert.deepEqual((await db.query("select * from get_donation_event_bonus_catalog('v2')")).rows, [])
    assert.deepEqual((await db.query("select * from get_donation_event_bonus_catalog('v1')")).rows,
      [{ event_number: '001', title: 'V1 event', rewards: ['Reward'] }])
  } finally { await db.exec('reset role') }
  await db.exec("set role authenticated; set app.user_id='00000000-0000-0000-0000-000000000099'")
  try { assert.equal((await db.query('select * from events')).rows.length, 2) }
  finally { await db.exec("reset role; set app.user_id=''") }
})

test('new V2 event claims are blocked at insertion; V1 claims and historical V2 review still work', async () => {
  await assert.rejects(db.query("insert into event_submissions(event_id,discord_username,status) values($1,'new','pending')", [v2]), /V2 events no longer accept claims/)
  await db.query("insert into event_submissions(event_id,discord_username,status) values($1,'new','pending')", [v1])
  await db.query("update event_submissions set status='rejected',rejection_reason='Reviewed' where event_id=$1", [v2])
  assert.equal((await db.query('select status from event_submissions where event_id=$1', [v2])).rows[0].status, 'rejected')
})

test('new unpaid V2 donations fail closed, including incomplete or null provider flags', async () => {
  for (const method of ['gcash','wise','bybit','paypal','paddle',null]) {
    await assert.rejects(db.query('insert into donations(server,payment_method,amount) values($1,$2,50)', ['v2',method]), /New purchases must use V1/)
  }
  await assert.rejects(db.query("insert into donations(server,payment_method,payment_verified_at,paypal_order_id,paypal_capture_id) values('v2','paypal',now(),'ORDER','CAPTURE')"), /New purchases must use V1/)
  await assert.rejects(db.query("insert into donations(server,payment_method,paypal_order_id,paypal_capture_id,paypal_payment_status) values('v2','paypal','ORDER','CAPTURE','COMPLETED')"), /New purchases must use V1/)
  await db.query("insert into donations(server,payment_method,amount) values('v1','gcash',1000)")
})

test('completed V2 provider payments remain recoverable and old unpaid records remain reviewable', async () => {
  await db.query("insert into donations(server,payment_method,payment_verified_at,paypal_order_id,paypal_capture_id,paypal_payment_status) values('v2','paypal',now(),'ORDER','CAPTURE','COMPLETED')")
  await db.query("insert into donations(server,payment_method,payment_verified_at,paddle_transaction_id,paddle_payment_status) values('v2','paddle',now(),'TRANSACTION','COMPLETED')")
  await db.query("update donations set status='approved' where server='v2' and payment_method='gcash'")
  assert.equal((await db.query("select status from donations where server='v2' and payment_method='gcash'")).rows[0].status, 'approved')
})

test('legacy beta claims are closed, public RPCs/uploads are retired, and claim records remain reviewable', async () => {
  assert.equal((await db.query('select enabled from v2_beta_claim_settings')).rows[0].enabled, false)
  for (const role of ['anon','authenticated']) {
    const privileges = (await db.query(`select has_function_privilege($1,'public.submit_v2_beta_claim(text,text,text,text,text,jsonb,text)','execute') as claim,
      has_function_privilege($1,'public.get_v2_beta_public_results()','execute') as results`, [role])).rows[0]
    assert.deepEqual(privileges, { claim: false, results: false })
  }
  assert.equal((await db.query("select * from pg_policies where schemaname='storage' and policyname='Upload V2 beta proof'")).rows.length, 0)
  await db.query("update v2_beta_claims set status='approved'")
  assert.deepEqual((await db.query('select status from v2_beta_claims')).rows, [{ status: 'approved' }])
})

test('merge migration reruns safely without deleting or rewriting reviewed purchase/claim records', async () => {
  const donations = (await db.query('select * from donations order by id')).rows
  const claims = (await db.query('select * from event_submissions order by id')).rows
  await db.exec(migration)
  assert.deepEqual((await db.query('select * from donations order by id')).rows, donations)
  assert.deepEqual((await db.query('select * from event_submissions order by id')).rows, claims)
  assert.equal((await db.query("select published_at from events where server='v2'")).rows[0].published_at, null)
})
