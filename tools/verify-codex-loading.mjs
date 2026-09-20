import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=(process.env.CODEX_BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,''),out=process.env.CODEX_VERIFY_OUT||'output/verification/codex-loading';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),checks=[],errors=[],requests=[];
const mark=label=>{checks.push(label);console.log('PASS',label);};
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
page.on('pageerror',error=>errors.push(error.message));page.on('request',r=>requests.push(r.url()));
const state=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
const ready=()=>page.waitForFunction(()=>document.querySelector('.codex-preview')?.dataset.art==='ready');
try{
 // This reproduces the old all-or-nothing dependency failure. Original combat
 // art is deliberately unavailable, while the codex's own previews may load.
 await page.route('**/assets/**',route=>route.request().url().includes('/assets/codex/')?route.continue():route.abort());
 await page.goto(`${base}/codex.html#role%3Awarrior`,{waitUntil:'domcontentloaded'});await ready();
 assert.equal((await state()).artReady,true);assert.equal((await state()).artFailed,false);
 assert.equal(requests.filter(url=>url.includes('/assets/')&&!url.includes('/assets/codex/')).length,0);
 mark('mobile warrior renders with all original combat atlases unavailable');
 assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:`${out}/mobile-warrior.png`});mark('390px HiDPI detail has no runtime canvas or horizontal overflow');

 let failing=true;
 await page.route('**/assets/codex/hero-warrior-*.webp*',route=>failing?route.abort():route.continue());
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('.codex-preview')?.dataset.art==='error');
 assert.equal((await state()).artReady,false);assert.equal(await page.evaluate(()=>window.assetsReady),false);
 const retry=page.locator('.codex-preview .codex-image-retry');assert.equal(await retry.isVisible(),true);const box=await retry.boundingBox();assert.ok(box.y+box.height<844);
 await page.screenshot({path:`${out}/mobile-error.png`});mark('failed image shows a retry beside the artwork and is never reported as ready');
 await page.locator('[data-category="monsters"]').click();await page.locator('.codex-card').first().click();await ready();assert.equal((await state()).category,'monsters');
 mark('one failed hero image does not block monster previews or navigation');
 await page.locator('[data-category="skills"]').click();await page.locator('.codex-card[data-entry="role:warrior"]').click();await page.waitForFunction(()=>document.querySelector('.codex-preview')?.dataset.art==='error');
 failing=false;await retry.click();await ready();await page.waitForFunction(()=>!codexTest.snapshot().artFailed);
 assert.equal(await page.evaluate(()=>window.assetsReady),true);await page.screenshot({path:`${out}/mobile-recovered.png`});mark('retry recovers the detail and duplicate failed thumbnail without reloading the page');
 await page.unroute('**/assets/codex/hero-warrior-*.webp*');

 let release;const gate=new Promise(resolve=>{release=resolve;});
 await page.route('**/assets/codex/hero-warrior-*.webp*',async route=>{await gate;await route.continue().catch(()=>{});});
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('.codex-preview .codex-image-status').textContent(),'插画载入中…');
 assert.equal(await page.evaluate(()=>window.assetsReady),false);
 await page.locator('.codex-related-link').first().click();await ready();const selected=(await state()).selectedId;assert.notEqual(selected,'role:warrior');
 release();await page.unroute('**/assets/codex/hero-warrior-*.webp*');assert.equal((await state()).selectedId,selected);
 mark('slow image has an inline loading state; switching entry stays responsive');

 const images=await page.evaluate(async()=>{
  const [{CODEX_ENTRIES},{codexImageUrl}]=await Promise.all([import('./src/coop/codex-data.js'),import('./src/coop/codex-image.js')]),results=[];
  const c=document.createElement('canvas');c.width=320;c.height=190;const ctx=c.getContext('2d',{willReadFrequently:true});
  for(const entry of CODEX_ENTRIES){const image=new Image();image.src=codexImageUrl(entry);await image.decode();ctx.clearRect(0,0,320,190);ctx.drawImage(image,0,0,320,190);const data=ctx.getImageData(0,0,320,190).data;let foreground=0;for(let i=0;i<data.length;i+=4){const low=Math.min(data[i],data[i+1],data[i+2]),high=Math.max(data[i],data[i+1],data[i+2]);if(low<160||high-low>60)foreground++;}results.push({id:entry.id,width:image.naturalWidth,height:image.naturalHeight,foreground});}
  return results;
 });
 assert.equal(images.length,159);for(const image of images){assert.equal(image.width,640,image.id);assert.equal(image.height,380,image.id);assert.ok(image.foreground>20,`${image.id}: actual artwork, not just a background gradient`);}
 mark('all 159 entries decode and contain visible original-art silhouettes');
 await page.setViewportSize({width:1440,height:980});await page.goto(`${base}/codex.html#role%3Awarrior`);await ready();await page.screenshot({path:`${out}/desktop.png`});
 const resources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/')).map(r=>({url:r.name,bytes:r.encodedBodySize})));
 assert.ok(resources.every(r=>r.url.includes('/assets/codex/')));assert.deepEqual(errors,[]);mark('desktop catalogue uses only independent lightweight previews, with no script errors');
 fs.writeFileSync(`${out}/loading.json`,JSON.stringify({base,checks,images,errors,resources},null,2)+'\n');
}catch(error){await page.screenshot({path:`${out}/failure.png`,timeout:10000}).catch(()=>{});fs.writeFileSync(`${out}/loading-failure.json`,JSON.stringify({checks,errors,error:String(error)},null,2));throw error;}finally{await browser.close();}
