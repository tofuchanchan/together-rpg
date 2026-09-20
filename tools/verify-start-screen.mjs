import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GAME_URL||'http://127.0.0.1:4173',out='output/verification/start-screen';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),checks=[],errors=[];
const mark=message=>{checks.push(message);console.log('PASS',message);};
const makePage=async(options={})=>{const context=await browser.newContext({viewport:{width:1440,height:900},...options});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));return page;};
const screen=(page,name)=>page.waitForFunction(name=>document.body.dataset.screen===name,name);
const state=page=>page.evaluate(()=>JSON.parse(render_game_to_text()));
const shot=(page,name)=>page.screenshot({path:`${out}/${name}.png`});
const ready=page=>page.waitForFunction(()=>window.assetsReady===true,null,{timeout:60000});
try{
 const p=await makePage();await p.goto(base);await screen(p,'title');await ready(p);await shot(p,'title-desktop');
 assert.equal(await p.locator('.title-choice').count(),3);assert.equal((await state(p)).mode,'menu');
 const time=(await state(p)).time;await p.evaluate(()=>advanceTime(1000));assert.equal((await state(p)).time,time);mark('Title renders with three live menu entries; hidden game does not advance');
 await p.keyboard.press('ArrowDown');assert.equal(await p.evaluate(()=>document.activeElement.id),'title-codex');await p.keyboard.press('ArrowDown');await p.keyboard.press('Enter');await screen(p,'settings');
 await p.locator('input[name=sound]').uncheck();await p.locator('input[name=shake]').uncheck();await p.locator('input[name=feedback]').uncheck();await shot(p,'settings');
 await p.keyboard.press('i');assert.equal((await state(p)).codex.open,false);await p.keyboard.press('Escape');await screen(p,'title');await p.reload();await screen(p,'title');await ready(p);
 assert.deepEqual((await state(p)).frontend.settings,{sound:false,feedback:false,shake:false});mark('Settings support keyboard, persist across reload, and block in-game hotkeys');
 await p.keyboard.down('Enter');await screen(p,'setup');await p.evaluate(()=>advanceTime(250));assert.equal((await state(p)).mode,'menu');await p.keyboard.up('Enter');await shot(p,'setup');
 await p.locator('#back-title').click();await screen(p,'title');await p.locator('#title-start').click();await screen(p,'setup');await p.keyboard.press('Enter');await screen(p,'game');
 assert.equal((await state(p)).mode,'play');assert.deepEqual(await p.evaluate(()=>coopTest.world.options),{sound:false,feedback:false,shake:false});mark('Title → setup → combat is separate; held Enter does not skip setup; settings survive world reset');
 await p.locator('#open-codex').click();assert.equal((await state(p)).mode,'paused');await p.keyboard.press('Escape');await p.waitForFunction(()=>coopTest.world.mode==='play');assert.equal((await state(p)).mode,'play');mark('In-game codex still owns and releases its pause');
 await p.evaluate(()=>{coopTest.world.mode='defeat';coopTest.render();coopTest.view.actions.menu();});await screen(p,'setup');await p.locator('#back-title').click();await p.locator('#title-codex').click();await p.waitForURL('**/codex.html');await ready(p);assert.equal((await state(p)).page,'codex');mark('Return-to-title and standalone archive navigation work');
 await p.goto(base);await screen(p,'title');await p.setViewportSize({width:390,height:844});await shot(p,'title-mobile');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 for(const box of await p.locator('.title-choice').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {bottom:r.bottom,left:r.left,right:r.right,height:r.height};}))){assert.ok(box.height>=44&&box.left>=0&&box.right<=390&&box.bottom<=844);}
 await p.locator('#title-settings-open').click();await shot(p,'settings-mobile');await p.keyboard.press('Escape');
 await p.setViewportSize({width:2560,height:1080});await shot(p,'title-ultrawide');assert.ok(await p.locator('.title-stage').evaluate(n=>Math.abs(n.clientWidth/n.clientHeight-16/9)<.01));mark('Portrait has touch-sized menu; ultrawide retains full composition without overflow');
 await p.context().close();

 const slow=await makePage();let release;const gate=new Promise(resolve=>{release=resolve;});
 await slow.route('**/assets/world/manifest.json',async route=>{await gate;await route.continue();});await slow.goto(base,{waitUntil:'domcontentloaded'});await screen(slow,'title');assert.equal((await state(slow)).assetsReady,false);
 await slow.locator('#title-start').click();await screen(slow,'loading');assert.equal(await slow.locator('#loading-screen').innerText(),'');
 const frame=async(ms,name)=>{await slow.locator('.loading-monster').evaluate((n,ms)=>{const a=n.getAnimations()[0];a.pause();a.currentTime=ms;},ms);await shot(slow,name);return slow.locator('.loading-monster').evaluate(n=>getComputedStyle(n).backgroundPosition);};
 const f1=await frame(0,'loading-step-1'),f2=await frame(400,'loading-step-5');assert.notEqual(f1,f2);assert.notDeepEqual(fs.readFileSync(`${out}/loading-step-1.png`),fs.readFileSync(`${out}/loading-step-5.png`));
 await slow.keyboard.press('Escape');await screen(slow,'title');await slow.locator('#title-start').click();await slow.evaluate(async()=>{const {startScreen}=await import('./src/coop/start-screen.js?v=0.10.1');startScreen.failGame(new Error('simulated resource timeout'));});await screen(slow,'error');release();await ready(slow);await screen(slow,'setup');assert.equal((await state(slow)).mode,'menu');mark('Slow network: title stays usable, loading shows only an animated monster, then opens setup even after a timeout notice; Escape cancels waiting');
 await slow.context().close();

 for(const asset of ['assets/world/manifest.json','assets/frontend/title-background.png','assets/vendor/phaser.min.js']){
  const p=await makePage();await p.route(`**/${asset}`,route=>route.abort());await p.goto(base,{waitUntil:'domcontentloaded'});
  if(!asset.includes('title-background')){await screen(p,'title');await p.locator('#title-start').click();}
  await screen(p,'error');assert.equal(await p.locator('#retry-loading').isVisible(),true);assert.equal(await p.locator('.loading-monster').isVisible(),false);assert.equal((await state(p)).assetsReady,false);await shot(p,asset.includes('title-background')?'error-cover':'error-resources');
  if(!asset.includes('title-background')){await p.locator('#loading-back').click();await screen(p,'title');await p.locator('#title-start').click();await screen(p,'error');}
  await p.unroute(`**/${asset}`);await p.locator('#retry-loading').click();await screen(p,'title');await ready(p);await p.context().close();
 }
 mark('Failed cover, engine, or game assets produce retry UI and recover; failed combat assets do not block the archive/title');

 const lateArt=await makePage();let releaseArt;const artGate=new Promise(resolve=>{releaseArt=resolve;});await lateArt.route('**/assets/frontend/title-background.png',async route=>{await artGate;await route.continue();});await lateArt.goto(base,{waitUntil:'domcontentloaded'});await lateArt.waitForFunction(()=>typeof window.render_game_to_text==='function');await lateArt.evaluate(async()=>{const {startScreen}=await import('./src/coop/start-screen.js?v=0.10.1');startScreen.artError=new Error('simulated cover timeout');startScreen.showError('art');});await screen(lateArt,'error');releaseArt();await screen(lateArt,'title');assert.equal((await state(lateArt)).frontend.artReady,true);await lateArt.context().close();mark('Cover arriving after a timeout notice automatically recovers the title without a reload');

 const lateEngine=await makePage();let releaseEngine;const engineGate=new Promise(resolve=>{releaseEngine=resolve;});await lateEngine.route('**/assets/vendor/phaser.min.js',async route=>{await engineGate;await route.continue();});await lateEngine.goto(base,{waitUntil:'domcontentloaded'});await screen(lateEngine,'title');await lateEngine.locator('#title-start').click();await lateEngine.evaluate(async()=>{const {startScreen}=await import('./src/coop/start-screen.js?v=0.10.1');startScreen.failGame(new Error('simulated engine timeout'));});await screen(lateEngine,'error');releaseEngine();await ready(lateEngine);await screen(lateEngine,'setup');await lateEngine.context().close();mark('Late engine load recovers setup after a timeout notice without reloading');

 const pad=await makePage();await pad.addInitScript(()=>{window.frontendPads=[];Object.defineProperty(navigator,'getGamepads',{value:()=>window.frontendPads});});await pad.goto(base);await ready(pad);await screen(pad,'title');
 const pads=buttons=>pad.evaluate(buttons=>{window.frontendPads=[{index:0,axes:[0,0],mapping:'standard',buttons:Array.from({length:17},(_,i)=>({pressed:buttons.includes(i)}))}];},buttons);
 await pads([13]);await pad.waitForFunction(()=>document.activeElement.id==='title-codex');await pads([]);await pad.waitForTimeout(40);await pads([13]);await pad.waitForFunction(()=>document.activeElement.id==='title-settings-open');await pads([]);await pad.waitForTimeout(40);await pads([0]);await screen(pad,'settings');await pads([]);await pad.waitForTimeout(40);await pads([1]);await screen(pad,'title');
 await pads([]);await pad.waitForTimeout(40);await pad.locator('#title-start').focus();await pads([0]);await screen(pad,'setup');await pad.waitForTimeout(200);assert.equal((await state(pad)).mode,'menu');mark('Simulated controller navigates title/settings; held A cannot skip setup');await pad.context().close();

 const trial=await makePage();await trial.goto(`${base}/?trial=bulwark`);await ready(trial);await screen(trial,'game');assert.equal((await state(trial)).heroes[0].role,'warrior');await trial.goto(`${base}/?shopTrial=mage`);await ready(trial);await screen(trial,'game');assert.equal((await state(trial)).mode,'shop');mark('Build and shop trial deep links bypass title and preserve their original entry behavior');
 await trial.goto(base);await screen(trial,'title');await ready(trial);await trial.locator('#title-start').click();await screen(trial,'setup');
 const canvasClick=async(x,y)=>{const box=await trial.locator('#game canvas').boundingBox();await trial.mouse.click(box.x+x/1440*box.width,box.y+y/810*box.height);};
 await canvasClick(590,217);await canvasClick(495,430);const selected=await trial.evaluate(()=>coopTest.view.roles[0]);await canvasClick(720,620);await screen(trial,'game');assert.equal((await state(trial)).humanCount,1);assert.equal((await state(trial)).heroes[0].role,selected);assert.equal((await state(trial)).heroes.length,1);mark('Actual canvas controls select a different class and start a solo run without a free AI');
 const timeout=await trial.evaluate(async()=>{const {withTimeout}=await import('./src/coop/start-screen.js?v=0.10.1');try{await withTimeout(new Promise(()=>{}),5,'timed out');}catch(e){return e.message;}});assert.equal(timeout,'timed out');await trial.context().close();mark('Hung-resource timeout helper rejects instead of waiting indefinitely');
 const reduced=await makePage({reducedMotion:'reduce'});await reduced.goto(base);assert.equal(await reduced.locator('.loading-monster').evaluate(n=>getComputedStyle(n).animationName),'none');await reduced.context().close();mark('Reduced-motion preference disables the loading loop');
 const prefixed=await makePage(),outside=[];
 await prefixed.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==new URL(base).origin)return route.continue();if(!url.pathname.startsWith('/together-rpg/')){outside.push(url.pathname);return route.abort();}const response=await route.fetch({url:base+'/'+url.pathname.slice('/together-rpg/'.length)+url.search});await route.fulfill({response});});
 await prefixed.goto(`${base}/together-rpg/`);await screen(prefixed,'title');await ready(prefixed);await prefixed.locator('#title-start').click();await screen(prefixed,'setup');assert.deepEqual(outside,[]);await prefixed.context().close();mark('GitHub Pages /together-rpg/ subdirectory simulation loads all engine, artwork and module URLs without root-path requests');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors,limits:['Physical gamepads not tested.','Mobile title/settings checked; mobile touch combat is outside this change.','Local Chromium verified; live GitHub Pages not deployed in this task.']},null,2));
}finally{await browser.close();}
