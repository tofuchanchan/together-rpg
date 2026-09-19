import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='output/cel-warrior/companions';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),p=await browser.newPage({viewport:{width:1440,height:1220},recordVideo:{dir:out,size:{width:1200,height:1000}}}),errors=[],checks=[];
p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const mark=s=>{checks.push(s);console.log('PASS',s);};
try{
 await p.goto(new URL('cel-lab.html',process.env.GAME_URL||'http://127.0.0.1:4173/').href);await p.waitForFunction(()=>window.celLab?.state().ready);
 for(const role of ['mage','archer']){
  await p.locator('#role').selectOption(role);await p.evaluate(()=>advanceTime(0));assert.equal(await p.evaluate(()=>celLab.state().assets.fullBodyCels),32);
  for(const clip of ['walk','attack']){await p.locator('#clip').selectOption(clip);for(let i=0;i<8;i++){await p.locator('#timeline').fill(String(i));assert.equal(await p.evaluate(()=>celLab.state().frame),i);}await p.locator('#timeline').fill(clip==='attack'?'3':'0');await p.screenshot({path:`${out}/${role}-${clip}.png`,fullPage:true});}
  mark(`${role}: 32 cels load, both clips expose all8 frames`);
  const fidelity=await p.evaluate(async role=>{
   const {drawOriginalCompanion,drawCelCompanion}=await import('./src/coop/cel-companions.js'),{splitAccessory}=await import('./src/coop/character-parts.js'),report=[];
   const {displayScale}=await(await fetch(`assets/characters/${role}.json`)).json();for(const dir of ['SE','NE']){const im=new Image();im.src=`assets/characters/cel/${role}/source/idle-${dir}.png`;await im.decode();const part=splitAccessory(im,{x:0,y:0},256,role),mask=new Uint8Array(256*256),pd=part.part.getContext('2d').getImageData(0,0,256,256).data;
    for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(pd[(y*256+x)*4+3])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)if(x+dx>=0&&x+dx<256&&y+dy>=0&&y+dy<256)mask[(y+dy)*256+x+dx]=1;
    const cv=document.createElement('canvas');cv.width=cv.height=256;const c=cv.getContext('2d',{willReadFrequently:true});const sample=(original,t)=>{c.clearRect(0,0,256,256);c.save();c.translate(128,210);if(original)drawOriginalCompanion(c,role,dir,1/displayScale);else drawCelCompanion(c,role,dir,'idle',t,1/displayScale);c.restore();return c.getImageData(0,0,256,256).data;};const original=sample(true,0),rest=sample(false,0),moving=sample(false,.6);let restDiff=0,outside=0,motion=0;
    for(let n=0;n<256*256;n++){if([0,1,2,3].some(k=>original[n*4+k]!==rest[n*4+k]))restDiff++;if([0,1,2,3].some(k=>rest[n*4+k]!==moving[n*4+k])){motion++;if(!mask[n])outside++;}}report.push({dir,restDiff,outside,motion});
   }return report;
  },role);assert.ok(fidelity.every(r=>r.restDiff===0&&r.outside===0&&r.motion>0),JSON.stringify(fidelity));mark(`${role}: idle matches original pixels; only accessory region moves`);
  await p.locator('#overlay').check();await p.screenshot({path:`${out}/${role}-overlay.png`});await p.locator('#overlay').uncheck();await p.locator('#speed').selectOption('.25');await p.locator('#pause').click();await p.locator('#cel-canvas').focus();await p.keyboard.down('a');await p.evaluate(()=>advanceTime(280));assert.equal(await p.evaluate(()=>celLab.state().frame),1);await p.keyboard.down('Space');assert.equal(await p.evaluate(()=>celLab.state().clip),'attack');await p.keyboard.up('Space');await p.keyboard.up('a');assert.equal(await p.evaluate(()=>celLab.state().clip),'idle');mark(`${role}: slow playback, overlay and keyboard transitions`);
 }
 await p.setViewportSize({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));mark('three-role toolbar fits mobile width');assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors},null,2));
}finally{await p.close();await browser.close();}
