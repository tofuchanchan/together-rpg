import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='output/cel-warrior';fs.mkdirSync(out,{recursive:true});const base=process.env.GAME_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch(),p=await browser.newPage({viewport:{width:1440,height:1220}}),errors=[],checks=[];
p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const state=()=>p.evaluate(()=>JSON.parse(render_game_to_text()));const mark=s=>{checks.push(s);console.log('PASS',s);};
try{
 await p.goto(new URL('cel-lab.html',base).href);await p.waitForFunction(()=>window.celLab?.state().ready);await p.evaluate(()=>advanceTime(0));assert.equal((await state()).assets.fullBodyCels,32);mark('both directions and 32 painted cels load without errors');
 await p.locator('#clip').selectOption('walk');await p.locator('#pause').click();await p.locator('#timeline').fill('0');await p.locator('#prev').click();assert.equal((await state()).frame,7);await p.locator('#next').click();assert.equal((await state()).frame,0);mark('frame step wraps and slider selects exact poses');
 await p.locator('#speed').selectOption('.25');await p.locator('#pause').click();await p.evaluate(()=>advanceTime(280));assert.equal((await state()).frame,1);await p.locator('#pause').click();const frozen=(await state()).t;await p.evaluate(()=>advanceTime(600));assert.equal((await state()).t,frozen);mark('quarter-speed playback and pause use deterministic time');
 await p.locator('#speed').selectOption('1');for(const clip of ['idle','walk','attack']){await p.locator('#clip').selectOption(clip);await p.locator('#timeline').fill(clip==='attack'?'3':'0');await p.screenshot({path:`${out}/${clip}.png`,fullPage:true});}
 const fidelity=await p.evaluate(async()=>{
  const {drawOriginalCel,drawCelWarrior}=await import('./src/coop/cel-warrior.js'),results=[];
  for(const dir of ['SE','NE']){const cv=document.createElement('canvas');cv.width=cv.height=300;const ctx=cv.getContext('2d',{willReadFrequently:true});const sample=(kind,t=0)=>{ctx.clearRect(0,0,300,300);ctx.save();ctx.translate(150,240);if(kind==='original')drawOriginalCel(ctx,dir,1/.6705927599634632);else drawCelWarrior(ctx,dir,'idle',t,1/.6705927599634632);ctx.restore();return ctx.getImageData(0,0,300,300).data;};
   const original=sample('original'),rest=sample('new'),moving=sample('new',.6);let restDiff=0,protectedDiff=0,motion=0;
   for(let y=0;y<300;y++)for(let x=0;x<300;x++){const n=(y*300+x)*4;if(original.slice(n,n+4).some((v,k)=>v!==rest[n+k]))restDiff++;if(rest.slice(n,n+4).some((v,k)=>v!==moving[n+k])){motion++;let capeNearby=false;for(let yy=Math.max(0,y-5);yy<=Math.min(299,y+5);yy++)for(let xx=Math.max(0,x-5);xx<=Math.min(299,x+5);xx++){const i=(yy*300+xx)*4;if(original[i]>90&&original[i]-original[i+1]>55&&original[i]>original[i+1]*2&&original[i]>original[i+2]*2&&original[i+3]>0)capeNearby=true;}if(!capeNearby)protectedDiff++;}}
   results.push({dir,restDiff,protectedDiff,motion});
  }return results;
 });
 assert.ok(fidelity.every(r=>r.restDiff===0&&r.protectedDiff===0&&r.motion>0),JSON.stringify(fidelity));mark('idle at rest is pixel-identical to original; moving pixels stay within cape region');
 await p.locator('#overlay').check();await p.screenshot({path:`${out}/overlay.png`});assert.equal((await state()).overlay,true);await p.locator('#overlay').uncheck();mark('original overlay toggles independently of animation');
 await p.locator('#cel-canvas').focus();await p.keyboard.down('a');assert.equal((await state()).clip,'walk');await p.keyboard.down('Space');assert.equal((await state()).clip,'attack');await p.keyboard.up('Space');assert.equal((await state()).clip,'walk');await p.keyboard.up('a');assert.equal((await state()).clip,'idle');
 await p.keyboard.down('d');await p.locator('#pause').focus();assert.equal((await state()).clip,'idle');await p.keyboard.up('d');mark('walk, attack override, release and blur restore correct states');
 await p.locator('#cel-canvas').focus();await p.keyboard.press('f');await p.waitForFunction(()=>!!document.fullscreenElement);await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.fullscreenElement);await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));mark('fullscreen opens and exits');
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:`${out}/mobile.png`});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));mark('mobile preview has no horizontal overflow');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors,fidelity,scope:'Visual study, not a full combat replacement; human art approval and physical controller not tested.'},null,2));
}finally{await browser.close();}
