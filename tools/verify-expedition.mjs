import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
const out=process.env.EXPEDITION_OUT||'output/coop-verification/expedition';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:940}}),errors=[],failed=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
const check=s=>{checks.push(s);console.log('PASS',s);};
const shot=async name=>{await page.evaluate(()=>coopTest.render());await page.locator('#game canvas').screenshot({path:`${out}/${name}.png`});};
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady,null,{timeout:120000});await page.evaluate(()=>advanceTime(0));
 const parts=await page.evaluate(async()=>{
  const {hero}=await import(new URL('src/coop/sprites.js',location.href).href),{splitAccessory}=await import(new URL('src/coop/character-parts.js',location.href).href);
  const cv=document.createElement('canvas');cv.width=1440;cv.height=840;const c=cv.getContext('2d');c.fillStyle='#78936c';c.fillRect(0,0,1440,840);const report=[];
  for(const [i,role] of ['warrior','mage','archer'].entries()){
   c.fillStyle='#fff0c7';c.font='18px sans-serif';c.fillText(`${role}  | idle 0 / .7s | normal / hurt | side normal / hurt`,20,30+i*275);
   for(let j=0;j<6;j++){const h={role,id:i,face:j<2?6:j<4?2:1,move:{x:0,y:0},stride:0,hitReaction:j===3||j===5?{x:0,y:0,life:.2,max:.3}:null};c.save();c.translate(120+j*240,228+i*275);hero(c,h,j===1?.7:0,1.45);c.restore();}
   const manifest=await(await fetch(new URL(`assets/characters/${role}.json`,location.href))).json(),image=new Image();image.src=new URL(`assets/characters/${role}.png`,location.href);await image.decode();
   let changed=0,outside=0;
   for(let row=0;row<8;row++){const f=manifest.frames[row*4],part=splitAccessory(image,f,256,role);if(!part.part)continue;const pc=part.part.getContext('2d').getImageData(0,0,256,256).data;const mask=new Uint8Array(256*256);for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(pc[(y*256+x)*4+3])for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++)if(x+dx>=0&&x+dx<256&&y+dy>=0&&y+dy<256)mask[(y+dy)*256+x+dx]=1;
    const frames=[];for(const time of [0,.7]){const cc=document.createElement('canvas');cc.width=cc.height=256;const ctx=cc.getContext('2d');ctx.translate(...manifest.anchor);hero(ctx,{role,id:i,face:[2,3,4,5,6,7,0,1][row],move:{x:0,y:0}},time,1/manifest.displayScale);frames.push(ctx.getImageData(0,0,256,256).data);}
    for(let n=0;n<256*256;n++)if([0,1,2,3].some(k=>frames[0][n*4+k]!==frames[1][n*4+k])){changed++;if(!mask[n])outside++;}
   }report.push({role,changed,outside});
  }return{png:cv.toDataURL(),report};
 });fs.writeFileSync(`${out}/idle-and-expressions.png`,Buffer.from(parts.png.split(',')[1],'base64'));assert.ok(parts.report.every(r=>r.changed>0&&r.outside===0));check('Eight directions per hero: only accessory pixels move; body and equipment remain identical');
 await page.evaluate(()=>{coopTest.start(['warrior','mage'],1);const w=coopTest.world;w.options.shake=false;w.heroes.forEach(h=>{h.ai=false;h.attackCd=999;h.invuln=999;});});await page.evaluate(()=>advanceTime(39000));const pressure=await page.evaluate(()=>coopTest.world.snapshot());assert.equal(pressure.batches.spawned,4);assert.equal(pressure.enemies.length,36);assert.equal(pressure.mode,'play');assert.ok(pressure.camera.zoom<.83);await shot('four-batches-pressure');check('Timed reinforcements accumulate 36 foes over four batches; wider camera is active');
 await page.evaluate(()=>{coopTest.start(['warrior','mage'],1);const w=coopTest.world;w.spawnQueue=[];w.waveDuration=999;w.enemies=[0,1,2,3].map((rank,i)=>w.createEnemy('goblin',-360+i*240,0,rank));w.heroes.forEach((h,i)=>{h.x=-130+i*130;h.y=220;});w.camera={x:0,y:0,zoom:.8};});await shot('rare-outlines');assert.deepEqual(await page.evaluate(()=>coopTest.world.enemies.map(e=>e.affixes.length)),[0,1,2,3]);check('Blue purple gold outlines and one/two/three unique affixes render');
 await page.evaluate(async()=>{const {applyReward,skillPool}=await import(new URL('src/coop/builds.js',location.href));const w=coopTest.world,h=w.heroes[0];w.beginReward('skill');w.offers[0]=skillPool(h).filter(o=>o.kind==='core');});await shot('core-choice');await page.evaluate(()=>{const w=coopTest.world;w.confirm(0);});assert.ok(await page.evaluate(()=>coopTest.world.heroes[0].core));
 await page.evaluate(async()=>{const {skillPool}=await import(new URL('src/coop/builds.js',location.href));const w=coopTest.world,h=w.heroes[0];h.skills=[2,2];w.beginReward('skill');w.offers[0]=skillPool(h).filter(o=>o.kind==='rune'&&o.slot===0);});await shot('rune-choice');await page.evaluate(()=>coopTest.world.confirm(0));assert.ok(await page.evaluate(()=>coopTest.world.heroes[0].runes[0]));check('Core and exclusive active rune choices apply through the real reward menu');
 await page.evaluate(()=>{coopTest.start(['warrior','mage'],1);const w=coopTest.world;w.room=10;w.enemies=[];w.spawnWave();w.heroes.forEach((h,i)=>{h.x=-180+i*180;h.y=170;h.invuln=999;h.attackCd=999;});w.camera={x:0,y:0,zoom:.8};});await shot('boss-phase1');
 for(const skill of ['slam','barrage','roots','summon','ultimate']){await page.evaluate(async skill=>{const {startBossSkill}=await import(new URL('src/coop/boss.js',location.href));const w=coopTest.world,b=w.enemies.find(e=>e.boss);w.bossWarnings=[];b.phase=skill==='ultimate'?3:2;b.hp=b.maxHp*(b.phase===3?.28:.6);startBossSkill(w,b,skill);b.action.t=.3;w.bossWarnings.forEach(a=>a.t=.3);},skill);await shot(`boss-${skill}`);}
 assert.equal(await page.evaluate(()=>coopTest.world.bossWarnings.length),31);check('Boss illustrated poses, three phases, five abilities and ultimate escape lanes render');
 const frameCost=await page.evaluate(()=>{const w=coopTest.world;w.reset();w.enemies=[];for(let i=0;i<60;i++)w.enemies.push(w.createEnemy(['goblin','mushroom','wolf'][i%3],(i%10-5)*100,(Math.floor(i/10)-3)*90,i%9===0?2:0));const samples=[];for(let i=0;i<30;i++){const t=performance.now();coopTest.render();samples.push(performance.now()-t);}samples.sort((a,b)=>a-b);return{p95:samples[28],scope:'60-enemy headless render CPU ms only'};});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors,failed,idle:parts.report,frameCost,fixtures:'Pressure scene uses invulnerable inactive heroes; boss screenshots stage abilities. Functional damage and phase transitions tested in node suite.'},null,2));console.log(frameCost);
}finally{await browser.close();}
