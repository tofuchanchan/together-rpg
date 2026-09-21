import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Every user action below comes from navigator.getGamepads. Fixtures only create
// otherwise lengthy reward/shop/end states; they never click or invoke UI actions.
const base=process.env.GAME_URL||'http://127.0.0.1:4173';
const out='output/verification/controller-flow';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const checks=[],errors=[],failures=[];
const context=await browser.newContext({viewport:{width:1440,height:940}});
const page=await context.newPage();
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400)failures.push(`${response.status()} ${response.url()}`);});
await page.addInitScript(()=>{window.controllerPads=[];Object.defineProperty(navigator,'getGamepads',{value:()=>window.controllerPads});});
const connected=new Map([[0,{buttons:[],axes:[0,0]}]]);
const mark=message=>{checks.push(message);console.log('PASS',message);};
const state=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
const draw=()=>page.evaluate(()=>coopTest.render());
const step=ms=>page.evaluate(ms=>advanceTime(ms),ms);
const sync=async()=>{
 const pads=[...connected].map(([index,value])=>({index,id:`Regression gamepad ${index}`,mapping:'standard',connected:true,axes:value.axes,buttons:Array.from({length:17},(_,i)=>({pressed:value.buttons.includes(i),value:value.buttons.includes(i)?1:0}))}));
 // Sample the game before the independent title RAF poll to exercise the
 // real ordering that used to leak a result-screen A into the title menu.
 await page.evaluate(pads=>{window.controllerPads=pads;advanceTime(34);},pads);await page.waitForTimeout(65);
};
const hold=async(index,buttons=[],axes=[0,0])=>{connected.set(index,{buttons,axes});await sync();};
const tap=async(button,index=0)=>{await hold(index,[]);await hold(index,[button]);await hold(index,[]);};
const disconnect=async index=>{connected.delete(index);await sync();};
const screen=name=>page.waitForFunction(name=>document.body.dataset.screen===name,name);
const shot=async name=>{await draw();await page.screenshot({path:`${out}/${name}.png`});};
const select=async(id,index=0)=>{
 for(let i=0;i<40;i++){
  const navigation=(await state()).uiNavigation;
  assert.ok(navigation?.items?.some(item=>item.id===id),`UI action ${id} is not reachable: ${JSON.stringify(navigation)}`);
  if(navigation.focusId===id)return;
  await tap(13,index);
 }
 assert.fail(`Controller could not focus ${id}`);
};
const activate=async(id,index=0)=>{await select(id,index);await tap(0,index);};
const fixture=async code=>{await page.evaluate(code);await step(0);await draw();};
const shopCursor=async(target,index=0)=>{for(let i=0;i<8;i++){const s=await state(),slot=s.devices.findIndex(device=>device.type==='gamepad'&&device.id===index);assert.ok(slot>=0,`Controller ${index} is not assigned`);if(s.shop.stalls[slot].cursor===target)return;await tap(13,index);}assert.fail(`Shop cursor ${target} is unreachable for controller ${index}`);};

try{
 await page.goto(base);await page.waitForFunction(()=>window.assetsReady===true,null,{timeout:60000});await screen('title');await step(0);await hold(0,[]);
 await hold(0,[0]);await screen('setup');await step(300);let s=await state();
 assert.equal(s.mode,'menu');assert.equal(s.devices[0].type,'gamepad');assert.equal(s.devices[0].id,0);
 await hold(0,[]);mark('Title A claims P1; a held confirm does not skip setup');
 await activate('setup-single');const initialRole=await page.evaluate(()=>coopTest.view.roles[0]);await activate('setup-role-0');
 assert.notEqual(await page.evaluate(()=>coopTest.view.roles[0]),initialRole);
 await select('setup-start');await shot('setup-focus');await tap(0);s=await state();assert.equal(s.mode,'play');assert.equal(s.humanCount,1);assert.equal(s.heroes.length,1);
 mark('Controller selects solo mode, changes class and starts without keyboard or mouse');

 await fixture(()=>{const w=coopTest.world;w.enemies=[];w.pressure=null;w.projectiles=[];w.heroes[0].action=null;w.heroes[0].dodgeCd=0;});
 const beforeX=(await state()).heroes[0].x;await hold(0,[],[1,0]);await step(180);await hold(0,[]);assert.ok((await state()).heroes[0].x>beforeX);
 await tap(0);assert.notEqual((await state()).heroes[0].action,'dodge');
 await hold(0,[4]);assert.equal((await state()).heroes[0].action,'dodge');
 await fixture(()=>coopTest.world.beginReward('attribute'));await step(250);s=await state();assert.equal(s.mode,'upgrade');assert.equal(s.ready[0],false);
 const firstSelection=s.selection[0];for(let i=0;i<4;i++)await tap(4);s=await state();assert.equal(s.mode,'upgrade');assert.equal(s.ready[0],false);assert.equal(s.selection[0],firstSelection);
 await tap(13);assert.notEqual((await state()).selection[0],firstSelection);await tap(0);assert.equal((await state()).mode,'play');
 mark('Left stick moves; LB/L1 dodges; A does not dodge; held/repeated LB cannot accept an upgrade');

 await fixture(()=>{const w=coopTest.world;w.heroes[0].rerolls=3;w.beginReward('attribute');});
 await tap(3);assert.equal((await state()).heroes[0].rerolls,2);await tap(0);
 await fixture(async()=>{const {PASSIVES}=await import('./src/coop/builds.js');const w=coopTest.world;w.heroes[0].passives={momentum:1,harvest:1,thorns:1,focus:1};w.beginReward('skill');w.offers[0]=[{key:'passive:chill',...PASSIVES.chill}];});
 const unchanged=JSON.stringify((await state()).heroes[0].passives);await tap(0);assert.equal((await state()).rewardMenus[0].type,'replace');await shot('upgrade-replace');await tap(1);s=await state();assert.equal(s.rewardMenus[0],null);assert.equal(s.ready[0],false);assert.equal(JSON.stringify(s.heroes[0].passives),unchanged);
 await tap(0);assert.equal((await state()).rewardMenus[0].type,'replace');await tap(0);assert.equal((await state()).heroes[0].passives.chill,1);
 mark('Y rerolls; A opens passive replacement; B cancels without spending or changing the build');

 await fixture(()=>{const w=coopTest.world,h=w.heroes[0];h.skills=[1,1];h.passives={ember:1,chill:1,boneWhistle:1,elementFeed:1};h.universal??={};h.universal.feedElement='burn';w.beginReward('attribute');});
 await tap(2);assert.equal((await state()).heroes[0].universal.feedElement,'chill');await tap(2);assert.equal((await state()).heroes[0].universal.feedElement,'burn');await tap(0);mark('X toggles available pet food elements on the upgrade screen');

 await tap(9);assert.equal((await state()).mode,'paused');
 for(const [id,field] of [['pause-feedback','feedback'],['pause-shake','shake'],['pause-sound','sound']]){
  const previous=await page.evaluate(field=>coopTest.world.options[field],field);await activate(id);assert.equal(await page.evaluate(field=>coopTest.world.options[field],field),!previous);
 }
 const debug=await page.evaluate(()=>coopTest.view.showDebug);await activate('pause-debug');assert.equal(await page.evaluate(()=>coopTest.view.showDebug),!debug);
 await activate('pause-codex');assert.equal((await state()).codex.open,true);await tap(1);assert.equal((await state()).codex.open,false);assert.equal((await state()).mode,'paused');
 await activate('pause-fullscreen');assert.ok(['fullscreen','window-fill'].includes((await state()).frontend.displayMode));await activate('pause-fullscreen');assert.equal((await state()).frontend.displayMode,'window');
 await activate('pause-bind-0');assert.equal((await state()).awaitingPad,0);await tap(1);assert.equal((await state()).awaitingPad,null);assert.equal((await state()).devices[0].id,0);
 await hold(3,[]);await activate('pause-bind-0');await tap(0,3);assert.equal((await state()).devices[0].id,3);await activate('pause-setup',3);await screen('setup');assert.equal((await state()).devices[0].id,3);
 await activate('setup-bind-0',3);await tap(0);assert.equal((await state()).devices[0].id,0);await disconnect(3);await activate('setup-start');await tap(9);assert.equal((await state()).mode,'paused');
 mark('Returning to character selection preserves a deliberately rebound P1 while the title controller remains connected');
 await activate('pause-keyboard-0');assert.equal((await state()).devices[0].type,'keyboard');await tap(1);assert.equal((await state()).mode,'play');await tap(9);assert.equal((await state()).mode,'paused');await activate('pause-bind-0');await tap(0);assert.equal((await state()).devices[0].type,'gamepad');assert.equal((await state()).devices[0].id,0);
 mark('A controller accidentally switched to keyboard can reopen pause and reclaim its player slot');
 await select('pause-resume');await shot('pause-focus');await tap(1);assert.equal((await state()).mode,'play');
 await tap(9);await activate('pause-setup');await screen('setup');await tap(1);await screen('title');mark('Pause settings, binding cancellation, resume and return-to-title are controller reachable');

 await tap(0);await screen('setup');await activate('setup-single');await hold(1,[]);await tap(0,1);s=await state();
 assert.equal(s.devices[1].type,'gamepad');assert.equal(s.devices[1].id,1);assert.equal(await page.evaluate(()=>coopTest.view.humanCount),2);assert.equal(s.mode,'menu');
 const p2Role=await page.evaluate(()=>coopTest.view.roles[1]);await activate('setup-role-1',1);assert.notEqual(await page.evaluate(()=>coopTest.view.roles[1]),p2Role);await activate('setup-start');assert.equal((await state()).humanCount,2);
 await fixture(()=>{const w=coopTest.world;w.enemies=[];w.pressure=null;w.beginReward('attribute');});await tap(13,1);s=await state();assert.equal(s.selection[0],0);assert.equal(s.selection[1],1);await tap(0);s=await state();assert.equal(s.mode,'upgrade');assert.equal(s.ready[0],true);assert.equal(s.ready[1],false);await tap(0,1);assert.equal((await state()).mode,'play');
 mark('Second controller joins P2, changes its class and independently chooses and confirms rewards');

 await disconnect(1);s=await state();assert.equal(s.mode,'paused');assert.equal(s.devices[1].type,'disconnected');await hold(1,[]);assert.equal((await state()).mode,'paused');await tap(0,1);s=await state();assert.equal(s.devices[1].type,'gamepad');assert.equal(s.devices[1].id,1);assert.equal(s.mode,'paused');await tap(9);assert.equal((await state()).mode,'play');
 await disconnect(1);await hold(2,[]);await activate('pause-bind-1');assert.equal((await state()).awaitingPad,1);await tap(0,2);s=await state();assert.equal(s.devices[1].id,2);assert.equal(s.awaitingPad,null);await tap(9);assert.equal((await state()).mode,'play');
 mark('Disconnect pauses play; same device actively reconnects; a replacement controller can rebind P2');

 await fixture(async()=>{const w=coopTest.world,{rollEquipment}=await import('./src/coop/equipment.js');w.enemies=[];w.pressure=null;w.room=5;w.wave=2;w.mode='complete';w.heroes.forEach(h=>h.gold=2000);w.enterShop();w.shop.stalls.forEach((s,i)=>s.offers=[rollEquipment(w.heroes[i].role,'armor',5,()=>.9,`controller-armor-${i}`),rollEquipment(w.heroes[i].role,'weapon',5,()=>.4,`controller-weapon-${i}`),rollEquipment(w.heroes[i].role,'armor',5,()=>.15,`controller-hunter-${i}`)]);});
 await tap(2);assert.equal((await state()).shop.stalls[0].inspect.type,'item');await tap(1);assert.equal((await state()).shop.stalls[0].inspect,null);await tap(0);s=await state();assert.equal(s.shop.stalls[0].offers[0].sold,true);assert.equal(s.heroes[0].equipment.armor.uid,'controller-armor-0');const paid=s.heroes[0].gold;await tap(0);assert.equal((await state()).heroes[0].gold,paid);
 await shopCursor(1,2);await tap(0,2);assert.equal((await state()).heroes[1].equipment.weapon.uid,'controller-weapon-1');
 await hold(0,[3]);s=await state();const rerolls=s.shop.stalls[0].rerolls,gold=s.heroes[0].gold;await step(800);assert.equal((await state()).shop.stalls[0].rerolls,rerolls);assert.equal((await state()).heroes[0].gold,gold);await hold(0,[]);
 mark('Shop detail/B, matching purchases, independent P2 purchase and one-charge held Y reroll work');

 await tap(4);await shopCursor(0);await tap(2);assert.equal((await state()).shop.stalls[0].inspect.type,'recruit');await tap(1);await tap(0);s=await state();assert.equal(s.heroes.length,3);assert.equal(s.heroes[2].ai,true);await tap(3);await shopCursor(0);const beforeRecruit=(await state()).heroes[0].gold;await tap(0);assert.deepEqual((await state()).shop.stalls[0].replacing.choices,[2]);await shot('shop-replace');await tap(1);assert.equal((await state()).shop.stalls[0].replacing,null);assert.equal((await state()).heroes[0].gold,beforeRecruit);await tap(0);await tap(0);s=await state();assert.equal(s.heroes[2].name,s.shop.stalls[0].recruits[0].name);assert.equal(s.heroes[0].ai,false);assert.equal(s.heroes[1].ai,false);await shopCursor(7);await tap(0);assert.equal((await state()).mode,'shop');await shopCursor(7,2);await tap(0,2);assert.equal((await state()).mode,'complete');
 mark('Recruit, inspect, cancel/confirm full-party AI replacement and dual-player shop exit need no mouse');

 await fixture(()=>{const w=coopTest.world;w.mode='complete';w.room=13;w.challengeUsed=false;w.challengeNext=false;});await activate('result-challenge');assert.equal(await page.evaluate(()=>coopTest.world.challengeNext),true);await select('result-proceed');await shot('result-focus');await tap(0);s=await state();assert.equal(s.room,14);assert.equal(s.eliteChallenge,true);
 await fixture(()=>{coopTest.world.mode='defeat';});await activate('result-proceed');assert.equal((await state()).mode,'play');
 await fixture(()=>{coopTest.world.mode='victory';coopTest.world.room=20;coopTest.world.shopVisitedRoom=20;});await activate('result-proceed');s=await state();assert.equal(s.endless,true);assert.equal(s.room,21);
 await fixture(()=>{coopTest.world.mode='defeat';});await activate('result-title');await screen('title');mark('Result pages allow elite challenge, restart, endless continuation and returning to the title');
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors,failures,limits:['Browser standard Gamepad API simulated; no physical Xbox/PlayStation controller tested.','Reward/shop/result fixtures accelerate campaign state; every menu action uses gamepad input only.']},null,2));
 console.log(`PASS ${checks.length} controller flow groups`);
}catch(error){
 errors.push(error.stack||String(error));try{await shot('failure');fs.writeFileSync(`${out}/failure-state.json`,JSON.stringify(await state(),null,2));}catch{}
 fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors,failures},null,2));throw error;
}finally{await browser.close();}
