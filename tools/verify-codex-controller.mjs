import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const base=(process.env.CODEX_BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,''),out='output/verification/codex-controller';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:980}}),checks=[],errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.addInitScript(()=>{window.testPadButtons=[];window.testPadAxes=[0,0];Object.defineProperty(navigator,'getGamepads',{value:()=>[{index:0,connected:true,mapping:'standard',axes:window.testPadAxes,buttons:Array.from({length:17},(_,index)=>({pressed:window.testPadButtons.includes(index),value:+window.testPadButtons.includes(index)}))}]});});
const state=()=>page.evaluate(()=>codexTest.snapshot()),mark=label=>{checks.push(label);console.log('PASS',label);};
const set=async(buttons,ms=45)=>{await page.evaluate(buttons=>{window.testPadButtons=buttons;},buttons);await page.waitForTimeout(ms);};
const tap=async index=>{await set([index]);await set([]);};
const ready=()=>page.waitForFunction(()=>window.codexTest&&codexTest.snapshot().artReady);
async function open(hash=''){await page.goto(`${base}/codex.html${hash}`);await ready();await set([]);}
async function focus(name,button=13,limit=60){for(let n=0;n<limit;n++){if((await state()).controllerFocus===name)return;await tap(button);}assert.fail(`Unable to reach ${name}: ${JSON.stringify(await state())}`);}

try{
 await page.addInitScript(()=>{window.testPadButtons=[0];});
 await page.goto(`${base}/codex.html`);await ready();await page.waitForTimeout(500);assert.equal((await state()).detail,false);
 await set([]);await tap(0);assert.equal((await state()).detail,true);await set([1],650);assert.equal((await state()).detail,false);assert.match(page.url(),/codex\.html/);await set([]);
 mark('held confirm entering the standalone page is ignored; held B returns once without exiting');

 await tap(12);assert.equal((await state()).controllerFocus,'role:all');await tap(15);await tap(15);await tap(0);assert.equal((await state()).role,'mage');
 await tap(12);assert.equal((await state()).controllerFocus,'clear');await tap(12);assert.equal((await state()).controllerFocus,'kind');
 for(let n=0;n<12&&(await state()).kind!=='active';n++)await tap(15);
 assert.equal((await state()).kind,'active');assert.equal((await state()).count,2);await tap(13);await tap(0);assert.equal((await state()).role,'all');assert.equal((await state()).kind,'all');
 mark('D-pad navigates role filters, changes type without native select popup, and clears filters');

 await tap(5);assert.equal((await state()).category,'equipment');await tap(5);assert.equal((await state()).category,'monsters');await tap(4);assert.equal((await state()).category,'equipment');await tap(4);assert.equal((await state()).category,'skills');
 await tap(12);await tap(12);await tap(12);assert.equal((await state()).controllerFocus,'category:skills');await tap(15);await tap(0);assert.equal((await state()).category,'equipment');await tap(4);
 mark('LB/RB and focusable category tabs both browse all three categories');

 await focus('more');const before=(await state()).visibleCount;await tap(0);assert.equal((await state()).visibleCount,before+36);
 await focus('more');await tap(0);await focus('more');await tap(0);assert.ok((await state()).visibleCount>=(await state()).count);
 mark('all entries beyond the first 36 are reachable using controller-only pagination');

 await tap(5);await tap(4);await tap(0);assert.equal((await state()).detail,true);const selected=(await state()).selectedId;
 await tap(13);assert.ok(await page.evaluate(()=>document.querySelector('.codex-detail').scrollTop>0||scrollY>0));
 await tap(15);assert.match((await state()).controllerFocus,/返回条目/);await tap(15);assert.notEqual((await state()).controllerFocus,'reading');await tap(0);assert.notEqual((await state()).selectedId,selected);
 await page.screenshot({path:`${out}/desktop-related.png`});await tap(1);assert.equal((await state()).detail,false);
 mark('details scroll, related records open and B returns to the list');

 await page.setViewportSize({width:390,height:844});await tap(0);await tap(13);assert.ok(await page.evaluate(()=>scrollY>0||document.querySelector('.codex-detail').scrollTop>0));await tap(15);await tap(15);await tap(0);assert.equal((await state()).detail,true);await tap(1);assert.equal((await state()).detail,false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:`${out}/mobile-list.png`});mark('390px portrait supports detail scrolling, related links and return without horizontal overflow');

 let fail=true;await page.route('**/assets/codex/hero-warrior-*.webp*',route=>fail?route.abort():route.continue());
 await page.goto(`${base}/codex.html#role%3Awarrior`);await page.waitForFunction(()=>document.querySelector('.codex-preview')?.dataset.art==='error');await set([]);
 await tap(15);await tap(15);assert.equal((await state()).controllerFocus,'retry');fail=false;await tap(0);await ready();assert.equal((await state()).artReady,true);await page.unroute('**/assets/codex/hero-warrior-*.webp*');
 mark('failed illustration retry is reachable and recovers using only the controller');

 await tap(1);await tap(1);await page.waitForURL('**/index.html');assert.match(page.url(),/index\.html$/);mark('B from the list returns to the game title');
 await open();await tap(9);await page.waitForURL('**/index.html');mark('Start returns directly to the game title');

 await open();await page.evaluate(()=>{window.testPadAxes=[0,1];});await page.waitForTimeout(570);await page.evaluate(()=>{window.testPadAxes=[0,0];});assert.ok((await state()).controllerFocus?.startsWith('entry:'));assert.notEqual((await state()).selectedId,'role:warrior');mark('left stick supports intentional repeat navigation');

 await page.goto(`${base}/`);await page.waitForFunction(()=>window.assetsReady===true);
 await page.evaluate(()=>{window.testPadButtons=[];coopTest.setPads([]);coopTest.router.bind(0,{type:'gamepad',id:0});coopTest.start(['warrior','mage'],1);});
 const gameState=()=>page.evaluate(()=>coopTest.codex.snapshot());
 const gameSet=buttons=>page.evaluate(buttons=>{coopTest.setPads([{index:0,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},(_,index)=>({pressed:buttons.includes(index),value:+buttons.includes(index)}))}]);advanceTime(25);},buttons);
 const gameTap=async index=>{await gameSet([index]);await gameSet([]);};
 await gameSet([]);await gameTap(8);assert.equal((await gameState()).open,true);const frozen=await page.evaluate(()=>coopTest.world.snapshot());
 await gameTap(12);await gameTap(15);await gameTap(15);await gameTap(0);assert.equal((await gameState()).role,'mage');
 await gameTap(12);await gameTap(12);for(let n=0;n<12&&(await gameState()).kind!=='active';n++)await gameTap(15);assert.equal((await gameState()).count,2);
 await gameTap(13);await gameTap(0);assert.equal((await gameState()).role,'all');await gameTap(0);assert.equal((await gameState()).detail,true);
 await gameTap(13);await gameTap(15);await gameTap(15);await gameTap(0);assert.notEqual((await gameState()).selectedId,'role:warrior');
 assert.deepEqual(await page.evaluate(()=>coopTest.world.snapshot()),frozen);await page.screenshot({path:`${out}/ingame-details.png`});
 await gameTap(1);assert.equal((await gameState()).open,true);assert.equal((await gameState()).detail,false);await gameTap(1);await page.waitForFunction(()=>!coopTest.codex.isOpen);
 mark('in-game dialog supports filters, detail scrolling, links and two-stage B exit while combat stays frozen');

 await page.evaluate(()=>{coopTest.start(['warrior','mage'],2);coopTest.router.bind(0,{type:'gamepad',id:0});coopTest.router.bind(1,{type:'gamepad',id:1});});
 const twoPads=buttons=>page.evaluate(buttons=>{coopTest.setPads([0,1].map(index=>({index,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},(_,button)=>({pressed:buttons.includes(button),value:+buttons.includes(button)}))})));advanceTime(25);},buttons);
 await twoPads([]);await page.evaluate(()=>coopTest.codex.open('role:warrior'));await twoPads([]);
 await twoPads([1]);assert.equal((await gameState()).open,true,'two simultaneous B presses must not close the entire dialog');assert.equal((await gameState()).detail,false);await twoPads([]);
 await twoPads([5]);assert.equal((await gameState()).category,'equipment','two simultaneous RB presses must advance exactly one category');await twoPads([]);
 mark('two controllers pressing B/RB together return one level and change one category per frame');
 assert.deepEqual(errors,[]);mark('no page script errors');
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}
finally{fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors,scope:'Real Chromium DOM and rendering; simulated standard gamepad, not physical hardware.'},null,2));await browser.close();}
