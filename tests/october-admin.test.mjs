import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

// Execute the actual admin fulfillment helpers without React, a browser or services.
const source = readFileSync(new URL('../src/admin/AdminApp.tsx', import.meta.url), 'utf8')
const helperSource = source.slice(source.indexOf('function getPackageCategory('), source.indexOf('function PackageCategoryBadge('))
assert.ok(helperSource.length > 0, 'Admin fulfillment helpers must remain available to exercise')
const helpers = vm.runInNewContext(stripTypeScriptTypes(helperSource) + `
  ({ getPackageCategory, getPackageEventBonusName, getItemsWithReservedBonuses,
     getEventBonusDeliveryText, buildFulfillmentNotes })
`)


const tiger='The White Tiger of Manouille I'
function donation(overrides={}) { return {
  selected_package_id:'october-supply-500',selected_package_title:'OCTOBER PACKAGE',
  selected_package_amount:500,package_quantity:1,username:'Player',fulfillment_status:'not_delivered',
  payment_verified_at:'2026-10-01T00:00:00Z',event_bonus_eligible:true,event_bonus_name:tiger,
  event_bonus_selections:[],...overrides,
} }
test('only $500 and $1,000 map to the same Tiger',()=>{
  for(const amount of [500,1000]) assert.equal(helpers.getPackageEventBonusName('october-supply-'+amount),tiger)
  for(const amount of [50,100]) assert.equal(helpers.getPackageEventBonusName('october-supply-'+amount),null)
})
test('eligible tiers include exactly one Tiger independent of quantity and retired fields',()=>{
  for(const amount of [500,1000]) {
    const record=donation({selected_package_id:'october-supply-'+amount,package_quantity:20,
      october_bonus_eligible:true,october_bonus_name:"Nureddin's Red Death"})
    const items=helpers.getItemsWithReservedBonuses(record)
    assert.equal(items.split(tiger).length-1,1)
    assert.doesNotMatch(items,/Battle Griffin|Red Death/)
    assert.equal(helpers.getItemsWithReservedBonuses(record,items),items)
  }
})
test('pending and previously claimed Tiger grants are excluded',()=>{
  for(const eligible of [null,false]) {
    const record=donation({event_bonus_eligible:eligible})
    assert.ok(!helpers.getItemsWithReservedBonuses(record).includes(tiger))
    assert.doesNotMatch(helpers.getEventBonusDeliveryText(record),/^ELIGIBLE/)
  }
})
test('retired mounts are stripped from outstanding drafts but completed evidence is retained',()=>{
  const stale="Custom details + Balian's Battle Griffin (One-Time Event Bonus) + Nureddin's Red Death (One-Time October $2,000 Bonus)"
  const record=donation({selected_package_id:'october-supply-1000',event_bonus_name:"Balian's Battle Griffin",event_bonus_eligible:null,october_bonus_eligible:true})
  assert.equal(helpers.getItemsWithReservedBonuses(record,stale),'Custom details')
  assert.equal(helpers.getItemsWithReservedBonuses({...record,fulfillment_status:'delivered'},stale),stale)
  assert.match(helpers.getEventBonusDeliveryText(record),/Payment must be verified/)
})

test('stale $100 Tiger suffixes are removed from outstanding drafts and preserved in delivered evidence',()=>{
  const stale=`Custom details + ${tiger} (One-Time Event Bonus)`
  const record=donation({selected_package_id:'october-supply-100',selected_package_amount:100})
  assert.equal(helpers.getItemsWithReservedBonuses(record,stale),'Custom details')
  assert.equal(helpers.getItemsWithReservedBonuses({...record,fulfillment_status:'delivered'},stale),stale)
  assert.equal(helpers.getEventBonusDeliveryText(record),null)
})

test('new $1,000 eligibility cannot add a Tiger to completed delivery evidence',()=>{
  const record=donation({selected_package_id:'october-supply-1000',fulfillment_status:'delivered'})
  const historical="Custom details + Balian's Battle Griffin (One-Time Event Bonus)"
  assert.equal(helpers.getItemsWithReservedBonuses(record,historical),historical)
})
test('reopening an undelivered eligible order adds newly reserved Tiger to saved text',()=>{
  const start=source.indexOf('const openDonation = ')
  const open=source.slice(start,source.indexOf('\n  useEffect(',start))
  const captured={}
  const sandbox={record:donation({items_delivered:'Custom delivery details'})}
  for(const name of ['Selected','Notes','Status','PaypalTransactionId','PaymentVerified','DeliveredTo','ItemsDelivered','FulfillmentNotes','FulfillmentEvidence','SaveMessage','BlockMessage'])
    sandbox['set'+name]=value=>{captured[name]=value}
  vm.runInNewContext(stripTypeScriptTypes(helperSource+'\n'+open)+'\nopenDonation(record)',sandbox)
  assert.ok(captured.ItemsDelivered.startsWith('Custom delivery details'))
  assert.ok(captured.ItemsDelivered.includes(tiger))
})
test('September and legacy category labels remain correct',()=>{
  assert.equal(helpers.getPackageCategory('october-supply-100'),'October Package')
  assert.equal(helpers.getPackageCategory('august-supply-500'),'August Supply Package')
  assert.equal(helpers.getPackageEventBonusName('september-supply-500'),'Rare Monster Weapon Style SET')
  assert.equal(helpers.getPackageEventBonusName('september-supply-1000'),'Epic Monster Weapon Style')
})
