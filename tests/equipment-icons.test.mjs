import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {EQUIPMENT_APPEARANCES} from '../src/coop/equipment-data.js';
const root=new URL('../',import.meta.url),read=path=>fs.readFileSync(new URL(path,root));
const manifest=JSON.parse(read('assets/shop/manifest.json')),runtime=JSON.parse(read('assets/equipment/manifest.json'));
test('every appearance has its own icon calibrated against the actual runtime sprite',()=>{
 const expected=[];for(const slots of Object.values(EQUIPMENT_APPEARANCES))for(const [slot,items] of Object.entries(slots))for(const item of items){
  expected.push(item.key);const icon=manifest.icons?.[item.key];assert.ok(icon,`Missing ${item.key}`);
  const source=`assets/equipment/${(slot==='weapon'?runtime.weapons:runtime.bodies)[item.key].image}`;assert.equal(icon.source,source);assert.equal(icon.sourceSha256,createHash('sha256').update(read(source)).digest('hex'),`${item.key}: runtime changed; recalibrate icon`);
  const png=read(`assets/shop/${icon.file}`);assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');const [x,y,w,h]=icon.frame;assert.ok(x>=0&&y>=0&&w>0&&h>0);assert.ok(x+w<=png.readUInt32BE(16)&&y+h<=png.readUInt32BE(20));
 }
 assert.deepEqual(Object.keys(manifest.icons).sort(),expected.sort());assert.equal(new Set(Object.values(manifest.icons).map(v=>v.file)).size,expected.length);
});
test('draw resolves by appearance ID, independent of rarity or catalog ordering; bonus art still uses its atlas',async()=>{
 const manifest=JSON.parse(read('assets/runtime/shop-manifest.json'));
 const {runtimeArtUrl}=await import('../src/coop/runtime-art.js');
 const oldFetch=globalThis.fetch,oldImage=globalThis.Image;globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(manifest)});
 globalThis.Image=class{set src(value){this.url=value;}async decode(){}};
 try{
  const {loadShopEventArt,drawEquipmentIcon,drawBonusCreature,shopEventArtState}=await import('../src/coop/shop-event-art.js');await loadShopEventArt();assert.deepEqual(shopEventArtState(),{ready:true,equipmentIcons:21,bonusFrames:8});
  const draws=[],ctx={drawImage(...args){draws.push(args);},save(){},restore(){},scale(){}};
  for(const [key,icon] of Object.entries(manifest.icons).reverse())for(const rarity of ['common','legendary']){assert.equal(drawEquipmentIcon(ctx,{visualKey:key,rarity},10,20,64),true);const call=draws.at(-1);assert.equal(call[0].url,new URL(icon.file,new URL('assets/shop/',root)).href);assert.deepEqual(call.slice(1,5),icon.frame);assert.equal(Math.round(Math.max(call[7],call[8])),64);}
  assert.equal(drawEquipmentIcon(ctx,{appearance:'mage_armor_leaf'},0,0,64),true);assert.equal(drawEquipmentIcon(ctx,{visualKey:'missing'},0,0,64),false);
  drawBonusCreature(ctx,{bonusKind:'gold',stride:.6,stats:{size:350}});assert.equal(draws.at(-1)[0].url,runtimeArtUrl('assets/shop/bonus.png',root));assert.deepEqual(draws.at(-1).slice(1,5),manifest.bonus.frames[6]);
 }finally{globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});
