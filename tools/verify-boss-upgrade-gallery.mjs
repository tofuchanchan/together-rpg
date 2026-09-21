import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
const out='output/verification/boss-specialist/upgrade',browser=await chromium.launch({headless:true});
try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await p.goto('http://127.0.0.1:4173/'+out+'/index.html');await p.waitForFunction(()=>document.querySelector('video').readyState>=2&&document.querySelector('video').src.startsWith('blob:'));
 await p.locator('[data-seek]').filter({hasText:'合围钟鸣'}).click();await p.waitForFunction(()=>document.querySelector('video').currentTime>8);await p.waitForTimeout(350);await p.locator('video').evaluate(v=>v.pause());await p.selectOption('#speed','0.25');
 const video=await p.locator('video').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,time:v.currentTime,rate:v.playbackRate,ready:v.readyState}));assert.ok(video.width>1000);assert.ok(video.time>8);assert.equal(video.rate,.25);
 await p.screenshot({path:out+'/gallery.png'});await p.locator('video').screenshot({path:out+'/video-scrub.png'});
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:out+'/gallery-mobile.png'});const fit=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);assert.ok(fit);assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/gallery-check.json',JSON.stringify({video,fit,errors},null,2));console.log({video,fit,errors});
}finally{await browser.close();}
