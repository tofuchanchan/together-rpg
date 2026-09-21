import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='output/verification/pair-balance/browser';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-gpu']}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const step=ms=>page.evaluate(ms=>advanceTime(ms),ms);
const press=async(key,ms)=>{await page.keyboard.down(key);await step(ms);await page.keyboard.up(key);};
const orders={fortress:[0,2],blades:[3,1],rail:[2,0],storm:[3,1],stars:[3,2],elements:[1,0]};
try{
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady);await page.locator('#title-start').click();await step(0);
 for(const [key,order] of Object.entries(orders)){
  const buttons=await page.evaluate(async key=>{
   const {SKILL_PAIRS}=await import('./src/coop/skill-pairs.js'),{applyReward}=await import('./src/coop/builds.js'),pair=SKILL_PAIRS[key];
   coopTest.view.humanCount=1;coopTest.view.roles=[pair.role,pair.role];coopTest.view.actions.start(coopTest.view.roles);
   const w=coopTest.world,h=w.heroes[0];w.pressure=null;w.spawnQueue=[];w.obstacles=[];w.waveDuration=999;w.enemies=[];w.xpNext=1e9;
   h.x=h.y=0;h.hp=h.maxHp=10000;h.attackCd=999;
   for(const slot of pair.slots)for(let i=0;i<3;i++)if(!applyReward(h,`active:${slot}`).ok)throw Error('invalid skill reward');
   for(const slot of pair.slots)if(!applyReward(h,`advance:${slot}`).ok)throw Error('invalid advancement');
   for(let i=0;i<2;i++)if(!applyReward(h,`passive:${pair.component}`).ok)throw Error('invalid component');
   if(!applyReward(h,`mastery:${key}`).ok)throw Error('invalid mastery');
   for(let i=0;i<18;i++){const e=w.createEnemy('goblin',(key==='stars'?280:100)+(i%6)*55,(Math.floor(i/6)-1)*40);e.hp=e.maxHp=3000;e.stats.speed=0;e.stats.damage=0;e.stats.contactDamage=0;e.cd=999;w.enemies.push(e);}
   window.pairBalanceCapture={bursts:0,casts:[]};const emit=Object.getPrototypeOf(w).emit.bind(w);w.emit=(type,data)=>{if(type==='buildBurst'&&data.key===key)pairBalanceCapture.bursts++;if(type==='skill')pairBalanceCapture.casts.push(h.action.slot);emit(type,data);};
   coopTest.render();return h.loadout;
  },key);
  const button=slot=>buttons.indexOf(slot)?'e':'q';
  if(key==='fortress'){
   await press(button(order[0]),120);await page.evaluate(()=>{const w=coopTest.world;w.damageHero(w.heroes[0],50,{x:50,y:0});});await step(940);
  }else await press(button(order[0]),600);
  await press(button(order[1]),key==='fortress'?550:380);
  await page.screenshot({path:`${out}/${key}.png`});await step(2500);
  const result=await page.evaluate(()=>{const w=coopTest.world,h=w.heroes[0];return {...pairBalanceCapture,mode:w.mode,damage:h.damageDone,projectiles:w.projectiles.filter(p=>!p.hostile).length,fields:w.skillFields.map(f=>({kind:f.kind,echo:!!f.echo,owner:f.owner})),state:JSON.parse(render_game_to_text())};});
  assert.deepEqual(result.casts,order,`${key}: keyboard skill order`);assert.equal(result.bursts,1,`${key}: actual combination triggered once`);assert.ok(result.damage>0);assert.equal(result.mode,'play');assert.ok(result.projectiles<=100);
  fs.writeFileSync(`${out}/${key}-state.json`,JSON.stringify(result,null,2));delete result.state;checks.push({key,...result});console.log('PASS',key,'keyboard order / actual synergy / bounded effects');
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({checks,errors,limits:['Visual fixtures use stationary high-HP enemies; strength comes from the separate live-enemy audit.','Local Chromium; no physical controller/mobile validation.']},null,2));
}finally{await browser.close();}
