import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=process.env.GAME_URL||'http://127.0.0.1:4173',out='output/verification/frontend-controller';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),checks=[],errors=[];
const mark=message=>{checks.push(message);console.log('PASS',message);};
const makePage=async()=>{
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{window.frontendPads=[];Object.defineProperty(navigator,'getGamepads',{value:()=>window.frontendPads});});
 return page;
};
const screen=(page,name)=>page.waitForFunction(name=>document.body.dataset.screen===name,name);
const ready=page=>page.waitForFunction(()=>window.assetsReady===true,null,{timeout:60000});
const frontend=page=>page.evaluate(()=>JSON.parse(render_game_to_text()).frontend);
const focused=page=>page.evaluate(()=>document.activeElement.id||document.activeElement.name);
const pads=async(page,buttons=[],axes=[0,0],id=3)=>{await page.evaluate(({buttons,axes,id})=>{window.frontendPads=[{index:id,axes,mapping:'standard',buttons:Array.from({length:17},(_,i)=>({pressed:buttons.includes(i),value:buttons.includes(i)?1:0}))}];},{buttons,axes,id});await page.waitForTimeout(65);};
const tap=async(page,buttons,axes=[0,0],id=3)=>{await pads(page,[],[0,0],id);await pads(page,buttons,axes,id);await pads(page,[],[0,0],id);};
const inject=async(page,action)=>page.evaluate(async action=>{const {startScreen}=await import('./src/coop/start-screen.js?v=0.12.0');if(action==='fail')startScreen.failGame(new Error('controller test failed resource'));else startScreen.showTitle();},action);

try{
 const page=await makePage();await page.goto(base);await ready(page);await screen(page,'title');
 const cover=await page.locator('#title-art').getAttribute('src');
 // A pointer used first must not suppress visible focus when the controller takes over.
 await page.mouse.click(1380,80);await tap(page,[],[0,1]);assert.equal(await focused(page),'title-codex');
 assert.equal(await page.locator('#title-codex').evaluate(node=>getComputedStyle(node).outlineStyle),'solid');
 await tap(page,[13]);assert.equal(await focused(page),'title-settings-open');await tap(page,[0]);await screen(page,'settings');
 assert.equal(await focused(page),'sound');
 const original=(await frontend(page)).settings.sound;await pads(page,[0]);await page.waitForTimeout(250);assert.equal((await frontend(page)).settings.sound,!original);await pads(page,[]);
 await tap(page,[14]);assert.equal((await frontend(page)).settings.sound,false);await tap(page,[15]);assert.equal((await frontend(page)).settings.sound,true);
 await tap(page,[13]);assert.equal(await focused(page),'feedback');await tap(page,[14]);assert.equal((await frontend(page)).settings.feedback,false);
 await page.screenshot({path:`${out}/settings-pad-focus.png`});
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('test browser activation denied'));});
 await tap(page,[13]);await tap(page,[13]);assert.equal(await focused(page),'settings-fullscreen');await tap(page,[0]);assert.equal((await frontend(page)).displayMode,'window-fill');assert.equal(await page.locator('#settings-fullscreen').innerText(),'退出专注显示');
 await tap(page,[0]);assert.equal((await frontend(page)).displayMode,'window');await tap(page,[0]);await page.keyboard.press('Escape');assert.equal((await frontend(page)).displayMode,'window');await screen(page,'settings');
 await tap(page,[1]);await screen(page,'title');assert.equal(await focused(page),'title-settings-open');
 await tap(page,[0]);await screen(page,'settings');await tap(page,[9]);await screen(page,'title');
 mark('Stick and D-pad navigate title; gamepad focus stays visible after pointer use; settings support A, left/right, B and Start without held-A repeat');
 mark('Browser-denied fullscreen falls back to window fill and can exit by controller A or Escape without uncaught rejection');

 await tap(page,[13]);assert.equal(await focused(page),'title-start');await pads(page,[0]);await screen(page,'setup');await page.waitForTimeout(200);
 assert.equal((await frontend(page)).controllerIndex,3);assert.equal(await page.evaluate(()=>JSON.parse(render_game_to_text()).mode),'menu');
 await inject(page,'title');await page.waitForTimeout(200);await screen(page,'title');assert.equal((await frontend(page)).controllerIndex,3);
 await pads(page,[]);await tap(page,[9]);await screen(page,'setup');assert.equal((await frontend(page)).controllerIndex,3);
 mark('Starting controller index is retained across setup/title; holding A cannot skip setup or reopen it on return; Start can confirm');
 const ordering=await page.evaluate(async()=>{
  const {startScreen}=await import('./src/coop/start-screen.js?v=0.12.0');
  const pad=pressed=>({index:3,axes:[0,0],mapping:'standard',buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i)}))});
  coopTest.start(['warrior','mage'],1);coopTest.world.mode='defeat';coopTest.render();coopTest.view.navFocus='result-title';
  window.frontendPads=[pad([])];startScreen.samplePads(window.frontendPads);advanceTime(20);
  // Phaser consumes A first; the separate frontend RAF has not sampled it yet.
  window.frontendPads=[pad([0])];advanceTime(20);const afterGame=startScreen.phase;
  startScreen.samplePads(window.frontendPads);const afterFrontend=startScreen.phase;
  window.frontendPads=[pad([])];startScreen.samplePads(window.frontendPads);advanceTime(20);
  window.frontendPads=[pad([0])];startScreen.samplePads(window.frontendPads);const afterNewPress=startScreen.phase;
  return {afterGame,afterFrontend,afterNewPress};
 });
 assert.deepEqual(ordering,{afterGame:'title',afterFrontend:'title',afterNewPress:'setup'});
 mark('Game-before-frontend RAF ordering consumes result-title A exactly once; only release and a new press reopen setup');
 const simultaneous=await page.evaluate(async()=>{
  const {startScreen}=await import('./src/coop/start-screen.js?v=0.12.0');
  const pad=(index,pressed)=>({index,axes:[0,0],mapping:'standard',buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i)}))});
  window.frontendPads=[pad(3,[]),pad(4,[])];startScreen.showTitle();startScreen.samplePads(window.frontendPads);startScreen.openSettings();
  const sound=startScreen.settings.sound;
  const closed=new Promise(resolve=>startScreen.dialog.addEventListener('close',resolve,{once:true}));
  window.frontendPads=[pad(3,[1]),pad(4,[0])];startScreen.samplePads(window.frontendPads);await closed;
  startScreen.samplePads(window.frontendPads);const afterClose=startScreen.phase;
  window.frontendPads=[pad(3,[]),pad(4,[])];startScreen.samplePads(window.frontendPads);
  window.frontendPads=[pad(3,[]),pad(4,[0])];startScreen.samplePads(window.frontendPads);startScreen.samplePads(window.frontendPads);
  return {afterClose,afterNewPress:startScreen.phase,soundUnchanged:startScreen.settings.sound===sound};
 });
 assert.deepEqual(simultaneous,{afterClose:'title',afterNewPress:'settings',soundUnchanged:true});
 mark('Two controllers pressing B/A during settings close do not reopen or toggle the next screen; a fresh A opens settings once');
 await page.context().close();

 const loading=await makePage();let release;const gate=new Promise(resolve=>{release=resolve;});
 await loading.route('**/assets/world/manifest.json',async route=>{await gate;await route.continue();});
 await loading.goto(base,{waitUntil:'domcontentloaded'});await screen(loading,'title');await tap(loading,[0]);await screen(loading,'loading');
 await tap(loading,[1]);await screen(loading,'title');await tap(loading,[0]);await screen(loading,'loading');await tap(loading,[9]);await screen(loading,'title');
 await tap(loading,[0]);await screen(loading,'loading');await inject(loading,'fail');await screen(loading,'error');
 await tap(loading,[15]);assert.equal(await focused(loading),'loading-back');await tap(loading,[14]);assert.equal(await focused(loading),'retry-loading');
 await loading.screenshot({path:`${out}/error-pad-focus.png`});await tap(loading,[1]);await screen(loading,'title');await tap(loading,[0]);await screen(loading,'error');
 await tap(loading,[13]);await tap(loading,[0]);await screen(loading,'title');
 release();await ready(loading);await screen(loading,'title');assert.equal((await frontend(loading)).pending,'title');
 mark('B and Start cancel resource waiting; game-resource error supports horizontal/vertical button selection and B/A return; late resources preserve cancelled intent');
 await loading.context().close();

 const error=await makePage();await error.route(`**/${cover}`,route=>route.abort());await error.goto(base,{waitUntil:'domcontentloaded'});await screen(error,'error');
 assert.equal(await error.locator('#loading-back').isVisible(),false);await tap(error,[15]);assert.equal(await focused(error),'retry-loading');await tap(error,[13]);assert.equal(await focused(error),'retry-loading');
 await tap(error,[1]);await screen(error,'error');await error.unroute(`**/${cover}`);await tap(error,[0]);await screen(error,'title');await ready(error);
 mark('Cover failure skips the hidden Back button, keeps safe B behavior and reloads successfully with A');
 await error.context().close();

 const anime=await makePage();await anime.goto(`${base}/index-anime.html`);await ready(anime);await screen(anime,'title');await tap(anime,[13]);await tap(anime,[13]);await tap(anime,[0]);await screen(anime,'settings');await tap(anime,[1]);await screen(anime,'title');
 await anime.screenshot({path:`${out}/anime-pad-focus.png`});await anime.context().close();mark('Backup anime page shares the same complete title/settings controller behavior');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors,limits:['Standard-layout controller simulated in Chromium; no physical controller checked.','Browser fullscreen permission remains controlled by the browser.']},null,2));
}finally{await browser.close();}
