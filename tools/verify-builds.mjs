import fs from 'node:fs';
import assert from 'node:assert/strict';
import {BUILD_TRIALS} from '../src/coop/build-presets.js';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
const out='output/coop-verification/builds';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:940}}),errors=[],failed=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
const state=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
const advance=ms=>page.evaluate(ms=>advanceTime(ms),ms);
const tap=async key=>{await page.keyboard.down(key);await advance(12);await page.keyboard.up(key);};
const shot=async name=>{await page.evaluate(()=>coopTest.render());await page.locator('#game canvas').screenshot({path:`${out}/${name}.png`});};
const mark=label=>{checks.push(label);console.log('PASS',label);};
async function fixture(role,core,forms){await page.evaluate(async({role,core,forms,passives})=>{
 coopTest.start([role,role==='mage'?'archer':'mage'],1);const w=coopTest.world;const {addFixtureCompanions}=await import('/tests/hero-fixture.mjs');addFixtureCompanions(w,[role,role==='mage'?'archer':'mage','warrior','mage','archer']);w.pressure=null;w.spawnQueue=[];w.enemies=[];w.obstacles=[];w.xpNext=1e6;w.waveTimer=-100;w.options.shake=false;w.time=10;
 w.heroes.forEach((h,i)=>{h.ai=false;h.x=i?850:0;h.y=0;h.attackCd=99;});
 const h=w.heroes[0];h.core=core;h.skills=[2,2];h.forms=forms;h.passives=passives;
 const e=w.createEnemy('mushroom',150,0);e.hp=e.maxHp=1000;e.cd=99;e.freeze=99;w.enemies=[e];w.camera={x:0,y:0,zoom:.9};
},{role,core,forms,passives:{...BUILD_TRIALS[core].passives}});}
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady,null,{timeout:60000});await advance(0);
 assert.equal((await state()).buildArt.loaded,7);await shot('menu');mark('seven transparent build PNGs load through the real app');
 await page.evaluate(()=>coopTest.start(['warrior','mage'],1));assert.deepEqual((await state()).heroes[0].skills,[0,0]);
 await page.evaluate(()=>{const w=coopTest.world;w.beginReward('skill');});let s=await state();assert.equal(s.clears,1);assert.ok(!s.offers[0].some(o=>o.kind==='core'));
 const first=s.offers[0].findIndex(o=>o.kind==='active');await page.evaluate(i=>{coopTest.world.choose(0,i);coopTest.world.confirm(0);},first);
 await page.evaluate(()=>{const w=coopTest.world;w.beginReward('skill');});s=await state();assert.equal(s.clears,2);assert.equal(s.offers[0].length,3);assert.ok(s.offers[0].every(o=>o.kind!=='core'));assert.ok(!['core','form','evolution'].includes(s.offers[0][0].kind));await shot('early-choice');mark('normal start remains empty; second clear no longer guarantees a core or recipe');
 await page.evaluate(()=>{const w=coopTest.world;w.confirm(0);w.nextRoom();w.beginReward('attribute');});const before=(await state()).heroes[0].rerolls;
 assert.equal(await page.evaluate(()=>coopTest.world.reroll(0)),true);assert.equal((await state()).heroes[0].rerolls,before-1);mark('reroll spends only the requesting players own charge');
 await fixture('warrior','bulwark',['aegis',null]);
 await page.evaluate(()=>{const w=coopTest.world,e=w.enemies[0];e.freeze=0;e.x=70;e.action={x:0,y:0,t:0,windup:.42,r:90,kind:'melee',hit:false};});
 await tap('q');await advance(180);await shot('aegis-guard');await advance(300);s=await state();assert.equal(s.heroes[0].hp,200);assert.ok(s.heroes[0].storedGuard>0);
 await advance(600);await tap('e');await advance(140);await shot('aegis-counter');assert.equal((await state()).heroes[0].storedGuard,0);assert.ok((await state()).enemies[0].hp<1000);mark('real enemy windup hits frontal guard and separate storage/release components spend the shockwave');
 await fixture('warrior','berserker',[null,'bloodspin']);await page.evaluate(()=>coopTest.world.heroes[0].resource=100);
 await page.keyboard.down('s');await tap('e');await advance(330);await shot('bloodspin');s=await state();assert.ok(s.heroes[0].y>20);assert.equal(s.heroes[0].resource,0);assert.ok(s.enemies[0].statuses.some(s=>s.type==='bleed'));await page.keyboard.up('s');await tap('Space');assert.equal((await state()).heroes[0].action,'dodge');mark('moving bloodspin creates repeated cuts and can be cancelled by dodge');
 await fixture('mage','pyromancer',[null,null]);await page.evaluate(()=>{const w=coopTest.world;w.damageEnemy(w.enemies[0],10,w.heroes[0]);});await tap('q');await advance(430);await shot('inferno');assert.ok(await page.evaluate(()=>coopTest.world.effects.some(f=>f.variant==='inferno')));mark('fireball spends own embers and shows a distinct detonation');
 await fixture('mage','frostweaver',['icelance','coldfield']);await page.evaluate(()=>{const w=coopTest.world,e=w.enemies[0];e.freeze=0;for(let i=0;i<3;i++)w.damageEnemy(e,1,w.heroes[0]);});await tap('q');await advance(350);await shot('ice-shatter');assert.ok(await page.evaluate(()=>coopTest.world.effects.some(f=>f.variant==='shatter')));await advance(200);await tap('e');await advance(200);await shot('coldfield');assert.ok((await state()).hazards.some(f=>f.type==='coldfield'));mark('ice lance consumes personal brittle and coldfield persists on the ground');
 await fixture('archer','sniper',['markedshot',null]);await page.evaluate(()=>{const w=coopTest.world,e=w.enemies[0];e.x=270;for(let i=0;i<5;i++)w.damageEnemy(e,1,w.heroes[0]);});await tap('q');await advance(270);await shot('marked-arrow');await advance(250);await shot('mark-cashout');assert.equal((await state()).heroes[0].huntStacks,0);mark('marked shot has visible windup, swept flight and personal mark cashout');
 await fixture('archer','ranger',[null,'shadowvolley']);await page.evaluate(()=>{const w=coopTest.world;w.enemies[0].x=360;w.heroes[0].resource=100;});await page.keyboard.down('s');await tap('Space');await advance(310);await page.keyboard.up('s');await tap('e');await advance(180);await shot('shadow-volley');assert.ok((await state()).heroes[0].shadow);assert.ok(await page.evaluate(()=>coopTest.world.projectiles.some(p=>p.visual==='shadow')));mark('dodge creates one separate firing origin and charged E creates crossfire');
 await page.evaluate(()=>{const w=coopTest.world;w.humanCount=2;w.heroes.forEach((h,i)=>{h.ai=i===2;h.skills=[3,3];});w.clears=3;w.beginReward('skill');});await shot('two-player-build-cards');const paused=(await state()).time;await advance(1000);assert.equal((await state()).time,paused);mark('two player build selection pauses actual battle and keeps both panels readable');
 const rolls=(await state()).heroes.map(h=>h.rerolls);await tap('r');s=await state();assert.equal(s.heroes[0].rerolls,rolls[0]-1);assert.equal(s.heroes[1].rerolls,rolls[1]);await tap('Numpad3');assert.equal((await state()).heroes[1].rerolls,rolls[1]-1);
 await page.evaluate(()=>{const pads=[0,1].map(index=>({index,axes:[0,0],mapping:'standard',buttons:Array.from({length:17},()=>({pressed:false}))}));coopTest.router.bind(0,{type:'gamepad',id:0});coopTest.router.bind(1,{type:'gamepad',id:1});coopTest.setPads(pads);window.buildTestPads=pads;});await advance(12);await page.evaluate(()=>{buildTestPads[1].buttons[3].pressed=true;});await advance(250);s=await state();assert.equal(s.heroes[0].rerolls,rolls[0]-1);assert.equal(s.heroes[1].rerolls,rolls[1]-2);assert.equal(s.mode,'upgrade');mark('R, NUM3 and held gamepad Y reroll only their own player once without casting');
 for(const [key,preset] of Object.entries(BUILD_TRIALS)){
  await page.goto(new URL(`index.html?trial=${key}`,process.env.GAME_URL||'http://127.0.0.1:4173/').href);await page.waitForFunction(()=>window.assetsReady);await advance(0);s=await state();assert.equal(s.mode,'play');assert.equal(s.humanCount,1);assert.equal(s.heroes[0].role,preset.role);assert.equal(s.heroes[0].core,key);assert.deepEqual(s.heroes[0].forms,preset.forms);assert.deepEqual(s.heroes[0].skills,[2,2]);assert.equal(s.heroes.filter(h=>h.ai).length,0);assert.match(await page.locator('#status').textContent(),/预设技能开局/);
  await page.evaluate(()=>{coopTest.world.mode='defeat';});await page.keyboard.press('Enter');assert.equal((await state()).heroes[0].core,key);mark(`${key} trial starts and restarts with the declared build and no free AI companions`);
 }
 await page.goto(new URL('index.html?trial=__proto__',process.env.GAME_URL||'http://127.0.0.1:4173/').href);await page.waitForFunction(()=>window.assetsReady);await advance(0);assert.equal((await state()).mode,'menu');await page.keyboard.press('Enter');assert.deepEqual((await state()).heroes[0].skills,[0,0]);mark('unknown trial values cannot grant a preset or change normal empty-skill start');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors,failed,fixtures:'Combat state staged with explicit builds and durable enemies; actual keyboard, simulation and renderer used. Not a natural-run balance test.'},null,2));
}finally{await browser.close();}
