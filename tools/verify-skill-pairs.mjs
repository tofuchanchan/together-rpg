import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';
const out='output/verification/skill-pairs';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-gpu']}),page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1.25}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const mark=s=>{checks.push(s);console.log('PASS',s);};
const step=ms=>page.evaluate(ms=>advanceTime(ms),ms);
const press=async(key,ms)=>{await page.keyboard.down(key);await step(ms);await page.keyboard.up(key);};
try{
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady);await page.locator('#title-start').click();await step(0);
 await page.screenshot({path:out+'/selection.png'});
 const pairs=await page.evaluate(async()=>Object.entries((await import('./src/coop/skill-pairs.js')).SKILL_PAIRS));
 for(const [key,pair] of pairs){
  await page.evaluate(async({key,pair})=>{const {applyReward}=await import('./src/coop/builds.js');coopTest.view.humanCount=1;coopTest.view.roles=[pair.role,pair.role];coopTest.view.actions.start(coopTest.view.roles);const w=coopTest.world,h=w.heroes[0];w.pressure=null;w.obstacles=[];w.waveDuration=999;w.enemies=[];w.xpNext=1e9;h.x=h.y=0;h.hp=h.maxHp=10000;h.attackCd=999;for(const slot of pair.slots)for(let i=0;i<3;i++)applyReward(h,`active:${slot}`);for(const slot of pair.slots)applyReward(h,`advance:${slot}`);h.passives[pair.component]=2;applyReward(h,`mastery:${key}`);for(let i=0;i<12;i++){const e=w.createEnemy('goblin',100+(i%4)*75,(Math.floor(i/4)-1)*65);e.hp=e.maxHp=3000;e.stats.speed=0;e.cd=999;w.enemies.push(e);}w.camera={x:90,y:0,zoom:.8};coopTest.render();},{key,pair});
  if(key==='stars')await page.evaluate(()=>{for(const e of coopTest.world.enemies)e.x+=230;});
  await press('q',key==='stars'?550:300);await page.screenshot({path:`${out}/${key}-q.png`});await step(1100);
  await press('e',350);await page.screenshot({path:`${out}/${key}-e.png`});await step(1100);
  const state=await page.evaluate(()=>JSON.parse(render_game_to_text()));assert.equal(state.mode,'play');assert.ok(state.heroes[0].damageDone>0);assert.equal(state.heroes[0].skillAdvances.filter(Boolean).length,2);assert.equal(state.heroes[0].pairMastery[key],true);mark(`${key}: actual Q/E input, advanced effects, damage and mastery state`);
 }
 await page.evaluate(()=>{const w=coopTest.world;w.mode='upgrade';w.rewardType='skill';w.ready=[false];w.rewardMenus=[null];w.selection=[0];w.offers=[[{key:'active:2',title:'习得奥术弹幕',desc:'更换一个技能',icon:'barrage'}]];coopTest.render();});
 await press('e',34);assert.equal(await page.evaluate(()=>coopTest.world.rewardMenus[0]?.type),'skill-replace');await page.screenshot({path:out+'/replace.png'});
 await press('r',34);assert.equal(await page.evaluate(()=>coopTest.world.rewardMenus[0]),null);mark('New skill replacement opens a separate choice and cancellation preserves the original reward');
 const codex=await browser.newPage();await codex.goto('http://127.0.0.1:4173/codex.html#advance%3Amage%3A2');await codex.waitForFunction(()=>window.codexTest?.snapshot().artReady);assert.ok((await codex.locator('body').innerText()).includes('万星追猎'));await codex.screenshot({path:out+'/codex.png'});await codex.close();mark('Codex explains pair advancement and loads its preview');
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({checks,errors,limits:['Local Chromium; deterministic combat fixtures, not natural play or physical gamepads.']},null,2));
}finally{await browser.close();}
