import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
const phase=process.argv[2]||'before',out=`output/verification/boss-specialist/${phase}`;fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),p=await browser.newPage({viewport:{width:1440,height:940}}),errors=[];
p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
try{
 await p.goto('http://127.0.0.1:4173/?adventureTrial=boss');await p.waitForFunction(()=>assetsReady,null,{timeout:60000});await p.evaluate(()=>advanceTime(0));
 const rows=await p.evaluate(async()=>{
  const {frameBossCamera}=await import('/src/coop/boss-camera.js'),{MAP_SCALE}=await import('/src/coop/model.js'),{startMossbellSkill}=await import('/src/coop/mossbell.js'),{bossPose}=await import('/src/coop/adventure-art.js'),rows=[];
  for(const facing of ['left','right'])for(const skill of ['sweep','roots','leap','summon','ultimate','stagger','transition']){
   coopTest.start(['warrior'],1);const w=coopTest.world;w.enemies=[];w.room=10;w.wave=1;w.spawnWave();w.obstacles=[];w.xpNext=1e9;w.effects=[];const h=w.heroes[0],b=w.enemies[0];h.x=facing==='left'?-230:230;h.y=180;h.attackCd=999;h.maxHp=h.hp=9999;h.evasion=0;h.armor=0;b.x=0;b.y=-20;b.cd=999;b.phase=3;w.camera={x:0,y:0,zoom:.8};startMossbellSkill(w,b,skill);frameBossCamera(w,3,MAP_SCALE);
   const duration=b.action.duration,windup=b.action.windup,times=[0,windup*.35,windup*.65,windup-.05,windup,windup+.08,windup+.24,windup+.5,Math.min(duration-.03,windup+1.35),duration+.03],frames=[];
   const strip=document.createElement('canvas');strip.width=1800;strip.height=452;const c=strip.getContext('2d');c.fillStyle='#172e25';c.fillRect(0,0,strip.width,strip.height);
   for(let i=0;i<times.length;i++){const t=Math.max(w.time,times[i]);w.advance(t-w.time);coopTest.render();const cv=coopTest.view.c.canvas;c.drawImage(cv,(i%5)*360,Math.floor(i/5)*226+22,360,202.5);c.font='14px sans-serif';c.fillStyle='#fff0c7';c.fillText(`${skill}/${facing} t=${w.time.toFixed(2)}`,i%5*360+8,Math.floor(i/5)*226+16);frames.push({t:w.time,x:b.x,y:b.y,hp:h.hp,pose:bossPose(b,w.time),face:b.face,warnings:w.bossWarnings.map(a=>({shape:a.shape,hit:a.hit,x:a.x,y:a.y,t:a.t})),effects:w.effects.map(f=>f.type)});if(i===5)rows.push({name:`impact-${skill}-${facing}`,png:cv.toDataURL()});}
   rows.push({name:`motion-${skill}-${facing}`,frames,png:strip.toDataURL()});
  }return rows;
 });
 for(const row of rows){fs.writeFileSync(`${out}/${row.name}.png`,Buffer.from(row.png.split(',')[1],'base64'));delete row.png;}
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/presentation.json`,JSON.stringify({rows,errors,scope:'Native production World and View, locked isolated skill fixtures. Extra hero HP prevents interruption only; recorded damage still applied. 10 time samples per skill, both target sides.'},null,2));console.log(`Captured ${rows.length} native strips/impact frames`);
}finally{await browser.close();}
