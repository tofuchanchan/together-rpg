import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='output/v08/equipment-art';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1560,height:1780}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady===true);
 const data=await page.evaluate(async()=>{
 const {loadEquipmentArt,equipmentAssetState,equipmentVisual,drawEquippedHero}=await import('/src/coop/equipment-art.js');await loadEquipmentArt();
 const manifest=await(await fetch('/assets/equipment/manifest.json')).json(),cv=document.createElement('canvas');cv.width=1536;cv.height=100+Object.keys(manifest.bodies).length*174;cv.style.width='1536px';document.body.replaceChildren(cv);const c=cv.getContext('2d');c.fillStyle='#eff1d9';c.fillRect(0,0,cv.width,cv.height);
 c.fillStyle='#254538';c.font='bold 26px sans-serif';c.fillText('换装整帧图集 · 八方向独立武器握持检查',26,36);c.font='15px sans-serif';c.fillText('每行同一防具；默认身体只换武器。人物保持完整绘制，武器随方向独立换。',26,64);
 const faces=[2,3,4,5,6,7,0,1],rows=['S','SW','W','NW','N','NE','E','SE'],checks=[],bodyKeys=Object.keys(manifest.bodies);
 bodyKeys.forEach((key,i)=>{const role=key.split('_')[0],weapon=Object.keys(manifest.weapons).filter(w=>w.startsWith(role))[i%2],armor=key.includes('default')?null:{visualKey:key};
 c.fillStyle=i%2?'#e0e7c9':'#f5f4e4';c.fillRect(10,86+i*174,1516,171);c.fillStyle='#254538';c.font='bold 14px sans-serif';c.fillText(key,24,108+i*174);
 for(let j=0;j<8;j++){const x=110+j*187,y=245+i*174,h={id:0,role,face:faces[j],gait:0,stride:0,move:{x:0,y:0},equipment:{armor,weapon:{visualKey:weapon}}};const did=drawEquippedHero(c,h,x,y,0,.92);checks.push({key,direction:rows[j],drawn:did,visual:equipmentVisual(h)});c.fillStyle='#607451';c.font='12px sans-serif';c.fillText(rows[j],x-7,y+17);}
 });return{png:cv.toDataURL(),state:equipmentAssetState(),checks};});
 fs.writeFileSync(out+'/all-directions.png',Buffer.from(data.png.split(',')[1],'base64'));fs.writeFileSync(out+'/diagnostics.json',JSON.stringify(data.state,null,2));assert.equal(data.checks.length,144);assert.ok(data.checks.every(c=>c.drawn));assert.equal(data.state.bodyFrames,360);assert.deepEqual(errors,[]);
 for(const [key,rows]of Object.entries(data.state.localParts)){assert.equal(rows.length,8);assert.ok(rows.every(r=>r.accessoryPixels>=40),key+' every facing has a local idle accessory');assert.ok(rows.every(r=>r.feet.every(n=>n>15)),key+' each original boot retained');for(const direction of [0,1,2,6,7])assert.ok(rows[direction].eyes>0,key+' front/side hurt eyes '+direction);}
 assert.deepEqual(data.state.localParts.warrior_armor_crescent.map(r=>r.eyes),[2,2,1,0,0,0,1,2],'dark visor expressions must not include crest highlights or shoulder plates');
 const mixed=await page.evaluate(async()=>{const {drawEquippedHero,equipmentVisual}=await import('/src/coop/equipment-art.js');const cv=document.querySelector('canvas');cv.height=600;const c=cv.getContext('2d');c.fillStyle='#e9edd7';c.fillRect(0,0,cv.width,cv.height);const roles=['warrior','mage','archer'],armor=['warrior_armor_raider','mage_armor_leaf','archer_armor_scout'],weapons=['warrior_weapon_cleaver','mage_weapon_crystal','archer_weapon_crossbow'],cases=[];c.fillStyle='#254538';c.font='bold 26px sans-serif';c.fillText('独立换装：只武器 / 只防具 / 两件混搭',28,42);for(let r=0;r<3;r++)for(let k=0;k<3;k++){const h={role:roles[r],face:1,equipment:{armor:k?{visualKey:armor[r]}:null,weapon:k===1?null:{visualKey:weapons[r]}}},x=180+k*470,y=215+r*175;drawEquippedHero(c,h,x,y,0,1.2);c.fillStyle='#254538';c.font='14px sans-serif';c.fillText(roles[r]+' · '+['只武器','只防具','混搭'][k],x-65,y+24);cases.push({role:roles[r],kind:k,visual:equipmentVisual(h)});}return{png:cv.toDataURL(),cases};});fs.writeFileSync(out+'/independent-slots.png',Buffer.from(mixed.png.split(',')[1],'base64'));
 const protection=await page.evaluate(async()=>{
 const {equipmentPose,drawEquippedHero}=await import('/src/coop/equipment-art.js'),manifest=await(await fetch('/assets/equipment/manifest.json')).json(),cv=document.createElement('canvas');cv.width=cv.height=256;const ctx=cv.getContext('2d'),scale=1/manifest.displayScale;
 const render=h=>{ctx.clearRect(0,0,256,256);const p=equipmentPose(h,.7);drawEquippedHero(ctx,h,128-p.x*scale,210-p.y*scale,.7,scale);return ctx.getImageData(0,0,256,256).data.slice();};
 const diff=(a,b,box)=>{let count=0;for(let y=box[1];y<box[1]+box[3];y++)for(let x=box[0];x<box[0]+box[2];x++){const i=(y*256+x)*4;if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])count++;}return count;};
 const rows=[];for(const key of Object.keys(manifest.bodies)){const role=key.split('_')[0],weapon=Object.keys(manifest.weapons).find(k=>k.startsWith(role)),h={id:0,role,face:2,gait:1,stride:0,move:{x:1,y:0},equipment:{armor:key.includes('default')?null:{visualKey:key},weapon:{visualKey:weapon}}},a=render(h);h.stride=.25;const b=render(h);h.gait=0;h.stride=0;const normal=render(h);h.hitReaction={life:.2,max:.3,x:0,y:0,power:1};const hurt=render(h),eyeChanges=diff(normal,hurt,[50,70,160,94]),allHit=diff(normal,hurt,[0,0,256,256]);
 delete h.hitReaction;h.gait=1;h.stride=.25-1e-6;const before=render(h);h.stride=.25+1e-6;const after=render(h);
 rows.push({key,headChanges:diff(a,b,[105,90,45,38]),torsoChanges:diff(a,b,[112,150,26,22]),movingFeetPixels:diff(a,b,[70,175,125,40]),oldBoundaryPixelChanges:diff(before,after,[0,0,256,256]),eyeChanges,allHitChanges:allHit});}
 return rows;});
 for(const p of protection){assert.equal(p.headChanges,0,p.key+' rigid head');assert.equal(p.torsoChanges,0,p.key+' rigid torso');assert.ok(p.movingFeetPixels>10,p.key+' feet animate');assert.ok(p.oldBoundaryPixelChanges<30,p.key+' no old frame jump');assert.ok(p.eyeChanges>10,p.key+' local hurt eyes');assert.equal(p.allHitChanges,p.eyeChanges,p.key+' hurt affects eyes only');}

 const expressions=await page.evaluate(async()=>{
  const {drawEquippedHero}=await import('/src/coop/equipment-art.js'),{EQUIPMENT_APPEARANCES}=await import('/src/coop/equipment-data.js'),outfits=Object.entries(EQUIPMENT_APPEARANCES).flatMap(([role,v])=>v.armor.slice(2).map(a=>({...a,role}))),cv=document.createElement('canvas');cv.width=1500;cv.height=1080;const c=cv.getContext('2d');c.fillStyle='#edf0da';c.fillRect(0,0,cv.width,cv.height);c.fillStyle='#284635';c.font='bold 28px sans-serif';c.fillText('新外观 · 正常 / 局部受击表情',24,38);
  outfits.forEach((o,i)=>{const x=i%3*500,y=Math.floor(i/3)*340+55;for(let state=0;state<2;state++){const h={role:o.role,face:2,equipment:{armor:{visualKey:o.key}},...(state?{hitReaction:{life:.2,max:.3,x:0,y:0,power:1}}:{})};drawEquippedHero(c,h,x+120+state*230,y+255,0,1.9);}c.fillStyle='#284635';c.font='23px sans-serif';c.fillText(o.name,x+25,y+305);});return cv.toDataURL();
 });fs.writeFileSync(out+'/new-outfit-expressions.png',Buffer.from(expressions.split(',')[1],'base64'));
 fs.writeFileSync(out+'/results.json',JSON.stringify({state:data.state,directions:data.checks,mixed:mixed.cases,protection,errors},null,2));console.log('PASS 144 direction composites + 9 independent slots + 18 rigid-shape/motion/local-hurt protections');
}finally{await browser.close();}
