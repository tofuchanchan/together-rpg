import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';
const phase=process.argv[2]||'after',out=`output/verification/skill-quality/${phase}`;fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-gpu']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
try{
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady);await page.locator('#title-start').click();
 const rows=await page.evaluate(async()=>{
  const {SKILL_PAIRS}=await import('./src/coop/skill-pairs.js'),{applyReward}=await import('./src/coop/builds.js'),{hero}=await import('./src/coop/sprites.js'),{spritePose}=await import('./src/coop/sprite-animation.js'),{equipmentPose}=await import('./src/coop/equipment-art.js'),{rollEquipment,applyEquipment}=await import('./src/coop/equipment.js');
  const rows=[];
  for(const [key,pair] of Object.entries(SKILL_PAIRS))for(const gear of [false,true])for(const slot of pair.slots){
   const w=coopTest.world;w.reset([pair.role],1);w.enemies=[];w.pressure=null;w.obstacles=[];w.waveDuration=999;const h=w.heroes[0];h.x=h.y=0;h.attackCd=999;
   for(const s of pair.slots){for(let i=0;i<3;i++)applyReward(h,`active:${s}`);}for(const s of pair.slots)applyReward(h,`advance:${s}`);
   if(gear)for(const s of ['weapon','armor'])applyEquipment(h,rollEquipment(pair.role,s,10,()=>.5,s));
   w.request(h,h.loadout.indexOf(slot)?'skill2':'skill1',{x:1,y:0});const duration=h.action.duration,frames=[],cv=document.createElement('canvas');cv.width=1440;cv.height=220;const c=cv.getContext('2d');c.fillStyle='#203a2e';c.fillRect(0,0,1440,220);c.font='15px sans-serif';c.fillStyle='#f7ecd2';c.fillText(`${key} / ${slot} / ${gear?'equipped':'original'} / ${duration.toFixed(2)}s`,10,18);
   for(let i=0;i<10;i++){if(i)w.advance(duration/9);c.save();c.translate(i*144+72,182);hero(c,h,w.time,1.05);c.restore();const p=gear?equipmentPose(h,w.time):spritePose(h,w.time);frames.push({time:w.time,row:p.row,x:p.x,y:p.y,rotation:p.rotation,sx:p.sx??1,sy:p.sy??1});}
   rows.push({key,slot,gear,frames,png:cv.toDataURL()});
  }return rows;
 });
 for(const r of rows){fs.writeFileSync(`${out}/${r.key}-${r.slot}-${r.gear?'gear':'base'}.png`,Buffer.from(r.png.split(',')[1],'base64'));delete r.png;}
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/motion.json',JSON.stringify({rows,errors},null,2));console.log(`Captured ${rows.length} native sprite strips (${phase})`);
}finally{await browser.close();}
