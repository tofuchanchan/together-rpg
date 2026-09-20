import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='output/v08/equipment-motion';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:940},recordVideo:{dir:out,size:{width:1440,height:940}}}),page=await context.newPage(),errors=[],records=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady);
 for(const [role,armor,weapon] of [['warrior','plate','cleaver'],['mage','leaf','crystal'],['archer','ranger','crossbow']]){
  await page.evaluate(async({role,armor,weapon})=>{const {rollEquipment,applyEquipment}=await import('/src/coop/equipment.js');coopTest.start([role],1);const w=coopTest.world,h=w.heroes[0];w.enemies=[];w.pressure=null;w.waveTimer=-100;w.obstacles=[];h.x=h.y=0;h.skills=[1,1];for(const [slot,suffix] of [['armor',armor],['weapon',weapon]]){const item=rollEquipment(role,slot,5,()=>.1,`${role}-${slot}`);item.visualKey=item.appearance=`${role}_${slot}_${suffix}`;applyEquipment(h,item);}window.motionFrames=[];},{role,armor,weapon});
  for(const facing of ['KeyD','KeyW']){
   await page.keyboard.down(facing);
   for(let frame=0;frame<8;frame++){await page.evaluate(()=>{advanceTime(70);const v=coopTest.view,w=coopTest.world,h=w.heroes[0],z=w.camera.zoom,cv=document.createElement('canvas');cv.width=180;cv.height=190;const x=720+(h.x-w.camera.x)*z,y=369+(h.y-w.camera.y)*.707*z;cv.getContext('2d').drawImage(v.c.canvas,x-90,y-155,180,190,0,0,180,190);motionFrames.push(cv);});await page.waitForTimeout(55);}
   await page.keyboard.up(facing);await page.evaluate(()=>advanceTime(100));
  }
  await page.evaluate(()=>{const w=coopTest.world,h=w.heroes[0];w.enemies=[w.createEnemy('mushroom',h.x+(h.role==='warrior'?100:220),h.y)];w.enemies[0].cd=5;});
  for(let i=0;i<8;i++){await page.evaluate(()=>advanceTime(90));await page.waitForTimeout(55);}
  await page.keyboard.down('KeyQ');await page.evaluate(()=>advanceTime(40));await page.keyboard.up('KeyQ');await page.evaluate(()=>advanceTime(220));
  await page.screenshot({path:`${out}/${role}-combat.png`});
  const data=await page.evaluate(role=>{const cv=document.createElement('canvas');cv.width=1440;cv.height=420;const c=cv.getContext('2d');c.fillStyle='#10271f';c.fillRect(0,0,1440,420);c.font='16px sans-serif';c.fillStyle='#e9e6c6';c.fillText(role+' · actual WASD movement, 70ms steps · east / north',12,22);motionFrames.forEach((frame,i)=>c.drawImage(frame,i%8*180,35+Math.floor(i/8)*190));return{png:cv.toDataURL(),hero:coopTest.world.snapshot().heroes[0]};},role);
  fs.writeFileSync(`${out}/${role}-walk.png`,Buffer.from(data.png.split(',')[1],'base64'));assert.ok(data.hero.equipment.weapon&&data.hero.equipment.armor);assert.ok(data.hero.damageDone>0);records.push({role,damageDone:data.hero.damageDone,gear:[data.hero.equipment.armor.visualKey,data.hero.equipment.weapon.visualKey]});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/result.json`,JSON.stringify({records,errors,scope:'Real movement, auto attack and Q skill with test equipment; no natural progression claim'},null,2));
}finally{await context.close();await browser.close();}
