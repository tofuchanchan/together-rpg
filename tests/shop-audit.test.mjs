import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {createHero} from '../src/coop/recruitment.js';
import {rollEquipment} from '../src/coop/equipment.js';
import {handleShopInput} from '../src/coop/shop-view.js';

function shop(){const w=new World(419);w.reset(['warrior','warrior'],2);w.room=5;w.mode='complete';w.heroes.forEach(h=>h.gold=1000);w.enterShop();w.shop.stalls.forEach((s,i)=>s.offers[0]=rollEquipment('warrior','weapon',5,()=>.9,`audit-stock-${i}`));return w;}
// The app only stops dispatching the same input frame when the shared party changes.
function frame(w,inputs){const view={world:w,router:{flush(){}}},revision=w.shop.partyRevision;for(let slot=0;slot<w.humanCount&&w.mode==='shop';slot++){handleShopInput(view,slot,inputs[slot]||{});if(w.shop.partyRevision!==revision)break;}}
for(const close of ['confirm','cancel','reroll','skill1'])test(`${close} closes only own details while partner buys`,()=>{
 const w=shop(),[a,b]=w.shop.stalls;a.inspect={type:'item',index:0};frame(w,[{[close]:true},{confirm:true}]);assert.equal(a.inspect,null);assert.equal(w.heroes[0].gold,1000);assert.equal(a.offers[0].sold,undefined);assert.equal(b.offers[0].sold,true);assert.equal(w.heroes[1].gold,1000-b.offers[0].price);
});
test('opening details leaves partner shop interactive',()=>{const w=shop();frame(w,[{skill1:true},{confirm:true}]);assert.deepEqual(w.shop.stalls[0].inspect,{type:'item',index:0});assert.equal(w.heroes[0].gold,1000);assert.equal(w.shop.stalls[1].offers[0].sold,true);});
for(const cancel of ['cancel','reroll'])test(`${cancel} cancels own replacement without blocking partner purchase`,()=>{
 const w=shop(),old=createHero('mage',2,{ai:true});w.heroes.push(old);w.recruit(0,w.shop.stalls[0].recruits[0].uid);frame(w,[{[cancel]:true},{confirm:true}]);assert.equal(w.shop.stalls[0].replacing,null);assert.equal(w.heroes[2],old);assert.equal(w.heroes[0].gold,1000);assert.equal(w.shop.stalls[1].offers[0].sold,true);
});
test('X cannot open unrelated details from refresh or leave rows',()=>{for(const cursor of [5,6,7]){const w=shop();w.shop.stalls[0].cursor=cursor;frame(w,[{skill1:true},{}]);assert.equal(w.shop.stalls[0].inspect,null);assert.equal(w.shop.stalls[0].cursor,cursor);}});
test('B highlights own leave without confirming departure',()=>{const w=shop();frame(w,[{cancel:true},{}]);assert.equal(w.shop.stalls[0].cursor,7);assert.deepEqual(w.shop.ready,[false,false]);assert.equal(w.mode,'shop');assert.deepEqual(w.heroes.map(h=>h.gold),[1000,1000]);});
test('simultaneous purchases use separate wallets and stock',()=>{const w=shop();frame(w,[{confirm:true},{confirm:true}]);w.shop.stalls.forEach((s,i)=>{assert.equal(w.heroes[i].gold,1000-s.offers[0].price);assert.equal(w.heroes[i].equipment.weapon.uid,s.offers[0].uid);});});
test('simultaneous reroll and buy preserves the partner original offer',()=>{const w=shop(),[a,b]=w.shop.stalls,uid=b.offers[0].uid;a.cursor=6;frame(w,[{confirm:true},{confirm:true}]);assert.equal(w.heroes[0].gold,990);assert.equal(w.heroes[1].equipment.weapon.uid,uid);assert.equal(b.offers[0].sold,true);assert.ok(a.offers.every(o=>!o.sold));});
test('simultaneous recruitment cannot silently fill and replace the last party slot',()=>{const w=shop();w.shop.stalls.forEach(s=>{s.category='recruits';s.cursor=0;});frame(w,[{confirm:true},{confirm:true}]);assert.equal(w.heroes.length,3);assert.equal(w.shop.stalls[0].recruits[0].hired,true);assert.ok(!w.shop.stalls[1].recruits[0].hired);assert.equal(w.heroes[1].gold,1000);frame(w,[{}, {confirm:true}]);assert.deepEqual(w.shop.stalls[1].replacing.choices,[2]);assert.equal(w.heroes[1].gold,1000);});
test('replacing an AI purges every old owner credit without touching teammate or shared loot',()=>{
 const w=shop(),old=createHero('mage',2,{ai:true});w.heroes.push(old);const e=w.createEnemy('goblin',0,0);w.enemies=[e];
 for(const key of ['contributors','directContributors','universalContributors','huntMarks','chillBy','statusOwners'])e[key]={0:{time:1},2:{time:1}};
 e.pursuitCredit={owner:2,stacks:4};e.statuses=[{owner:2,type:'burn'},{owner:0,type:'bleed'}];
 w.pets=[{id:11,owner:2,kind:'dog',life:5},{id:12,owner:0,kind:'dog',life:5}];w.universalObjects=[{owner:2,kind:'mine'},{owner:0,kind:'mine'}];w.equipmentObjects=[{owner:2,kind:'snare'},{owner:0,kind:'snare'}];
 w.projectiles=[{owner:2},{owner:0}];w.hazards=[{owner:2},{owner:0}];w.delayed=[{owner:2},{owner:0}];w.effects=[{owner:2,type:'build'},{owner:0,type:'build'}];w.pickups=[{id:21,owner:2,type:'magnetic'},{id:22,owner:0,type:'magnetic'},{id:23,type:'gold',value:3}];w.deathQueue=[{enemy:e,owner:old},{enemy:e,owner:w.heroes[0]}];
 const uid=w.shop.stalls[0].recruits[0].uid,gold=w.heroes[0].gold,price=w.shop.stalls[0].recruits[0].price,prompt=w.recruit(0,uid),result=w.recruit(0,uid,2);assert.equal(result.ok,true);assert.equal(w.heroes[2].id,2);assert.notEqual(w.heroes[2],old);assert.equal(w.heroes[0].gold,gold-price);
 for(const list of ['pets','universalObjects','equipmentObjects','projectiles','hazards','delayed','effects']){assert.ok(w[list].every(o=>o.owner!==2),list);assert.ok(w[list].some(o=>o.owner===0),list);}
 assert.deepEqual(w.pickups.map(o=>o.id),[22,23]);assert.equal(w.deathQueue.length,1);assert.equal(w.deathQueue[0].owner.id,0);assert.equal(e.pursuitCredit,undefined);assert.deepEqual(e.statuses,[{owner:0,type:'bleed'}]);
 for(const key of ['contributors','directContributors','universalContributors','huntMarks','chillBy','statusOwners']){assert.equal(e[key][2],undefined,key);assert.ok(e[key][0],key);}
});
test('a completed twentieth-room shop preserves victory instead of reopening or skipping endless',()=>{
 const w=shop();w.room=20;w.shopVisitedRoom=5;w.mode='victory';w.enterShop();assert.equal(w.shop.returnMode,'victory');w.leaveShop(0);assert.equal(w.mode,'shop');w.leaveShop(1);assert.equal(w.mode,'victory');assert.equal(w.enterShop(),false);w.startEndless();assert.equal(w.room,21);assert.equal(w.endless,true);assert.equal(w.mode,'play');
});
