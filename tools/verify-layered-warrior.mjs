import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='output/layered-warrior';fs.mkdirSync(out,{recursive:true});
const base=process.env.GAME_URL||'http://127.0.0.1:4173/',b=await chromium.launch(),p=await b.newPage({viewport:{width:1500,height:1100}}),errors=[],checks=[];
p.on('pageerror',e=>errors.push(e.message));
const state=()=>p.evaluate(()=>JSON.parse(render_game_to_text())),mark=s=>{checks.push(s);console.log('PASS',s);};
try{
 await p.goto(new URL('layered-lab.html',base).href);await p.waitForFunction(()=>window.layeredLab?.ready);await p.evaluate(()=>advanceTime(0));
 assert.equal((await state()).assets.parts,144);await p.screenshot({path:`${out}/default.png`});mark('all 144 parts load and original reference comparison renders');
 await p.locator('#pause').click();await p.locator('#next').click();assert.ok(Math.abs((await state()).phase-1/60)<1e-6);await p.locator('#prev').click();assert.equal((await state()).phase,0);
 await p.locator('#prev').click();assert.equal((await state()).phase,59/60);await p.locator('#next').click();assert.equal((await state()).phase,0);mark('paused frame step and both timeline boundaries');
 await p.locator('#clip').selectOption('run-attack');await p.locator('#timeline').fill('20');const phase=(await state()).phase;
 await p.locator('#weapon').selectOption('axe');await p.locator('#shield').selectOption('shield-round');await p.locator('#helmet').selectOption('helmet-bronze');assert.equal((await state()).phase,phase);
 for(let face=0;face<8;face++){await p.locator('#direction').selectOption(String(face));assert.ok(Number.isFinite((await state()).sockets.weaponTip.x));}
 await p.screenshot({path:`${out}/equipment.png`});mark('equipment swaps preserve action phase and valid weapon tips across eight views');
 const download=p.waitForEvent('download');await p.locator('#export').click();const file=await download;await file.saveAs(`${out}/export.json`);assert.equal(JSON.parse(fs.readFileSync(`${out}/export.json`)).appearance.weapon,'axe');mark('downloaded equipment JSON contains selected attachments');
 await p.locator('#rig-canvas').focus();await p.keyboard.down('d');await p.keyboard.down('j');assert.equal((await state()).clip,'run-attack');assert.equal((await state()).phase,0);
 await p.keyboard.up('j');assert.equal((await state()).clip,'run');await p.keyboard.down('Space');assert.equal((await state()).clip,'dodge');await p.keyboard.up('Space');assert.equal((await state()).clip,'run');
 await p.locator('#reset').focus();assert.equal((await state()).clip,'idle');await p.keyboard.up('d');mark('keyboard action release, dodge priority and focus loss restore correct movement');
 await p.locator('#reset').click();await p.locator('#debug').check();await p.locator('#explode').fill('1');await p.screenshot({path:`${out}/exploded.png`});
 await p.locator('#explode').fill('0');await p.locator('#debug').uncheck();await p.locator('#direction').selectOption('1');await p.locator('#clip').selectOption('attack');await p.locator('#timeline').fill('20');await p.screenshot({path:`${out}/attack.png`});
 const battle=await p.locator('#battle').getAttribute('href');await p.goto(new URL(battle,base).href);await p.waitForFunction(()=>window.assetsReady);await p.evaluate(()=>advanceTime(0));
 const info=await p.evaluate(async()=>{const m=await import('./src/coop/sprites.js');return m.characterAssetState();});assert.equal(info.warriorPreview.ready,true);
 const run=await p.evaluate(()=>{coopTest.start(['warrior','mage'],1);const w=coopTest.world;for(let i=0;i<60*300&&!['complete','defeat'].includes(w.mode);i++){if(w.mode==='upgrade'){w.confirm(0);}else w.advance(1/60,[w.aiInput(w.heroes[0])]);}coopTest.render();return w.snapshot();});
 assert.equal(run.mode,'complete');assert.equal(run.kills,76);await p.screenshot({path:`${out}/battle.png`});mark('opt-in battle uses layered warrior and clears real 76-enemy room');
 await p.goto(base);await p.waitForFunction(()=>window.assetsReady);assert.equal(await p.evaluate(async()=>Boolean((await import('./src/coop/sprites.js')).characterAssetState().warriorPreview)),false);mark('default game retains original renderer');
 await p.setViewportSize({width:390,height:844});await p.goto(new URL('layered-lab.html',base).href);await p.waitForFunction(()=>window.layeredLab?.ready);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:`${out}/mobile.png`});mark('mobile preview has no horizontal page overflow');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors,scope:'No physical controller or human art approval; Canvas preview only.'},null,2));
}finally{await b.close();}
