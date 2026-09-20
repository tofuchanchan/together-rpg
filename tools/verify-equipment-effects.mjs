import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir='output/v07/equipment-effects';fs.mkdirSync(dir,{recursive:true});const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady);await page.evaluate(()=>advanceTime(0));
 await page.evaluate(async()=>{
  const {drawEquipmentEffect,drawEquipmentObject}=await import('/src/coop/equipment-effects.js'),{hero}=await import('/src/coop/sprites.js'),{createHero}=await import('/src/coop/recruitment.js');
  const canvas=document.createElement('canvas');canvas.id='equipment-preview';canvas.width=1440;canvas.height=900;canvas.style.cssText='position:fixed;inset:0;z-index:9999;width:1440px;height:900px';document.body.append(canvas);const c=canvas.getContext('2d');c.fillStyle='#182f29';c.fillRect(0,0,1440,900);c.fillStyle='#fff2ce';c.font='bold 28px sans-serif';c.textAlign='center';c.fillText('装备词条 · PNG 分层效果检查',720,43);
  const cells=[['dodgeLoad','闪步装填 · 双副弹','warrior'],['capacitor','脉冲电容 · 推退脉冲','mage'],['piercingEdge','纵贯锋芒 · 定向贯穿针','archer'],['spellWard','咏唱护壁 · 薄盾','warrior'],['trailSnare','缓行足迹 · 迟滞圈','mage'],['panicMagnet','应急牵引 · 金币经验牵引','archer']];
  cells.forEach(([key,label,role],i)=>{const x=20+i%3*475,y=72+Math.floor(i/3)*404;c.fillStyle='#849a66';c.fillRect(x,y,450,380);c.fillStyle='#172e24';c.fillRect(x,y,450,42);c.fillStyle='#fff2ce';c.font='bold 20px sans-serif';c.fillText(label,x+225,y+28);c.save();c.translate(x+200,y+263);const h=createHero(role,0);h.x=h.y=0;h.face=0;
   if(key==='trailSnare')drawEquipmentObject(c,{kind:'snare',x:0,y:0,r:75,life:2,max:2.5,owner:0},1);
   else if(key!=='piercingEdge')drawEquipmentEffect(c,{type:'equipment',variant:key,x:0,y:0,r:key==='capacitor'||key==='panicMagnet'?132:55,life:.25,max:.4,owner:0});
   hero(c,h,0);
   if(key==='dodgeLoad')for(const side of [-1,1])drawEquipmentObject(c,{kind:'reloadBolt',x:150,y:side*23,dx:1,dy:side*.13,life:.6,max:.9},1);
   if(key==='piercingEdge')drawEquipmentObject(c,{kind:'piercingNeedle',x:150,y:0,dx:1,dy:0,life:.6,max:.9},1);
   c.restore();c.fillStyle='#263d2c';c.font='15px sans-serif';c.fillText(['dodgeLoad','piercingEdge'].includes(key)?'弹道走深度排序，碰撞点在弹头':'地面贴图先画，角色画在效果上方',x+225,y+354);
  });
 });
 await page.locator('#equipment-preview').screenshot({path:dir+'/six-affixes.png'});assert.equal(errors.length,0);fs.writeFileSync(dir+'/result.json',JSON.stringify({passed:true,errors,scope:'Six static render fixtures using loaded production PNG assets and actual drawEquipmentEffect/Object. Gameplay hooks are separately unit-tested; this image is not a natural combat simulation.'},null,2));console.log('PASS six equipment PNG effect fixtures, no page errors');
}finally{await browser.close();}
