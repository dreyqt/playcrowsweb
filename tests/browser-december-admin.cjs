// Local-only admin UI checks. Every external request is mocked or blocked.
const { chromium, expect } = require('@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { spawn } = require('node:child_process')
const base = 'http://127.0.0.1:4189'
const artifacts = path.resolve('../garuda-1500-qa')
const adminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const at = '2026-12-01T01:00:00Z'
function donation(id, eligible, deliveredAt = null) {
  return { id, reference_code: id, server: 'v1', player_id: 'QA-PLAYER', username: 'QA Character', created_at: at,
    currency: 'USD', amount: 1350, selected_package_id: 'december-supply-500', selected_package_title: 'DECEMBER PACKAGE',
    selected_package_amount: 500, package_quantity: 3, discount_percent: 10, cumulative_credit_usd: 1500,
    payment_method: 'gcash', status: 'approved', payment_verified_at: at, fulfillment_status: 'delivered', fulfilled_at: at,
    fulfilled_by: 'qa-admin', delivered_to: 'QA-PLAYER', items_delivered: 'Original package evidence', fulfillment_notes: 'Original evidence note',
    fulfillment_evidence_path: 'fulfillment/original.png', fulfillment_evidence_name: 'original.png',
    december_bonus_eligible: eligible, december_bonus_name: 'Garuda of Eternity Wings', december_verified_total_usd: eligible ? 1500 : 1000,
    december_bonus_reserved_at: eligible ? at : null, december_bonus_delivered_at: deliveredAt,
    event_bonus_selections: [], boosting_bonus_rewards: [] }
}
async function main() {
  await fs.mkdir(artifacts, { recursive: true })
  const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host','127.0.0.1','--port','4189'], {
    windowsHide: true, stdio: 'ignore', env: { ...process.env, VITE_SUPABASE_URL:'https://december-admin.invalid', VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock_only' },
  })
  let browser
  try {
    const deadline = Date.now()+30000
    while(true) {
      try { if((await fetch(base)).ok) break } catch {}
      assert.ok(Date.now()<deadline,'preview starts')
      await new Promise(resolve=>setTimeout(resolve,200))
    }
    browser=await chromium.launch({headless:true,channel:'msedge'})
    const page=await browser.newPage({viewport:{width:1440,height:1100}})
    const errors=[], rpcCalls=[], blocked=[]
    page.on('pageerror',error=>errors.push(error.message))
    page.on('dialog',dialog=>dialog.accept())
    const expires=Math.floor(Date.now()/1000)+3600
    const user={id:adminId,email:'qa@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}
    const token=`${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:adminId,exp:expires,role:'authenticated'})).toString('base64url')}.mock`
    const session={access_token:token,refresh_token:'mock-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user}
    await page.addInitScript(value=>localStorage.setItem('sb-december-admin-auth-token',JSON.stringify(value)),session)
    const rows=[donation('QA-PENDING',true),donation('QA-INELIGIBLE',false),donation('QA-ALREADY',true,at)]
    await page.route('**/*',async route=>{
      const request=route.request(),url=new URL(request.url())
      const json=value=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)})
      if(url.origin===base)return route.continue()
      if(url.pathname.endsWith('/auth/v1/user'))return json(user)
      if(url.pathname.endsWith('/rest/v1/admin_users'))return json([{user_id:adminId}])
      if(url.pathname.endsWith('/rest/v1/donations')) { assert.equal(request.method(),'GET'); return json(rows) }
      if(url.pathname.endsWith('/rpc/get_mount_preorder_campaign'))return json({active:false,starts_at:null})
      if(url.pathname.endsWith('/rpc/get_mount_preorder_progress'))return json({active:false,starts_at:null,total_paid_usd:0,steps:[],next_step:1,remaining_usd:500})
      if(url.pathname.endsWith('/rpc/mark_december_bonus_delivered')) {
        const body=request.postDataJSON();rpcCalls.push(body)
        assert.equal(body.p_donation_id,'QA-PENDING')
        rows[0].december_bonus_delivered_at='2026-12-02T01:00:00Z'
        return json(rows[0])
      }
      blocked.push(request.url());return route.abort('blockedbyclient')
    })
    await page.goto(base+'/admin')
    const open = reference=>page.getByRole('row').filter({hasText:reference}).getByRole('button',{name:'Review',exact:true}).click()
    await open('QA-PENDING')
    await expect(page.getByText('December · One-Time $1,500 Reward')).toBeVisible()
    await expect(page.getByText('Garuda is still pending',{exact:false})).toBeVisible()
    const original=page.getByPlaceholder('Auto-filled from the selected package and quantity')
    await expect(original).toHaveValue('Original package evidence')
    await expect(original).toBeDisabled()
    await page.getByRole('button',{name:'Mark Garuda as Delivered',exact:true}).scrollIntoViewIfNeeded()
    await page.screenshot({path:path.join(artifacts,'december-admin-pending.png')})
    await page.getByRole('button',{name:'Mark Garuda as Delivered',exact:true}).click()
    await expect(page.getByText('Garuda delivery recorded. This player cannot receive another Garuda reward.')).toBeVisible()
    await expect(page.getByRole('button',{name:'Mark Garuda as Delivered',exact:true})).toHaveCount(0)
    await expect(page.getByText('DELIVERED — the one-time Garuda',{exact:false})).toBeVisible()
    await expect(original).toHaveValue('Original package evidence')
    await page.screenshot({path:path.join(artifacts,'december-admin-delivered.png')})
    assert.equal(rpcCalls.length,1)
    assert.equal(rows[0].fulfillment_evidence_path,'fulfillment/original.png')
    // A fresh page opens each of the remaining rows without changing their state.
    for(const id of ['QA-INELIGIBLE','QA-ALREADY']) {
      await page.goto(base+'/admin');await open(id)
      await expect(page.getByRole('button',{name:'Mark Garuda as Delivered',exact:true})).toHaveCount(0)
      await expect(page.getByPlaceholder('Auto-filled from the selected package and quantity')).toHaveValue('Original package evidence')
    }
    assert.deepEqual(errors,[]);assert.deepEqual(blocked,[])
    await fs.writeFile(path.join(artifacts,'admin-results.json'),JSON.stringify({passed:true,rpcCalls:rpcCalls.length,checks:['pending supplemental reward','actual delivery timestamp','idempotent button removal','unchanged package evidence','ineligible and already delivered excluded']},null,2))
    console.log('PASS December admin: supplemental delivery, original evidence, ineligible and already delivered states')
  } finally { await browser?.close();preview.kill() }
}
main().catch(error=>{console.error(error);process.exitCode=1})
