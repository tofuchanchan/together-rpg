import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=(process.env.GAME_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const out='output/verification/cute-start-screen';
fs.mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],failedRequests:[],httpErrors:[],screenshots:[],layouts:[],limits:[
 'Screenshots require visual review for character occlusion and art consistency; DOM bounds cannot judge illustration composition.',
 'Local Chromium only. Physical gamepads, real mobile hardware and live deployment are not covered by this script.'
]};
const mark=text=>{report.checks.push(text);console.log('PASS',text);};
const screen=(page,name)=>page.waitForFunction(value=>document.body.dataset.screen===value,name,{timeout:60000});
const ready=page=>page.waitForFunction(()=>window.assetsReady===true,null,{timeout:60000});
const state=page=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const shot=async(page,name)=>{const path=`${out}/${name}.png`;await page.screenshot({path});report.screenshots.push(path);};

for(let attempt=0;;attempt++){
 try{const response=await fetch(base);assert.equal(response.status,200);break;}
 catch(error){if(attempt===30)throw new Error(`Local server unavailable at ${base}: ${error.message}`);await new Promise(resolve=>setTimeout(resolve,300));}
}

const browser=await chromium.launch({headless:true});
const makePage=async(name,viewport={width:1440,height:900})=>{
 const context=await browser.newContext({viewport});const page=await context.newPage();let closing=false;
 page.on('pageerror',error=>report.errors.push({name,type:'pageerror',message:error.message}));
 page.on('console',message=>{if(message.type()==='error')report.errors.push({name,type:'console',message:message.text()});});
 page.on('requestfailed',request=>{if(!closing)report.failedRequests.push({name,url:request.url(),error:request.failure()?.errorText});});
 page.on('response',response=>{if(response.status()>=400)report.httpErrors.push({name,url:response.url(),status:response.status()});});
 return {page,close:async()=>{closing=true;await context.close();}};
};

async function inspectLayout(page,name,{touch=false}={}){
 const layout=await page.evaluate(()=>({
  viewport:{width:innerWidth,height:innerHeight},
  document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},
  art:{loaded:document.querySelector('#title-art').complete,width:document.querySelector('#title-art').naturalWidth,src:document.querySelector('#title-art').currentSrc},
  choices:[...document.querySelectorAll('.title-choice')].map(node=>{
   const r=node.getBoundingClientRect(),target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return {id:node.id,text:node.textContent.trim(),left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,hit:node.contains(target)};
  })
 }));
 report.layouts.push({name,...layout});
 assert.ok(layout.art.loaded&&layout.art.width>0,`${name}: illustration decoded`);
 assert.ok(layout.document.width<=layout.viewport.width,`${name}: horizontal overflow`);
 assert.ok(layout.document.height<=layout.viewport.height,`${name}: vertical overflow`);
 assert.equal(layout.choices.length,3,`${name}: three real menu entries`);
 for(const choice of layout.choices){
  assert.ok(choice.left>=0&&choice.top>=0&&choice.right<=layout.viewport.width+1&&choice.bottom<=layout.viewport.height+1,`${name}: ${choice.id} stays inside viewport`);
  assert.ok(choice.hit,`${name}: ${choice.id} center remains clickable`);
  if(touch)assert.ok(choice.height>=44,`${name}: ${choice.id} is at least 44 px tall`);
 }
 await shot(page,name);
 return layout;
}

try{
 const covers=[];
 for(const [variant,path] of [['cute','/'],['anime-backup','/index-anime.html']]){
  const {page,close}=await makePage(variant);
  await page.goto(base+path);await screen(page,'title');await ready(page);await page.evaluate(()=>document.fonts.ready);
  const layout=await inspectLayout(page,`${variant}-desktop`);covers.push(layout.art.src);
  assert.equal((await state(page)).mode,'menu');
  const before=(await state(page)).time;await page.evaluate(()=>advanceTime(250));assert.equal((await state(page)).time,before);
  mark(`${variant}: illustration, title and three menu entries load; background game stays stopped`);

  await page.locator('#title-settings-open').click();await screen(page,'settings');
  await page.locator('input[name=sound]').uncheck();await page.locator('input[name=shake]').uncheck();
  await shot(page,`${variant}-settings`);await page.locator('#settings-close').click();await screen(page,'title');
  await page.reload();await screen(page,'title');await ready(page);
  assert.equal((await state(page)).frontend.settings.sound,false);assert.equal((await state(page)).frontend.settings.shake,false);
  mark(`${variant}: settings open, close and survive reload`);

  await page.locator('#title-start').click();await screen(page,'setup');assert.equal((await state(page)).mode,'menu');
  await shot(page,`${variant}-setup`);await page.locator('#back-title').click();await screen(page,'title');
  await page.keyboard.down('Enter');await screen(page,'setup');await page.evaluate(()=>advanceTime(250));assert.equal((await state(page)).mode,'menu');await page.keyboard.up('Enter');
  await page.keyboard.press('Enter');await screen(page,'game');assert.equal((await state(page)).mode,'play');
  assert.equal(await page.evaluate(()=>coopTest.world.options.sound),false);assert.equal(await page.evaluate(()=>coopTest.world.options.shake),false);
  await page.evaluate(()=>advanceTime(250));await shot(page,`${variant}-combat`);
  mark(`${variant}: title → setup → combat works; held confirmation does not skip setup; return and saved settings work`);

  await page.evaluate(()=>coopTest.view.actions.menu());await screen(page,'setup');await page.locator('#back-title').click();await screen(page,'title');
  const codexHref=await page.locator('#title-codex').getAttribute('href');assert.equal(new URL(codexHref,page.url()).pathname,'/codex.html');
  await page.locator('#title-codex').click();await page.waitForURL('**/codex.html');await ready(page);assert.equal((await state(page)).page,'codex');
  mark(`${variant}: archive menu opens the working codex`);
  await close();
 }
 assert.notEqual(...covers);mark('Cute and retained anime entry points use distinct illustrations');

 for(const [name,viewport] of [['cute-portrait',{width:390,height:844}],['cute-short-landscape',{width:844,height:390}],['cute-ultrawide',{width:2560,height:1080}]]){
  const {page,close}=await makePage(name,viewport);await page.goto(base);await screen(page,'title');await ready(page);await page.evaluate(()=>document.fonts.ready);
  await inspectLayout(page,name,{touch:name!=='cute-ultrawide'});
  await page.locator('#title-settings-open').click();await screen(page,'settings');await shot(page,`${name}-settings`);
  const closeBox=await page.locator('#settings-close').boundingBox();assert.ok(closeBox.x>=0&&closeBox.y>=0&&closeBox.x+closeBox.width<=viewport.width&&closeBox.y+closeBox.height<=viewport.height);
  await page.locator('#settings-close').click();await screen(page,'title');await page.locator('#title-start').click();await screen(page,'setup');
  mark(`${name}: no overflow, menu hit targets work, settings close remains on screen, start reaches setup`);await close();
 }
 assert.deepEqual(report.failedRequests,[],'No failed resource requests');assert.deepEqual(report.httpErrors,[],'No HTTP resource errors');assert.deepEqual(report.errors,[],'No browser or console errors');
 mark('All visited variants and responsive layouts complete without failed requests, HTTP errors or console exceptions');
}catch(error){report.failure={message:error.message,stack:error.stack};throw error;}
finally{fs.writeFileSync(`${out}/results.json`,JSON.stringify(report,null,2));await browser.close();}
