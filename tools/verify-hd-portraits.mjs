import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const out='output/verification/hd-portraits';fs.mkdirSync(out,{recursive:true});
const base=process.env.GAME_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true}),checks=[],errors=[];
const mark=s=>{checks.push(s);console.log('PASS',s);};
const state=page=>page.evaluate(()=>JSON.parse(render_game_to_text()));
const newPage=async()=>{const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1.5});page.on('pageerror',e=>errors.push(e.message));return page;};
const setup=async page=>{await page.goto(base);await page.waitForFunction(()=>window.assetsReady===true);await page.locator('#title-start').click();await page.evaluate(async()=>{advanceTime(0);await document.fonts.load('32px "Coop Headings"');});};
const shot=async(page,name)=>{await page.evaluate(()=>{coopTest.render();return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});await page.locator('#game canvas').screenshot({path:`${out}/${name}.png`});};
try{
 const page=await newPage(),httpFailures=[];page.on('response',r=>{if(r.status()>=400)httpFailures.push(r.url());});await setup(page);
 await page.waitForFunction(()=>JSON.parse(render_game_to_text()).heroPortraits.ready);
 for(const role of ['warrior','mage','archer']){
  const dimensions=(await state(page)).heroPortraits.roles.find(r=>r.role===role);assert.equal(dimensions.status,'ready');assert.ok(dimensions.width>=1000&&dimensions.height>=1000);assert.ok(dimensions.source.endsWith(`${role}-hd-detail.png`));
  await page.evaluate(role=>{coopTest.view.roles=[role,role];coopTest.render();},role);await shot(page,role);
 }
 assert.deepEqual(httpFailures,[]);mark('Three native HD portraits decode and display for both player slots without asset errors');
 await page.evaluate(()=>{coopTest.view.roles=['warrior','mage'];});await shot(page,'selection-final');
 const cache=await page.evaluate(async()=>{
  const {drawHeroPortrait}=await import('./src/coop/portraits.js'),c=coopTest.view.c,real=c.drawImage,sources=[];
  c.drawImage=function(...args){sources.push(args[0]);return real.apply(this,args);};
  try{drawHeroPortrait(c,'warrior',0,0,158,164);drawHeroPortrait(c,'warrior',0,0,158,164,true);const old=sources[0];c.save();c.scale(1.1,1.1);drawHeroPortrait(c,'warrior',0,0,158,164);c.restore();return {reused:old===sources[1],resized:old!==sources[2],width:old.width,height:old.height};}finally{c.drawImage=real;}
 });assert.equal(cache.reused,true);assert.equal(cache.resized,true);assert.ok(cache.width>158);mark('High-quality portrait downsample is cached and invalidated only when presentation size changes');
 await page.keyboard.press('Enter');await page.evaluate(()=>advanceTime(0));
 const rendering=await page.evaluate(()=>{const w=coopTest.world,before=JSON.stringify(w.snapshot());for(let i=0;i<4;i++)coopTest.render();return {same:before===JSON.stringify(w.snapshot()),mode:w.mode};});assert.equal(rendering.same,true);assert.equal(rendering.mode,'play');mark('Drawing high-DPI layers does not mutate combat state');await page.close();

 const failed=await newPage();await failed.route('**/assets/portraits/warrior*.png',route=>route.abort());await setup(failed);
 await failed.waitForFunction(()=>JSON.parse(render_game_to_text()).heroPortraits.roles.find(r=>r.role==='warrior').status==='failed');
 await failed.evaluate(()=>{coopTest.view.roles=['warrior','mage'];});await shot(failed,'warrior-fallback');
 const fallback=await failed.evaluate(async()=>{const {drawHeroPortrait}=await import('./src/coop/portraits.js');return drawHeroPortrait(coopTest.view.c,'warrior',0,0,158,164);});assert.equal(fallback,false);
 await failed.keyboard.press('Enter');assert.equal((await state(failed)).mode,'play');mark('A failed portrait falls back to original character art and does not block starting combat');await failed.close();

 const meta=await newPage();await meta.route('**/assets/portraits/manifest.json',route=>route.fulfill({status:404,body:'missing fixture'}));await setup(meta);
 await meta.waitForFunction(()=>JSON.parse(render_game_to_text()).heroPortraits.ready);await shot(meta,'metadata-fallback');mark('Missing optional crop metadata still loads the original HD images');await meta.close();

 const prefix=await newPage(),outside=[];await prefix.route('**/together-rpg/**',async route=>{const url=route.request().url().replace('/together-rpg/','/');const response=await route.fetch({url});await route.fulfill({response});});
 prefix.on('request',request=>{const url=new URL(request.url());if(url.origin===new URL(base).origin&&!url.pathname.startsWith('/together-rpg/'))outside.push(url.pathname);});
 await prefix.goto(new URL('together-rpg/',base).href);await prefix.waitForFunction(()=>window.assetsReady===true&&JSON.parse(render_game_to_text()).heroPortraits.ready);assert.deepEqual(outside,[]);mark('GitHub Pages project-prefix URLs remain correct for portraits, metadata and local fonts');await prefix.close();
 assert.deepEqual(errors,[]);
 fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors,scope:'Browser-native screenshots; staged duplicate roles exercise both preview slots. No physical controller or mobile hardware tested.'},null,2));
}finally{await browser.close();}
