import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';

const out='output/verification/ui-sharpness';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1.5});
const errors=[],checks=[],shots=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const state=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
const shot=async name=>{await page.evaluate(()=>{coopTest.render();return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});await page.locator('#game canvas').screenshot({path:`${out}/${name}.png`});shots.push(name);};
const mark=message=>{checks.push(message);console.log('PASS',message);};
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady===true);
 await page.locator('#title-start').click();await page.evaluate(()=>document.fonts.load('32px "Coop Headings"'));
 await page.waitForFunction(()=>JSON.parse(render_game_to_text()).heroPortraits.ready);
 await shot('selection');assert.equal((await state()).mode,'menu');
 const nav=await page.evaluate(()=>coopTest.view.navigationSnapshot());assert.ok(nav.items.some(i=>i.id==='setup-start'));assert.ok(nav.items.some(i=>i.id==='setup-role-1'));
 mark('Selection keeps all primary controller navigation regions while rendering enlarged labels');
 await page.keyboard.press('Enter');await page.evaluate(()=>advanceTime(500));assert.equal((await state()).mode,'play');
 await page.evaluate(()=>{const w=coopTest.world;w.xp=Math.round(w.xpNext*.6);w.heroes[0].hp=w.heroes[0].maxHp*.55;w.heroes[0].shield=12;});await shot('hud');
 mark('Combat HUD renders partial health, shield, controls and experience bars');
 await page.evaluate(()=>coopTest.world.beginReward('attribute'));await shot('attribute-reward');assert.equal((await state()).rewardType,'attribute');
 await page.evaluate(()=>{coopTest.world.confirm(0);coopTest.world.confirm(1);});assert.equal((await state()).mode,'play');
 mark('Attribute rewards remain independently confirmable by two players');
 await page.evaluate(async()=>{const {PASSIVES}=await import('/src/coop/builds.js');const w=coopTest.world;w.heroes.forEach(h=>{h.skills=[3,3];h.passives=Object.fromEntries(Object.keys(PASSIVES).filter(key=>!PASSIVES[key].role||PASSIVES[key].role===h.role).slice(0,4).map(key=>[key,1]));});w.beginReward('skill');});
 assert.equal((await state()).rewardChoices[0].length,4);await shot('compact-skill-reward');
 mark('Four-choice skill rewards fit enlarged two-line descriptions and the passive summary');
 await page.evaluate(()=>{coopTest.start(['warrior','mage'],2);coopTest.world.pause('手柄暂时离线，请重新绑定');});await shot('paused');
 assert.ok((await page.evaluate(()=>coopTest.view.navigationSnapshot())).items.some(i=>i.id==='pause-resume'));
 mark('Pause menu retains binding, settings and return navigation');
 await page.evaluate(async()=>{const w=coopTest.world,{rollEquipment,applyEquipment}=await import('/src/coop/equipment.js');w.mode='complete';w.room=5;w.wave=2;w.level=12;w.heroes.forEach(h=>h.level=12);w.gold=1000;w.enterShop();w.shop.offers=['warrior','mage','archer'].map((role,index)=>rollEquipment(role,index===1?'weapon':'armor',15,()=>.01,`sharpness-${index}`));const h=w.shop.recruit.hero;for(const slot of ['weapon','armor'])applyEquipment(h,rollEquipment(h.role,slot,15,()=>.01,`sharpness-recruit-${slot}`));});
 await shot('shop');assert.equal((await state()).shop.offers.length,3);assert.ok((await state()).shop.offers.every(item=>item.affixes.length===3));
 await page.evaluate(()=>{coopTest.world.shop.inspect={type:'item',index:0};});await shot('shop-item-details');
 await page.evaluate(()=>{coopTest.world.shop.inspect={type:'recruit'};});await shot('shop-recruit-details');
 await page.evaluate(()=>{coopTest.world.shop.inspect=null;const w=coopTest.world;w.buyEquipment(0,0,0,w.shop.offers[0].uid);});assert.equal((await state()).shop.offers[0].sold,true);
 mark('Shop names, prices, affixes and recruit details remain readable and matching-role purchase succeeds');
 assert.deepEqual(errors,[]);mark('No browser errors during UI rendering and real menu transactions');
}finally{
 fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors,screenshots:shots,staged:'Health/XP, four-passive rewards and shop goods are isolated UI fixtures, not a natural run or balance result.',limits:'Local desktop Chromium at 1920x1080 / DPR 1.5; physical controller and real mobile hardware not covered.'},null,2));
 await browser.close();
}
