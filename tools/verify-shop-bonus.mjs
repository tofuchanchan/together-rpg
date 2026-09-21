import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='output/verification/shop-bonus';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:940}}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const state=()=>page.evaluate(()=>JSON.parse(render_game_to_text())),step=ms=>page.evaluate(ms=>advanceTime(ms),ms);
const tap=async key=>{await page.keyboard.down(key);await step(25);await page.keyboard.up(key);await step(25);};
const shot=async name=>{await page.evaluate(()=>coopTest.render());await page.locator('#game canvas').screenshot({path:`${out}/${name}.png`});};
const mark=t=>{checks.push(t);console.log('PASS',t);};
const store=async(role='warrior',humans=2)=>page.evaluate(({role,humans})=>{coopTest.start([role,'mage'],humans);const w=coopTest.world;w.mode='complete';w.room=5;w.wave=2;w.clears=10;w.heroes.forEach(h=>h.gold=2000);w.enterShop();coopTest.render();},{role,humans});
try{
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady===true);await page.locator('#title-start').click();await store();
 let s=await state();assert.deepEqual(s.shopEventArt,{ready:true,equipmentIcons:21,bonusFrames:8});assert.ok(s.shop.stalls.every(v=>v.offers.length===5&&v.recruits.length===5&&v.lessons.filter(Boolean).length===5));await shot('shop-equipment-duo');
 for(let i=0;i<4;i++)await tap('s');await tap('e');s=await state();assert.ok(s.shop.stalls[0].offers[4].sold);assert.equal(s.heroes[1].gold,2000);mark('Five equipment, skills and recruits per owner; fifth equipment buys from only P1 wallet');
 await tap('d');assert.equal((await state()).shop.stalls[0].category,'skills');await shot('shop-skills-duo');await tap('e');s=await state();assert.ok(s.shop.stalls[0].lessons[4].sold);assert.equal(s.shop.stalls[0].lessonPurchases,1);assert.equal(s.shop.stalls[1].lessonPurchases,0);mark('Fifth skill is selectable and buying updates only personal prices');
 await tap('d');await shot('shop-recruits-duo');await tap('q');s=await state();assert.deepEqual(s.shop.stalls[0].inspect,{type:'recruit',index:4});await shot('recruit-fifth-detail');await tap('q');await tap('e');s=await state();assert.ok(s.shop.stalls[0].recruits[4].hired);assert.equal(s.heroes.length,3);mark('Fifth mercenary details and hiring use the selected candidate');
 await store('archer',1);await shot('shop-equipment-solo');
 // Native drawing of each original icon, with all appearance keys checked.
 const icons=await page.evaluate(async()=>{const {drawEquipmentIcon}=await import('/src/coop/shop-event-art.js'),{EQUIPMENT_APPEARANCES}=await import('/src/coop/equipment-data.js');const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=600;canvas.id='icon-proof';canvas.style='position:fixed;inset:0;z-index:99999;background:#193a2d';document.body.append(canvas);const c=canvas.getContext('2d');c.fillStyle='#193a2d';c.fillRect(0,0,1400,600);const results=[];Object.entries(EQUIPMENT_APPEARANCES).forEach(([role,slots],row)=>[...slots.weapon,...slots.armor].forEach((item,col)=>{results.push(drawEquipmentIcon(c,{visualKey:item.key},100+col*200,88+row*200,145));c.fillStyle='#f4eccf';c.font='16px sans-serif';c.textAlign='center';c.fillText(item.name,100+col*200,178+row*200);}));return results;});assert.equal(icons.filter(Boolean).length,21);
 await page.locator('#icon-proof').screenshot({path:`${out}/equipment-icons.png`});await page.evaluate(()=>document.querySelector('#icon-proof').remove());mark('All 21 item icons load and render as weapons or empty armor sets');
 const perf=[];
 for(const kind of ['xp','gold']){
  await page.evaluate(async kind=>{const {startBonusEvent}=await import('/src/coop/bonus-events.js');coopTest.start(['warrior','mage'],2);const w=coopTest.world;w.clears=4;w.xpNext=1000000;w.settleWave();startBonusEvent(w,kind);coopTest.render();},kind);
  await step(900);s=await state();assert.equal(s.bonusEvent.kind,kind);assert.ok(s.enemies.every(e=>e.bonusKind===kind&&!e.attack));await shot(`bonus-${kind}`);
  const remaining=s.bonusEvent.remaining;await tap('p');assert.equal((await state()).mode,'paused');await step(1000);assert.ok(Math.abs((await state()).bonusEvent.remaining-remaining)<.1);await tap('p');assert.equal((await state()).mode,'play');
  const sample=await page.evaluate(()=>{const samples=[];for(let i=0;i<90;i++){const t=performance.now();advanceTime(1000/60);samples.push(performance.now()-t);}samples.sort((a,b)=>a-b);return {p95:samples[Math.floor(samples.length*.95)],max:samples.at(-1),enemies:coopTest.world.enemies.length};});perf.push({kind,...sample});
  await page.evaluate(()=>{const w=coopTest.world,h=w.heroes[0],e=w.enemies[0];w.damageEnemy(e,9999,h);w.bonusEvent.remaining=.001;});await step(10);s=await state();assert.equal(s.bonusEvent.phase,'collect');assert.equal(s.enemies.length,0);await shot(`bonus-${kind}-collection`);
  await page.evaluate(()=>coopTest.world.bonusEvent.remaining=.001);await step(10);s=await state();assert.equal(s.bonusEvent,null);assert.equal(s.wave,2);assert.equal(s.clears,4);mark(`${kind} event draws original sprites, pauses, expires into collection and resumes the same wave sequence`);
 }
 await page.goto('http://127.0.0.1:4173/codex.html#bonus%3Agold');await page.waitForFunction(()=>document.querySelector('.codex-preview')?.dataset.art==='ready');await page.screenshot({path:`${out}/codex-coin.png`});mark('Reward creature catalogue preview loads independently');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/browser.json`,JSON.stringify({checks,errors,perf,scope:'Staged deterministic local Chromium scenes; real keyboard input and native canvas render. Performance is headless CPU timing, not physical device FPS.'},null,2));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}finally{await browser.close();}
