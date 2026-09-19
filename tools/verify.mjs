import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/fuweicheng/.codex/skills/node_modules/playwright');
const out='output/verification';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),errors=[],checks=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/lab.html');await page.waitForFunction(()=>window.assetsReady);await page.evaluate(()=>labTest.reset());
 await page.screenshot({path:`${out}/overview.png`,fullPage:true});
 for(const clip of ['idle','run','attack','run-attack','bash','dodge']){
  await page.click(`[data-clip="${clip}"]`);await page.evaluate(()=>advanceTime(220));
  for(const d of [0,2,4,6]){await page.click(`[data-dir="${d}"]`);const s=await page.evaluate(()=>JSON.parse(render_game_to_text()));assert.equal(s.pose.dir,d);assert.ok(s.pose.frame>=0&&s.pose.frame<16);}
  await page.click('[data-dir="1"]');await page.locator('#game').screenshot({path:`${out}/${clip}.png`});checks.push({clip,directions:4});
 }
 await page.click('[data-clip="attack"]');await page.click('#pause');
 const frozen=await page.evaluate(()=>render_game_to_text());await page.evaluate(()=>advanceTime(1000));assert.equal(await page.evaluate(()=>render_game_to_text()),frozen);checks.push('pause');
 await page.click('#next');let s=await page.evaluate(()=>JSON.parse(render_game_to_text()));assert.equal(s.paused,true);assert.equal(s.pose.frame,1);checks.push('next frame');
 await page.locator('#timeline').fill('750');s=await page.evaluate(()=>JSON.parse(render_game_to_text()));assert.equal(s.pose.frame,12);assert.equal(s.hits,0);checks.push('scrub without damage');
 await page.click('#prev');s=await page.evaluate(()=>JSON.parse(render_game_to_text()));assert.equal(s.pose.frame,11);
 await page.click('#reset');await page.click('#play-mode');await page.evaluate(()=>advanceTime(450));s=await page.evaluate(()=>JSON.parse(render_game_to_text()));assert.equal(s.hits,1);assert.equal(s.position.x,0);checks.push('automatic attack');
 await page.keyboard.down('KeyS');await page.evaluate(()=>advanceTime(300));await page.keyboard.up('KeyS');s=await page.evaluate(()=>JSON.parse(render_game_to_text()));assert.ok(s.position.z>30);checks.push('keyboard movement');
 await page.keyboard.press('Space');await page.evaluate(()=>advanceTime(150));s=await page.evaluate(()=>JSON.parse(render_game_to_text()));assert.equal(s.pose.clip,'dodge');await page.locator('#game').screenshot({path:`${out}/free-dodge.png`});
 await page.click('#reset');await page.click('#play-mode');await page.evaluate(()=>{lab.auto=false;lab.setDirection(0);});await page.keyboard.press('KeyQ');await page.evaluate(()=>advanceTime(300));s=await page.evaluate(()=>JSON.parse(render_game_to_text()));assert.equal(s.pose.clip,'bash');assert.equal(s.hits,1);checks.push('keyboard bash + hit');
 await page.locator('#attack-speed').fill('2');await page.locator('#move-speed').fill('1.5');await page.click('[data-speed="0.25"]');s=await page.evaluate(()=>JSON.parse(render_game_to_text()));assert.equal(s.attackSpeed,2);assert.equal(s.moveSpeed,1.5);assert.equal(s.speed,.25);checks.push('speed controls');
 await page.click('#reset');await page.click('#debug');await page.locator('#game').screenshot({path:`${out}/debug.png`});
 await page.click('#fullscreen');await page.waitForFunction(()=>document.fullscreenElement);await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(()=>!document.fullscreenElement);checks.push('fullscreen');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${out}/mobile.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push('390px layout');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors},null,2));console.log('Browser verification passed:',checks.length,'checks');
}finally{await browser.close();}

