import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='output/v08';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:940}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
const advance=ms=>page.evaluate(ms=>advanceTime(ms),ms);
const tap=async key=>{await page.keyboard.down(key);await advance(25);await page.keyboard.up(key);await advance(25);};
const shot=async name=>{await page.evaluate(()=>coopTest.render());await page.screenshot({path:`${out}/${name}.png`});};
const mark=message=>{checks.push(message);console.log('PASS',message);};
const arena=async (humans=2)=>{await page.evaluate(humans=>{coopTest.start(['warrior','mage'],humans);const w=coopTest.world;w.enemies=[];w.pressure=null;w.room=5;w.wave=2;w.mode='complete';w.gold=500;w.enterShop();},humans);};
const pad=(id,buttons=[],axes=[0,0])=>({index:id,axes,mapping:'standard',buttons:Array.from({length:17},(_,i)=>({pressed:buttons.includes(i)}))});
try{
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady===true);await shot('menu');
 await page.evaluate(()=>coopTest.start(['mage'],1));let s=await state();assert.equal(s.heroes.length,1);assert.ok(!s.heroes[0].ai);mark('single starts alone with no automatic AI');
 await arena();await page.evaluate(async()=>{const w=coopTest.world,{rollEquipment}=await import('/src/coop/equipment.js');w.shop.offers=[rollEquipment('warrior','armor',5,()=>.9,'test-armor'),rollEquipment('mage','weapon',5,()=>.4,'test-staff'),rollEquipment('archer','armor',5,()=>.15,'test-hunter')];});await shot('shop-shared');
 await tap('e');s=await state();assert.ok(s.heroes[0].equipment.armor);assert.equal(s.shop.offers[0].sold,true);const gold=s.gold;await tap('e');assert.equal((await state()).gold,gold);mark('keyboard purchase equips matching armor and shared stock sells once');
 await tap('ArrowDown');await tap('Enter');s=await state();assert.ok(s.heroes[1].equipment.weapon);mark('P2 chooses a different shared item using independent keys');
 const first=s.shop.offers.map(o=>o.uid);await tap('r');s=await state();assert.ok(s.shop.offers.every(o=>!first.includes(o.uid)));const rolledGold=s.gold;await page.keyboard.down('r');await advance(200);await advance(400);await page.keyboard.up('r');const heldGold=(await state()).gold;await advance(100);assert.equal((await state()).gold,heldGold);assert.ok(heldGold<rolledGold);mark('paid reroll refreshes stock and holding key cannot repeatedly spend');
 await arena(1);await page.evaluate(()=>{const w=coopTest.world;w.shop.cursors[0]=3;});await tap('e');s=await state();assert.equal(s.heroes.length,2);assert.ok(s.heroes[1].ai&&s.heroes[1].name);await shot('recruited');mark('single player recruits into an empty party slot');
 await page.evaluate(async()=>{const w=coopTest.world,{createHero}=await import('/src/coop/recruitment.js');w.heroes.push(createHero('warrior',2,{ai:true,name:'测试守卫'}));w.rerollShop(0);w.gold=1000;w.shop.cursors[0]=3;});await tap('e');s=await state();assert.deepEqual(s.shop.replacing.choices,[1,2]);await shot('replace-ai');await tap('s');await tap('e');s=await state();assert.equal(s.heroes.length,3);assert.equal(s.heroes[0].ai,false);assert.equal(s.heroes[2].name,s.shop.recruit.name);mark('full-party recruitment asks which AI leaves and keeps the human');
 await arena();await page.evaluate(async()=>{const w=coopTest.world,{rollEquipment}=await import('/src/coop/equipment.js');w.shop.offers[0]=rollEquipment('warrior','weapon',5,()=>.9,'pad-gear');coopTest.router.bind(0,{type:'gamepad',id:0});coopTest.router.bind(1,{type:'gamepad',id:1});});
 await page.evaluate(pads=>coopTest.setPads(pads),[pad(0),pad(1)]);await advance(25);await page.evaluate(pads=>coopTest.setPads(pads),[pad(0,[0]),pad(1)]);await advance(25);s=await state();assert.ok(s.heroes[0].equipment.weapon);assert.equal(s.heroes[1].equipment.weapon,null);mark('dual gamepads retain independent purchase routing');
 await page.evaluate(pads=>coopTest.setPads(pads),[pad(0),pad(1)]);await advance(25);await page.evaluate(()=>{coopTest.world.shop.cursors=[4,0];});const before=(await state()).gold;await page.evaluate(pads=>coopTest.setPads(pads),[pad(0,[0]),pad(1,[0])]);await advance(25);s=await state();assert.equal(s.gold,before-10);assert.ok(s.shop.offers.every(o=>!o.sold));mark('simultaneous reroll and buy cannot purchase unseen new stock');
 await page.evaluate(pads=>coopTest.setPads(pads),[pad(0),pad(1)]);await advance(25);await page.evaluate(()=>coopTest.world.shop.cursors=[5,5]);await page.evaluate(pads=>coopTest.setPads(pads),[pad(0,[0]),pad(1)]);await advance(25);assert.equal((await state()).mode,'shop');await page.evaluate(pads=>coopTest.setPads(pads),[pad(0),pad(1,[0])]);await advance(25);assert.equal((await state()).mode,'complete');mark('both human players confirm leaving the shop');
 await page.evaluate(()=>{coopTest.setPads(null);coopTest.router.bind(0,{type:'keyboard',id:0});coopTest.router.bind(1,{type:'keyboard',id:1});});await arena();await page.evaluate(()=>{const w=coopTest.world;w.shop.offers.forEach(o=>o.sold=true);w.leaveShop(0);w.leaveShop(1);w.nextRoom();});await advance(1500);await shot('after-shop-combat');assert.equal((await state()).room,6);mark('leaving returns to real combat in the next room');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/browser.json`,JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
