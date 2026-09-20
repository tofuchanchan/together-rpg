import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='output/verification/render-resolution';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),checks=[],samples=[],errors=[];
const base=process.env.GAME_URL||'http://127.0.0.1:4173/';
const mark=text=>{checks.push(text);console.log('PASS',text);};
const read=page=>page.evaluate(()=>JSON.parse(render_game_to_text()));
const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const assertSurface=async page=>{
 const state=await read(page),s=state.renderSurface;
 assert.ok(s,'snapshot exposes presentation geometry');
 const expected=Math.min(2,s.display.width*s.devicePixelRatio/1440,s.display.height*s.devicePixelRatio/810);
 assert.deepEqual(s.logical,{width:1440,height:810});
 assert.ok(Math.abs(s.pixels.width-Math.ceil(1440*expected))<=1);
 assert.ok(Math.abs(s.pixels.height-Math.ceil(810*expected))<=1);
 assert.deepEqual(s.output,s.pixels,'surface and output buffers both match');
 assert.ok(s.pixels.width*s.pixels.height<=1440*810*4);
 assert.equal(s.gameSize.width,1440);assert.equal(s.gameSize.height,810);
 return s;
};
try{
 for(const width of [1440,1920])for(const dpr of [1,1.5,2]){
  const context=await browser.newContext({viewport:{width,height:Math.round(width*9/16)+100},deviceScaleFactor:dpr});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.waitForFunction(()=>window.coopTest&&window.assetsReady);
  await page.locator('#title-start').click();await page.evaluate(()=>advanceTime(0));await settle(page);
  const first=await assertSurface(page);samples.push({width,dpr,first});
  const pixelDifference=await page.evaluate(()=>{const s=coopTest.game.scene.getScenes()[0].surface.canvas,o=coopTest.game.canvas,a=s.getContext('2d').getImageData(0,0,s.width,s.height).data,b=o.getContext('2d').getImageData(0,0,o.width,o.height).data;let different=0;for(let i=0;i<a.length;i+=256)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])different++;return different;});
  assert.equal(pixelDifference,0,'presentation adds no resampling or half-pixel blur');
  // Use the CSS position of a logical hit region, just like an actual mouse.
  const region=await page.evaluate(()=>{const r=coopTest.view.regions.find(r=>r.id==='setup-role-0');const b=coopTest.game.canvas.getBoundingClientRect();return {x:b.left+(r.x+r.w/2)*b.width/1440,y:b.top+(r.y+r.h/2)*b.height/810,role:coopTest.view.roles[0]};});
  await page.mouse.click(region.x,region.y);assert.notEqual(await page.evaluate(()=>coopTest.view.roles[0]),region.role);
  const allocations=first.allocations;await page.waitForTimeout(120);assert.equal((await read(page)).renderSurface.allocations,allocations);
  await page.screenshot({path:`${out}/setup-${width}-dpr-${dpr}.png`});
  await page.keyboard.press('Enter');await page.waitForFunction(()=>coopTest.world.mode==='play');
  await page.evaluate(()=>{advanceTime(0);coopTest.router.blur();});
  const before=(await read(page)).heroes[0];await page.keyboard.down('d');await page.evaluate(()=>advanceTime(300));await page.keyboard.up('d');
  assert.ok((await read(page)).heroes[0].x>before.x+30);await assertSurface(page);
  mark(`${width}px DPR ${dpr}: both buffers, click coordinates and logical movement`);
  if(width===1920&&dpr===1.5){
   await page.evaluate(()=>{coopTest.world.mode='menu';coopTest.view.actions.menu();});
   const state=await read(page);await page.evaluate(()=>coopTest.setRenderScaleForTest(1));await settle(page);
   assert.equal((await read(page)).renderSurface.pixels.width,1440);
   await page.screenshot({path:`${out}/legacy-1x-reference.png`});
   await page.evaluate(()=>coopTest.setRenderScaleForTest(null));await settle(page);await assertSurface(page);
   await page.setViewportSize({width:1100,height:850});await page.waitForTimeout(160);await assertSurface(page);
   const resized=await read(page);assert.deepEqual(resized.heroes,state.heroes);
   await page.evaluate(async()=>{const {startScreen}=await import('./src/coop/start-screen.js?v=0.12.0');startScreen.setWindowFill(true);});await page.waitForTimeout(160);
   const filled=await assertSurface(page);assert.equal((await read(page)).frontend.displayMode,'window-fill');assert.ok(filled.display.width>0);
   await page.locator('#fullscreen').evaluate(node=>node.click());await settle(page);await assertSurface(page);
   await page.keyboard.press('f');await page.waitForFunction(()=>!!document.fullscreenElement);await page.waitForTimeout(160);await assertSurface(page);await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(()=>!document.fullscreenElement);await page.waitForTimeout(180);await assertSurface(page);
   const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setDeviceMetricsOverride',{width:1100,height:850,deviceScaleFactor:2,mobile:false});await page.waitForFunction(()=>devicePixelRatio===2&&JSON.parse(render_game_to_text()).renderSurface.devicePixelRatio===2);
   assert.equal((await read(page)).renderSurface.devicePixelRatio,2);await assertSurface(page);
   mark('resize, window-fill, native fullscreen, DPR change and test-only 1x reference');
  }
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForFunction(()=>window.coopTest&&window.assetsReady);await page.locator('#title-start').click();await settle(page);const small=await assertSurface(page);assert.ok(small.pixels.width<1440);await page.screenshot({path:`${out}/setup-mobile.png`});await context.close();mark('mobile uses only its physical display pixels');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,samples,errors},null,2));
}finally{await browser.close();}
