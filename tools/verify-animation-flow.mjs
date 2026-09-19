import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
const out='output/coop-verification/animation-flow';fs.mkdirSync(out,{recursive:true});
const baseline=path=>execFileSync('git',['-c','safe.directory=D:/project-gamedemo/together-rpg','show',`88cf332:${path}`],{encoding:'utf8'});
const oldPose=baseline('src/coop/sprite-animation.js'),oldSprite=baseline('src/coop/sprites.js');
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:940}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady);await page.evaluate(()=>advanceTime(0));
 const report=await page.evaluate(async({oldPose,oldSprite})=>{
  const url=p=>new URL(p,location.href).href,encode=s=>'data:text/javascript;base64,'+btoa(unescape(encodeURIComponent(s)));
  const poseUrl=encode(oldPose.replace("'./combat-motion.js'",JSON.stringify(url('src/coop/combat-motion.js'))));
  const source=oldSprite.replace("'./sprite-animation.js'",JSON.stringify(poseUrl)).replace("'./character-parts.js'",JSON.stringify(url('src/coop/character-parts.js'))).replaceAll('import.meta.url',JSON.stringify(url('src/coop/sprites.js')));
  const old=await import(encode(source)),now=await import(url('src/coop/sprites.js')),{actionTiming}=await import(url('src/coop/combat-motion.js'));await old.loadCharacterSprites();
  const cv=document.createElement('canvas');cv.width=cv.height=160;const ctx=cv.getContext('2d',{willReadFrequently:true});
  const sample=(draw,h,t)=>{ctx.clearRect(0,0,160,160);ctx.save();ctx.translate(80,140);draw(ctx,h,t);ctx.restore();return ctx.getImageData(0,0,160,160).data;};
  const metrics=[];
  for(const role of ['warrior','mage','archer'])for(let face=0;face<8;face++){
   const delta={old:[],now:[]};for(const [name,draw,strideSpeed]of [['old',old.hero,175/62],['now',now.hero,175/92]]){let previous;for(let i=0;i<60;i++){const t=i/60,data=sample(draw,{id:0,role,face,move:{x:1,y:0},gait:1,stride:t*strideSpeed},t);if(previous){let d=0;for(let n=0;n<data.length;n++)d+=Math.abs(data[n]-previous[n]);delta[name].push(d/data.length);}previous=data;}}
   metrics.push({role,face,oldPeak:Math.max(...delta.old),newPeak:Math.max(...delta.now),oldHolds:delta.old.filter(d=>d<.01).length,newHolds:delta.now.filter(d=>d<.01).length});
  }
  const sheet=(attack=false)=>{const c=document.createElement('canvas');c.width=1440;c.height=attack?690:1260;const g=c.getContext('2d');g.fillStyle='#7b9569';g.fillRect(0,0,c.width,c.height);for(const [row,role]of ['warrior','mage','archer'].entries()){
   for(let variant=0;variant<(attack?1:2);variant++){const y=row*(attack?230:420)+variant*210;g.fillStyle='#fff3c4';g.font='18px sans-serif';g.fillText(`${role} / ${attack?'new moving attack':variant?'new continuous walk':'old hard cuts'}`,20,y+25);for(let i=0;i<8;i++){const t=i/8,timing=actionTiming(role,'attack'),draw=attack||variant?now.hero:old.hero;g.save();g.translate(90+i*180,y+183);draw(g,{id:row,role,face:1,move:{x:1,y:0},gait:1,stride:t,action:attack?{type:'attack',t:t*timing.duration,...timing,dir:{x:1,y:1}}:null},t,1.15);g.restore();}}
  }return c.toDataURL();};
  const dirs=document.createElement('canvas');dirs.width=1600;dirs.height=660;const c=dirs.getContext('2d');c.fillStyle='#78936c';c.fillRect(0,0,1600,660);
  for(const[i,role]of ['warrior','mage','archer'].entries())for(let face=0;face<8;face++){c.save();c.translate(face*200+100,i*220+175);const timing=actionTiming(role,'attack');now.hero(c,{role,id:i,face,move:{x:1,y:0},stride:.2,action:{type:'attack',...timing,t:timing.windup}},0,1.2);c.restore();c.fillStyle='#fff0c7';c.font='15px sans-serif';c.fillText(role+' / '+face,face*200+35,i*220+205);}
  return{metrics,walk:sheet(),attack:sheet(true),directions:dirs.toDataURL()};
 },{oldPose,oldSprite});
 for(const name of ['walk','attack','directions'])fs.writeFileSync(`${out}/${name}-filmstrip.png`,Buffer.from(report[name].split(',')[1],'base64'));
 const ratios=report.metrics.map(m=>m.newPeak/m.oldPeak);assert.ok(ratios.every(r=>r<.85),JSON.stringify(report.metrics));
 console.log('PASS 24 role/direction walks: peak per-frame pixel discontinuity reduced',Math.max(...ratios));
 await page.evaluate(()=>{coopTest.start(['warrior','mage'],1);const w=coopTest.world;w.enemies=[];w.spawnQueue=[];w.waveDuration=999;w.obstacles=[];w.options.shake=false;w.heroes.forEach(h=>{h.ai=false;h.attackCd=999;});});
 await page.keyboard.down('d');await page.evaluate(()=>advanceTime(220));assert.ok(await page.evaluate(()=>coopTest.world.heroes[0].gait>.9));
 await page.keyboard.up('d');await page.evaluate(()=>advanceTime(17));assert.ok(await page.evaluate(()=>coopTest.world.heroes[0].gait>0));await page.evaluate(()=>advanceTime(500));assert.equal(await page.evaluate(()=>coopTest.world.heroes[0].gait),0);
 console.log('PASS real input: moving starts immediately, gait eases in and settles on release');
 await page.evaluate(()=>{const w=coopTest.world,h=w.heroes[0];h.attackCd=0;h.x=h.y=0;const e=w.createEnemy('mushroom',100,0);e.hp=e.maxHp=999;e.freeze=99;w.enemies=[e];});
 await page.keyboard.down('d');await page.evaluate(()=>advanceTime(150));await page.screenshot({path:`${out}/moving-hit.png`});assert.ok(await page.evaluate(()=>coopTest.world.heroes[0].damageDone>0));await page.keyboard.up('d');
 console.log('PASS moving attack still hits at the actual contact time');
 await page.goto('http://127.0.0.1:4173/bean-lab.html');await page.waitForFunction(()=>window.beanLab?.ready);await page.selectOption('#clip','run-attack');await page.click('#pause');await page.locator('#timeline').fill('0');await page.click('#next');assert.equal(await page.locator('#frame').textContent(),'2 / 60');await page.screenshot({path:`${out}/lab.png`});
 console.log('PASS eight-direction lab uses continuous playback and 60-step inspection');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks:4,errors,metrics:report.metrics,maxPeakRatio:Math.max(...ratios),note:'Pixel changes measure hard-cut severity, not subjective animation quality or display FPS. Filmstrips require visual review.'},null,2));
}finally{await browser.close();}
