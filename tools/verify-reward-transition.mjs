import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
const label=process.argv.find(a=>a.startsWith('--label='))?.slice(8)||'after',out=`output/p1-fixes/reward-transition-${label}`;fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:940}}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>JSON.parse(render_game_to_text())),advance=ms=>page.evaluate(ms=>advanceTime(ms),ms);
const tap=async key=>{await page.keyboard.down(key);await advance(20);await page.keyboard.up(key);await advance(20);};
const shot=async name=>{await page.evaluate(()=>coopTest.render());await page.locator('#game canvas').screenshot({path:`${out}/${name}.png`});};
const pair=async()=>{await page.keyboard.down('e');await page.keyboard.down('Enter');await advance(20);};
const release=async()=>{await page.keyboard.up('e');await page.keyboard.up('Enter');await advance(20);};
const mark=s=>{checks.push(s);console.log('PASS',s);};
async function fixture(kind='attribute'){
 await page.evaluate(async kind=>{
  coopTest.router.bind(0,{type:'keyboard',id:0});coopTest.router.bind(1,{type:'keyboard',id:1});coopTest.setPads([]);coopTest.start(['warrior','mage'],2);
  const w=coopTest.world,{ATTRIBUTES,skillPool}=await import('/src/coop/builds.js');Object.assign(w,{pressure:null,enemies:[],obstacles:[],effects:[],pickups:[],hazards:[],waveDuration:Infinity,enrageAt:Infinity});
  if(kind==='attribute'){
   w.beginReward('attribute');w.xp=w.xpNext;
   w.offers=[['power','armor','hp'],['speed','haste','crit']].map(keys=>keys.map(key=>({...ATTRIBUTES.find(o=>o.key===key),kind:'attribute'})));
  }else{
   w.heroes.forEach(h=>h.skills=[1,1]);w.heroes[0].passives={guard:1,harvest:1,thorns:1,focus:1};w.beginReward('skill');
   w.offers=[['passive:chill','active:0','active:1'],['active:0','active:1','passive:guard']].map((keys,i)=>keys.map(key=>skillPool(w.heroes[i]).find(o=>o.key===key)));
  }
  coopTest.router.flush();coopTest.render();
 },kind);await advance(20);
}
try{
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady,null,{timeout:120000});await advance(0);await fixture();
 await tap('ArrowDown');await tap('Enter');await tap('s');await tap('s');let s=await state();assert.deepEqual(s.ready,[false,true]);assert.equal(s.selection[0],2);await shot('01-before-double-confirm');
 await pair();s=await state();await shot('02-after-double-confirm');assert.equal(s.level,2);assert.equal(s.heroes[0].maxHp,230,'P1 must receive the card they selected on the old page');assert.equal(s.heroes[1].stats.haste,1.12);
 assert.deepEqual(s.ready,[false,false],'an old-page P2 confirm must never accept the next level default card');assert.deepEqual(s.selection,[0,0,0]);
 const held=JSON.stringify(s.heroes);await advance(160);assert.equal(JSON.stringify((await state()).heroes),held);await release();mark('queued XP and same-frame dual confirms preserve P1 selected HP while neither player auto-confirms the next level; held keys stay blocked');
 await tap('ArrowDown');await tap('ArrowDown');const expected=await page.evaluate(async()=>{
  const w=coopTest.world,{applyReward}=await import('/src/coop/builds.js'),h=structuredClone(w.heroes[1]);applyReward(h,w.offers[1][w.selection[1]].key);return {key:w.offers[1][w.selection[1]].key,hero:h};
 });await tap('Enter');assert.deepEqual(await page.evaluate(()=>coopTest.world.heroes[1]),expected.hero);assert.deepEqual((await state()).ready,[false,true]);mark('after releasing old keys P2 can choose and receive the actual non-default card on the next page');
 await fixture('skill');await tap('ArrowDown');await pair();await release();s=await state();assert.equal(s.rewardMenus[0].type,'replace');assert.deepEqual(s.ready,[false,true]);assert.deepEqual(s.heroes[1].skills,[1,2]);assert.equal(s.selection[1],1);await shot('03-replace-with-teammate-ready');mark('P1 opening a replacement submenu does not block P2 selected second active or alter P2 cursor');
 await fixture();await tap('ArrowDown');await tap('Enter');await tap('s');await tap('s');
 await page.evaluate(()=>{const pad=(index,pressed=[])=>({index,axes:[0,0],mapping:'standard',buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i)}))});window.transitionPad=pad;coopTest.router.bind(0,{type:'gamepad',id:0});coopTest.router.bind(1,{type:'gamepad',id:1});coopTest.setPads([pad(0),pad(1)]);});await advance(20);
 await page.evaluate(()=>coopTest.setPads([transitionPad(0,[0]),transitionPad(1,[0])]));await advance(20);s=await state();assert.equal(s.level,2);assert.deepEqual(s.ready,[false,false]);assert.equal(s.heroes[0].maxHp,230);await advance(160);assert.deepEqual((await state()).ready,[false,false]);mark('two simulated gamepads also cannot carry a simultaneous A edge or held A into the next attribute page');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors,scope:'Real Chromium keyboard and simulated gamepad events; queued XP and choices are explicit fixtures. No physical controllers tested.'},null,2)+'\n');
}catch(e){fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors,failure:String(e),stack:e.stack},null,2)+'\n');throw e;}finally{await browser.close();}
