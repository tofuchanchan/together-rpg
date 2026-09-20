import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {createHero} from '../src/coop/recruitment.js';
import {rollEquipment} from '../src/coop/equipment.js';
import {handleShopInput} from '../src/coop/shop-view.js';

function shop(){const w=new World(419);w.reset(['warrior','warrior'],2);w.room=5;w.mode='complete';w.gold=1000;w.enterShop();w.shop.offers[0]=rollEquipment('warrior','weapon',5,()=>.9,'audit-stock');w.shop.cursors=[0,0];return w;}
// The app samples both inputs together, then stops dispatching that snapshot
// once shared shop state changes. Exercise that same boundary with real handlers.
function frame(w,inputs){const view={world:w,router:{flush(){}}},revision=w.shop.revision;for(let slot=0;slot<w.humanCount&&w.mode==='shop';slot++){handleShopInput(view,slot,inputs[slot]||{});if(w.shop.revision!==revision)break;}}

test('closing shared details cannot turn a simultaneous partner confirm into a hidden purchase',()=>{
 const w=shop();w.shop.inspect={type:'item',index:0};const gold=w.gold;
 frame(w,[{confirm:true},{confirm:true}]);assert.equal(w.shop.inspect,null);assert.equal(w.gold,gold);assert.equal(w.shop.offers[0].sold,undefined);
});
test('opening details survives a partner confirm from the previous screen',()=>{
 const w=shop(),gold=w.gold;frame(w,[{skill1:true},{confirm:true}]);assert.deepEqual(w.shop.inspect,{type:'item',index:0});assert.equal(w.gold,gold);
});
test('cancelling AI replacement cannot also spend the partner old-screen buy input',()=>{
 const w=shop();w.heroes.push(createHero('mage',2,{ai:true}));w.shop.replacing={slot:0,uid:w.shop.recruit.uid,choices:[2],selection:0};const gold=w.gold;
 frame(w,[{reroll:true},{confirm:true}]);assert.equal(w.shop.replacing,null);assert.equal(w.gold,gold);assert.equal(w.shop.offers[0].sold,undefined);
});
test('shared stock still accepts exactly one simultaneous valid purchase',()=>{
 const w=shop(),gold=w.gold,item=w.shop.offers[0];frame(w,[{confirm:true},{confirm:true}]);assert.equal(w.gold,gold-item.price);assert.equal(w.heroes[0].equipment.weapon.uid,item.uid);assert.equal(w.heroes[1].equipment.weapon,null);
});
test('replacing an AI purges every old owner credit without touching teammate or shared loot',()=>{
 const w=shop(),old=createHero('mage',2,{ai:true});w.heroes.push(old);const e=w.createEnemy('goblin',0,0);w.enemies=[e];
 for(const key of ['contributors','directContributors','universalContributors','huntMarks','chillBy','statusOwners'])e[key]={0:{time:1},2:{time:1}};
 e.pursuitCredit={owner:2,stacks:4};e.statuses=[{owner:2,type:'burn'},{owner:0,type:'bleed'}];
 w.pets=[{id:11,owner:2,kind:'dog',life:5},{id:12,owner:0,kind:'dog',life:5}];w.universalObjects=[{owner:2,kind:'mine'},{owner:0,kind:'mine'}];w.equipmentObjects=[{owner:2,kind:'snare'},{owner:0,kind:'snare'}];
 w.projectiles=[{owner:2},{owner:0}];w.hazards=[{owner:2},{owner:0}];w.delayed=[{owner:2},{owner:0}];w.effects=[{owner:2,type:'build'},{owner:0,type:'build'}];w.pickups=[{id:21,owner:2,type:'magnetic'},{id:22,owner:0,type:'magnetic'},{id:23,type:'gold',value:3}];w.deathQueue=[{enemy:e,owner:old},{enemy:e,owner:w.heroes[0]}];
 const uid=w.shop.recruit.uid,gold=w.gold,price=w.shop.recruit.price,result=w.recruit(0,uid,2);assert.equal(result.ok,true);assert.equal(w.heroes[2].id,2);assert.notEqual(w.heroes[2],old);assert.equal(w.gold,gold-price);
 for(const list of ['pets','universalObjects','equipmentObjects','projectiles','hazards','delayed','effects']){assert.ok(w[list].every(o=>o.owner!==2),list);assert.ok(w[list].some(o=>o.owner===0),list);}
 assert.deepEqual(w.pickups.map(o=>o.id),[22,23]);assert.equal(w.deathQueue.length,1);assert.equal(w.deathQueue[0].owner.id,0);assert.equal(e.pursuitCredit,undefined);assert.deepEqual(e.statuses,[{owner:0,type:'bleed'}]);
 for(const key of ['contributors','directContributors','universalContributors','huntMarks','chillBy','statusOwners']){assert.equal(e[key][2],undefined,key);assert.ok(e[key][0],key);}
});
test('a completed twentieth-room shop preserves victory instead of reopening or skipping endless',()=>{
 const w=shop();w.room=20;w.shopVisitedRoom=5;w.mode='victory';w.enterShop();assert.equal(w.shop.returnMode,'victory');w.leaveShop(0);assert.equal(w.mode,'shop');w.leaveShop(1);assert.equal(w.mode,'victory');assert.equal(w.enterShop(),false);w.startEndless();assert.equal(w.room,21);assert.equal(w.endless,true);assert.equal(w.mode,'play');
});
