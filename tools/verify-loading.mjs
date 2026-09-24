import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
const base=process.env.GAME_URL||'http://127.0.0.1:4173',out='output/verification/loading-optimization';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),checks=[],errors=[];
const mark=t=>{checks.push(t);console.log('PASS',t);};
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
const ready=()=>page.waitForFunction(()=>window.assetsReady===true);
const settled=()=>page.waitForFunction(()=>!coopTest.sceneLoading.waiting&&document.querySelector('#scene-loading').hidden);
const shot=name=>page.screenshot({path:`${out}/${name}.png`});
try{
 await page.goto(base);await ready();
 const initial=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({url:r.name,size:r.decodedBodySize})));
 assert.ok(!initial.some(r=>/runtime\/(equipment-|shop-|adventure-)/.test(r.url)));
 assert.ok(Object.values((await state()).sceneAssets.groups).every(g=>g.status==='idle'));
 fs.writeFileSync(`${out}/initial-resources.json`,JSON.stringify(initial,null,2));
 mark('Cold setup does not download equipment, shop, bonus or Boss art');
 await page.locator('#title-start').click();await page.waitForFunction(()=>document.body.dataset.screen==='setup');await shot('setup');
 await page.keyboard.press('Enter');await page.waitForFunction(()=>document.body.dataset.screen==='game');await page.evaluate(()=>advanceTime(500));await shot('combat');
 await page.keyboard.down('d');const x=(await state()).heroes[0].x;await page.evaluate(()=>advanceTime(300));await page.keyboard.up('d');assert.ok((await state()).heroes[0].x>x);mark('Title, selection, gameplay and movement work before optional groups are loaded');
 let release;const gate=new Promise(r=>release=r);
 await page.route('**/assets/runtime/adventure-*.webp',async route=>{await gate;await route.continue();});
 await page.evaluate(()=>{const w=coopTest.world;w.room=10;w.enemies=[];w.spawnWave();coopTest.render();});
 await page.waitForFunction(()=>coopTest.sceneLoading.waiting);const before=await state();
 await page.evaluate(()=>advanceTime(4000));const after=await state();assert.equal(after.time,before.time);assert.deepEqual(after.heroes.map(h=>h.hp),before.heroes.map(h=>h.hp));
 await shot('boss-wait');release();await settled();await page.evaluate(()=>coopTest.render());
 assert.equal((await state()).sceneAssets.groups.boss.status,'ready');await shot('boss-ready');mark('Delayed Boss images block simulation and damage, then resume with complete art');
 // Both icon and bonus groups share metadata; blocking only the bonus must not
 // prevent shop entry, and failure retries must not reroll offers or spend gold.
 let failed=true;await page.route('**/assets/runtime/shop-bonus-*.webp',route=>failed?route.abort():route.continue());
 await page.evaluate(async()=>{const {startBonusEvent}=await import('./src/coop/bonus-events.js');coopTest.start(['warrior','mage'],2);startBonusEvent(coopTest.world,'gold');coopTest.render();});
 await page.waitForFunction(()=>document.querySelector('.scene-loading-error').hidden===false);const failedState=await state();
 await page.evaluate(()=>advanceTime(2000));assert.equal((await state()).bonusEvent.remaining,failedState.bonusEvent.remaining);
 await shot('bonus-retry');failed=false;await page.keyboard.press('Enter');await settled();await page.evaluate(()=>coopTest.render());
 assert.equal((await state()).sceneAssets.groups.bonus.status,'ready');await shot('bonus-ready');mark('Failed bonus image exposes keyboard retry; event clock stays frozen and recovers without reload');
 const preparation=await page.evaluate(async()=>{
  let running=true,last=performance.now();const gaps=[];
  const sample=()=>{const now=performance.now();gaps.push(now-last);last=now;if(running)requestAnimationFrame(sample);};requestAnimationFrame(sample);
  await coopTest.sceneLoading.assets.wait(['equipment']);await new Promise(r=>setTimeout(r,80));running=false;
  return {frames:gaps.length,maxGapMs:Math.max(...gaps)};
 });
 assert.ok(preparation.frames>10);assert.ok(preparation.maxGapMs<250,JSON.stringify(preparation));
 fs.writeFileSync(`${out}/equipment-preparation.json`,JSON.stringify(preparation,null,2));mark('Background outfit preparation yields to animation frames instead of blocking for a second');
 await page.evaluate(()=>{coopTest.start(['warrior','mage'],2);const w=coopTest.world;w.room=5;w.heroes.forEach(h=>h.gold=200);w.mode='complete';w.enterShop();coopTest.render();});await settled();
 let s=await state();assert.equal(s.mode,'shop');assert.equal(s.sceneAssets.groups.shop.status,'ready');assert.equal(s.equipmentArt.ready,true);await shot('shop');
 const iconResult=await page.evaluate(async()=>{const {drawEquipmentIcon}=await import('./src/coop/shop-event-art.js');const {EQUIPMENT_APPEARANCES}=await import('./src/coop/equipment-data.js');const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=600;canvas.id='loading-icon-proof';canvas.style='position:fixed;inset:0;z-index:99;background:#193a2d';document.body.append(canvas);const c=canvas.getContext('2d'),results=[];Object.values(EQUIPMENT_APPEARANCES).forEach((slots,row)=>[...slots.weapon,...slots.armor].forEach((item,col)=>results.push(drawEquipmentIcon(c,{visualKey:item.key},100+col*200,100+row*200,145))));return results;});
 assert.equal(iconResult.filter(Boolean).length,21);await page.locator('#loading-icon-proof').screenshot({path:`${out}/icons.png`});await page.evaluate(()=>document.querySelector('#loading-icon-proof').remove());mark('Independent shop and equipment packages load all 21 cropped icons and body atlases');
 await page.evaluate(async()=>{const {ROUTES}=await import('./src/coop/adventure.js');coopTest.start(['warrior','mage'],2);const w=coopTest.world;w.room=3;w.wave=2;w.enemies=[];w.route={...ROUTES.nursery,room:w.room};w.spawnWave();coopTest.render();});await settled();await page.evaluate(()=>coopTest.render());await shot('nest');assert.equal((await state()).sceneAssets.groups.objectives.status,'ready');mark('Objective package loads independently of Boss and renders nests');
 // Separate context: failure during Boss deep link, B returns to title; held A
 // is not allowed to skip setup when the menu is shown again.
 const pad=await browser.newPage({viewport:{width:1440,height:900}});pad.on('pageerror',e=>errors.push(e.message));
 await pad.addInitScript(()=>{window.pads=[];Object.defineProperty(navigator,'getGamepads',{value:()=>window.pads});});
 await pad.route('**/assets/runtime/adventure-*.webp',r=>r.abort());await pad.goto(`${base}/?adventureTrial=boss`);await pad.waitForFunction(()=>window.assetsReady&&document.querySelector('.scene-loading-error').hidden===false);
 await pad.evaluate(()=>{window.pads=[{index:0,id:'test',mapping:'standard',connected:true,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===1,value:i===1?1:0}))}];});
 await pad.waitForFunction(()=>document.body.dataset.screen==='title');assert.equal(await pad.locator('#scene-loading').isVisible(),false);await pad.close();mark('Boss deep-link failure supports controller B return to title');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/browser.json`,JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
