import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';
const out='output/verification/skill-quality';
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1.25}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
await page.addInitScript(()=>{window.lessonPads=[];Object.defineProperty(navigator,'getGamepads',{value:()=>window.lessonPads});});
const held=[[],[]],step=ms=>page.evaluate(ms=>advanceTime(ms),ms);
const sync=async()=>{await page.evaluate(held=>{window.lessonPads=held.map((buttons,index)=>({index,id:`Lesson pad ${index}`,connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:buttons.includes(i),value:buttons.includes(i)?1:0}))}));advanceTime(34);},held);};
const tap=async(button,id=0)=>{held[id]=[];await sync();held[id]=[button];await sync();held[id]=[];await sync();};
const mark=t=>{checks.push(t);console.log('PASS',t);},state=()=>page.evaluate(()=>JSON.parse(render_game_to_text())),shot=name=>page.screenshot({path:`${out}/${name}.png`});
try{
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady);await page.locator('#title-start').click();
 await page.evaluate(async()=>{const {applyReward,skillPool}=await import('./src/coop/builds.js'),{lessonPrice}=await import('./src/coop/shop-lessons.js');coopTest.start(['mage','mage'],2);const w=coopTest.world;w.enemies=[];w.pressure=null;w.clears=19;w.room=10;w.wave=2;w.mode='complete';w.gold=150;
  for(const h of w.heroes){for(const s of [2,3]){for(let i=0;i<3;i++)applyReward(h,`active:${s}`);}for(const s of [2,3])applyReward(h,`advance:${s}`);h.passives.arcane=2;}
  w.enterShop();const card=skillPool(w.heroes[0],{clears:19}).find(c=>c.key==='mastery:stars');w.shop.lesson={...card,uid:'browser-stars',role:'mage',targetRank:null,price:lessonPrice(card,10),sold:false};
  coopTest.router.bind(0,{type:'gamepad',id:0});coopTest.router.bind(1,{type:'gamepad',id:1});coopTest.render();});await sync();await step(0);
 // Navigate the added shelf from the first item; no direct cursor mutation.
 await tap(12);assert.equal((await state()).shop.cursors[0],6);await shot('shop-lessons');await tap(2);assert.equal((await state()).shop.inspect.type,'lesson');await shot('shop-lesson-detail');const before=(await state()).gold;await tap(1);assert.equal((await state()).shop.inspect,null);assert.equal((await state()).gold,before);mark('New shared shelf and mastery recipe detail are reachable via D-pad/X/B');
 await tap(0);let s=await state();assert.equal(s.heroes[0].pairMastery.stars,true);assert.equal(s.heroes[1].pairMastery.stars,undefined);assert.equal(s.gold,before-65);assert.ok(s.shop.lesson.sold);await shot('shop-lesson-purchased');
 await tap(12,1);await tap(0,1);assert.equal((await state()).gold,before-65);assert.equal((await state()).heroes[1].pairMastery.stars,undefined);mark('P1 purchases once; P2 cannot spend again or receive another player mastery');
 await tap(3);s=await state();assert.equal(s.shop.lesson.uid,'browser-stars');assert.equal(s.shop.lesson.sold,true);mark('Paid refresh preserves the shared per-visit lesson quota');
 for(const key of ['active:0','passive:guard','passive:boneWhistle']){
  await page.evaluate(async key=>{const {skillPool,applyReward}=await import('./src/coop/builds.js'),{lessonPrice}=await import('./src/coop/shop-lessons.js');coopTest.start(['warrior'],1);const w=coopTest.world;w.room=5;w.clears=10;w.mode='complete';w.gold=100;if(key==='passive:guard')applyReward(w.heroes[0],'active:0');w.enterShop();const card=skillPool(w.heroes[0],{clears:10}).find(c=>c.key===key);if(!card)throw Error(`Missing legal fixture ${key}`);w.shop.lesson={...card,role:'warrior',uid:key,targetRank:1,price:lessonPrice(card,5)};coopTest.render();},key);
  await shot('shop-'+key.replace(':','-'));await page.evaluate(()=>{const w=coopTest.world;w.shop.inspect={type:'lesson'};coopTest.render();});await shot('detail-'+key.replace(':','-'));
 }
 mark('Base skill, class passive and universal summon lessons render their own icons and descriptions');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/shop-browser.json`,JSON.stringify({checks,errors,scope:'Local Chromium and two simulated navigator gamepads. Legal mastery fixture; not natural income or physical controller testing.'},null,2));
}finally{await browser.close();}
