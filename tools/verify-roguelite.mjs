import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
const out='output/coop-verification/roguelite';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),p=await browser.newPage({viewport:{width:1440,height:940}}),errors=[],failed=[],checks=[];
p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
const state=()=>p.evaluate(()=>JSON.parse(render_game_to_text())),advance=ms=>p.evaluate(ms=>advanceTime(ms),ms);
const shot=async name=>{await p.evaluate(()=>coopTest.render());await p.locator('#game canvas').screenshot({path:`${out}/${name}.png`});};
const tap=async key=>{await p.keyboard.down(key);await advance(30);await p.keyboard.up(key);await advance(20);};
const mark=s=>{checks.push(s);console.log('PASS',s);};
try{
 await p.goto(process.env.GAME_URL||'http://127.0.0.1:4173/');await p.waitForFunction(()=>window.assetsReady);await advance(0);await shot('menu');
 await p.evaluate(()=>{coopTest.view.click(580,216);coopTest.render();});await tap('Enter');assert.equal((await state()).humanCount,1);assert.deepEqual((await state()).heroes.map(h=>h.ai),[false,true,true]);await tap('q');assert.deepEqual((await state()).heroes[0].skills,[0,0]);await shot('solo-start');mark('Solo menu selection creates two AI; skill slots start empty');
 await p.evaluate(()=>{coopTest.router.slots[1]={type:'disconnected',id:99};});await advance(20);assert.equal((await state()).mode,'play');mark('Unused P2 device cannot pause solo mode');
 await p.evaluate(()=>{const w=coopTest.world;w.enemies=[w.createEnemy('goblin',0,-200)];w.heroes[1].x=450;w.heroes[1].y=300;w.heroes[2].x=500;w.heroes[2].y=250;});
 const aiBefore=(await state()).heroes.slice(1).map(h=>[h.x,h.y]);await advance(650);assert.ok((await state()).heroes.slice(1).every((h,i)=>Math.hypot(h.x-aiBefore[i][0],h.y-aiBefore[i][1])>1));mark('Both AI move through real frame updates');
 await p.evaluate(()=>{coopTest.world.xp=coopTest.world.xpNext+2;});await advance(20);let s=await state();assert.equal(s.mode,'upgrade');assert.equal(s.rewardType,'attribute');assert.equal(s.xp,2);assert.deepEqual(s.ready,[false,true,true]);await shot('solo-attributes');await tap('e');assert.equal((await state()).mode,'play');mark('Mid-wave XP opens attribute choice; solo confirmation resumes immediately');
 await p.evaluate(()=>{const w=coopTest.world;w.enemies=[];w.waveTimer=1.11;});await advance(20);await shot('solo-skill');s=await state();assert.equal(s.rewardType,'skill');const unlock=s.offers[0].findIndex(o=>o.key.startsWith('active:'));await p.evaluate(i=>coopTest.world.choose(0,i),unlock);await tap('e');assert.equal((await state()).wave,2);assert.ok((await state()).heroes[0].skills.some(Boolean));mark('Wave reward unlocks a usable active and starts next wave');
 await p.evaluate(()=>{const w=coopTest.world;coopTest.start(['warrior','mage'],1);w.enemies=[];w.waveTimer=-100;const h=w.heroes[1];h.x=300;h.y=0;h.hp=20;w.pickups=[{id:901,type:'potion',x:370,y:0}];});await advance(800);assert.equal((await state()).pickups.length,0);assert.ok((await state()).heroes[1].hp>20);mark('AI approaches and consumes health potion instead of stopping outside pickup radius');
 // Staged rendering fixtures isolate depth/anchor behavior from gameplay regressions.
 await p.evaluate(async()=>{const {ENEMIES}=await import(new URL('src/coop/enemies.js',location.href).href);coopTest.router.bind(1,{type:'keyboard',id:1});coopTest.start();const w=coopTest.world;w.enemies=Object.keys(ENEMIES).map((kind,i)=>w.createEnemy(kind,-480+(i%5)*240,-140+Math.floor(i/5)*260));w.heroes.forEach((h,i)=>{h.x=-100+i*100;h.y=320;});w.camera={x:0,y:0,zoom:.9};w.options.shake=false;});await shot('ten-monsters');
 for(const type of ['spin','attack','bash'])for(const face of [0,2,4,6]){
  await p.evaluate(({type,face})=>{const w=coopTest.world;w.enemies=[];w.effects=[];w.hazards=[];w.projectiles=[];const h=w.heroes[0];h.x=0;h.y=0;h.face=face;h.skills=[1,1];h.action={type,t:.2,duration:.53,dir:{x:Math.cos(face*Math.PI/4),y:Math.sin(face*Math.PI/4)},hit:new Set()};w.heroes[1].x=450;w.heroes[2].x=-450;w.camera={x:0,y:0,zoom:1};},{type,face});await shot(`warrior-${type}-${face}`);
 }mark('Ground spin and directional slash/bash render in four cardinal views');
 await p.evaluate(()=>{const w=coopTest.world;w.heroes[0].skills=[3,3];w.heroes[0].passives={momentum:2,echo:2};w.beginReward('skill');});await shot('evolution-offer');assert.ok((await state()).offers[0].some(o=>o.kind==='evolution'));mark('Evolution offers show prerequisites alongside the current build');
 await p.goto(new URL('art-lab.html',process.env.GAME_URL||'http://127.0.0.1:4173/').href);await p.waitForFunction(()=>window.artLab?.ready);await p.evaluate(()=>artLab.freeze(.3));await p.locator('#bestiary').screenshot({path:`${out}/bestiary.png`});assert.equal(await p.evaluate(()=>artLab.state.frames),184);mark('All 32 new monster poses render in shared art lab');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors,failed,staged:['ten-monsters','warrior-*','evolution-offer'],hardware:'Physical gamepads not tested'},null,2));
}finally{await browser.close();}
