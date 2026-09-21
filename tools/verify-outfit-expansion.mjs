import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {EQUIPMENT_APPEARANCES} from '../src/coop/equipment-data.js';

const out='output/verification/outfits-20260921';fs.mkdirSync(out,{recursive:true});
const outfits=Object.entries(EQUIPMENT_APPEARANCES).flatMap(([role,items])=>items.armor.slice(2).map(item=>({...item,role})));
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:940},recordVideo:{dir:out,size:{width:1440,height:940}}}),page=await context.newPage(),errors=[],records=[];
page.on('pageerror',e=>errors.push(e.message));
const advance=ms=>page.evaluate(ms=>advanceTime(ms),ms);
const tap=async key=>{await page.keyboard.down(key);await advance(25);await page.keyboard.up(key);await advance(25);};
try{
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady===true);
 for(const outfit of outfits){
  const offer=await page.evaluate(async outfit=>{
   const {rollEquipment}=await import('/src/coop/equipment.js');coopTest.start([outfit.role],1);
   const w=coopTest.world;w.enemies=[];w.pressure=null;w.room=5;w.mode='complete';w.gold=500;w.enterShop();
   let seed=37;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);let item;
   for(let i=0;i<1000;i++){item=rollEquipment(outfit.role,'armor',5,random,'outfit-'+i);if(item.visualKey===outfit.key)break;}
   if(item.visualKey!==outfit.key)throw Error('New armor never rolls: '+outfit.key);
   w.shop.offers[0]=item;return{uid:item.uid,price:item.price};
  },outfit);
  await tap('e');
  const purchase=await page.evaluate(()=>{const w=coopTest.world;return{armor:w.heroes[0].equipment.armor?.visualKey,gold:w.gold,sold:w.shop.offers[0].sold};});
  assert.equal(purchase.armor,outfit.key);assert.equal(purchase.gold,500-offer.price);assert.equal(purchase.sold,true);
  if(records.length%3===0)await page.screenshot({path:`${out}/${outfit.role}-shop.png`});
  await page.evaluate(()=>{const w=coopTest.world;w.leaveShop(0);w.nextRoom();w.enemies=[];w.pressure=null;w.waveTimer=-100;w.obstacles=[];const h=w.heroes[0];h.x=h.y=0;h.skills=[1,1,1,1];h.cd=[0,0,0,0,0];window.outfitFrames=[];});
  const capture=()=>page.evaluate(async()=>{
   const {drawEquippedHero}=await import('/src/coop/equipment-art.js'),h=coopTest.world.heroes[0],cv=document.createElement('canvas');cv.width=220;cv.height=260;
   drawEquippedHero(cv.getContext('2d'),h,110,225,coopTest.world.time,1.7);outfitFrames.push(cv);
  });
  for(const direction of ['KeyD','KeyW']){
   await page.keyboard.down(direction);for(let i=0;i<6;i++){await advance(70);await capture();}await page.keyboard.up(direction);await advance(30);
  }
  const moved=await page.evaluate(()=>{const w=coopTest.world,h=w.heroes[0],e=w.createEnemy('mushroom',h.x+100,h.y);e.hp=e.maxHp=10000;e.cd=120;e.stats={...e.stats,speed:0,damage:0};w.enemies=[e];return Math.hypot(h.x,h.y);});
  assert.ok(moved>40,outfit.key+' keyboard movement');
  for(let i=0;i<10;i++){await advance(80);await capture();}
  const automatic=await page.evaluate(()=>coopTest.world.heroes[0].damageDone);assert.ok(automatic>0,outfit.key+' automatic attack hits');
  const casts=[];
  for(const pair of [[0,1],[2,3]]){
   await page.evaluate(pair=>{const h=coopTest.world.heroes[0];h.loadout=pair;h.cd=[0,0,0,0,0];},pair);
   for(const key of ['q','e']){
    await tap(key);const action=await page.evaluate(()=>coopTest.world.heroes[0].action?.type);assert.ok(action&&action!=='attack',outfit.key+' '+key+' cast');casts.push(action);
    for(let i=0;i<6;i++){await capture();await advance(70);}await advance(350);
   }
  }
  const before=await page.evaluate(()=>{const h=coopTest.world.heroes[0];return[h.x,h.y];});await tap('Space');await advance(350);
  const after=await page.evaluate(()=>{const h=coopTest.world.heroes[0];return{x:h.x,y:h.y,damage:h.damageDone,body:h.equipment.armor.visualKey};});
  assert.ok(Math.hypot(after.x-before[0],after.y-before[1])>40,outfit.key+' dodge moves');assert.equal(after.body,outfit.key);
  await page.screenshot({path:`${out}/${outfit.key}-combat.png`});
  const strip=await page.evaluate(name=>{
   const cv=document.createElement('canvas');cv.width=220*6;cv.height=70+260*Math.ceil(outfitFrames.length/6);const c=cv.getContext('2d');c.fillStyle='#e9eedb';c.fillRect(0,0,cv.width,cv.height);c.font='24px sans-serif';c.fillStyle='#274536';c.fillText(name+' · 移动 / 普攻 / 四个基础技能',25,42);outfitFrames.forEach((f,i)=>c.drawImage(f,i%6*220,70+Math.floor(i/6)*260));return cv.toDataURL();
  },outfit.name);
  fs.writeFileSync(`${out}/${outfit.key}-motion.png`,Buffer.from(strip.split(',')[1],'base64'));
  records.push({key:outfit.key,purchase,automatic,casts,damageDone:after.damage,dodgeDistance:Math.hypot(after.x-before[0],after.y-before[1])});
 }
 const gallery=await page.evaluate(async outfits=>{
  const {loadCodexArt,paintCodexArt}=await import('/src/coop/codex-art.js');await loadCodexArt();
  const cv=document.createElement('canvas');cv.width=1440;cv.height=1530;const c=cv.getContext('2d');c.fillStyle='#f3f0dd';c.fillRect(0,0,1440,1530);
  c.fillStyle='#284735';c.font='bold 46px sans-serif';c.fillText('小队新装 · 九套完整外观',44,70);c.font='22px sans-serif';c.fillText('头部造型延伸至全身装备 · 游戏实际换装渲染',46,110);
  for(let i=0;i<outfits.length;i++){
   const o=outfits[i],x=32+i%3*464,y=145+Math.floor(i/3)*450,p=document.createElement('canvas');p.width=640;p.height=490;
   paintCodexArt(p,{art:{type:'equipment',role:o.role,slot:'armor',key:o.key}});c.drawImage(p,x,y,448,343);
   c.fillStyle='#294833';c.font='bold 28px sans-serif';c.fillText(o.name,x+24,y+386);c.font='19px sans-serif';c.fillStyle='#667655';c.fillText({warrior:'战士',mage:'法师',archer:'弓手'}[o.role]+' / 8 个方向 / 独立武器槽',x+24,y+419);
  }return cv.toDataURL();
 },outfits);
 fs.writeFileSync(`${out}/nine-outfits.png`,Buffer.from(gallery.split(',')[1],'base64'));
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({records,errors,scope:'Seeded shop purchases via real keyboard input; movement, auto attacks, four skills and dodge with deterministic combat fixtures. Not natural campaign progression or physical-controller testing.'},null,2));
 console.log(`PASS ${records.length} outfit shop purchases, movement, auto attacks, ${records.length*4} skill casts and dodges`);
}finally{await context.close();await browser.close();}
