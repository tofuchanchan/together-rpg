import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {createHero} from '../src/coop/recruitment.js';
import {shopRerollPrice} from '../src/coop/shop.js';
const world=()=>{const w=new World(274);w.reset(['warrior','mage'],2);w.obstacles=[];w.enemies=[];w.heroes.forEach((h,i)=>{h.x=i*500;h.y=0;});return w;};
const shop=()=>{const w=world();w.heroes.forEach(h=>h.gold=1000);w.room=5;w.mode='complete';w.enterShop();return w;};

test('gold goes only to the collecting human, once, while XP remains shared',()=>{
 const w=world();w.pickups=[{id:900,type:'gold',value:7,x:500,y:0}];w.updatePickups(1/60);w.updatePickups(1/60);
 assert.deepEqual(w.heroes.map(h=>h.gold),[0,7]);assert.equal(w.pickups.length,0);
 w.pickups=[{id:901,type:'xp',value:3,x:0,y:0}];w.updatePickups(1/60);assert.equal(w.xp,3);
 assert.deepEqual(w.snapshot().heroes.map(h=>h.gold),[0,7]);assert.equal(Object.hasOwn(w.snapshot(),'gold'),false);
});
test('AI cannot collect or retain attraction to gold; a nearby human can',()=>{
 const w=world(),ai=createHero('archer',2,{ai:true});ai.x=1000;ai.y=0;w.heroes.push(ai);
 w.pickups=[{id:900,type:'gold',value:4,x:1000,y:0,attractedTo:2}];w.updatePickups(1/60);
 assert.equal(w.pickups.length,1);assert.equal(ai.gold,0);w.heroes[1].x=1000;w.updatePickups(1/60);assert.equal(w.heroes[1].gold,4);assert.equal(ai.gold,0);
});
test('overlapping human pickups never duplicate gold; restart clears both wallets',()=>{
 const w=world();w.heroes[1].x=0;w.pickups=[{id:900,type:'gold',value:9,x:0,y:0}];w.updatePickups(1/60);
 assert.equal(w.heroes.reduce((n,h)=>n+h.gold,0),9);assert.equal(w.heroes.filter(h=>h.gold).length,1);
 w.reset(['warrior','mage'],2);assert.deepEqual(w.heroes.map(h=>h.gold),[0,0]);
});
test('each shop rolls only its owner class and rerolls leave partner stock and readiness intact',()=>{
 const w=shop();w.shop.ready[1]=true;const other=structuredClone(w.shop.stalls[1]);
 for(let i=0;i<8;i++){const s=w.shop.stalls[0];assert.ok(s.offers.every(o=>o.role==='warrior'));assert.equal(s.lessons[0].role,'warrior');const price=shopRerollPrice(w,0),gold=w.heroes[0].gold;assert.equal(w.rerollShop(0).ok,true);assert.equal(w.heroes[0].gold,gold-price);}
 assert.deepEqual(w.shop.stalls[1],other);assert.equal(w.shop.ready[1],true);assert.equal(w.heroes[1].gold,1000);assert.ok(other.offers.every(o=>o.role==='mage'));assert.equal(other.lessons[0].role,'mage');
});
test('a rich partner cannot pay and foreign inventory UIDs or human recipients are rejected',()=>{
 const w=shop(),a=w.shop.stalls[0],b=w.shop.stalls[1];w.heroes[0].gold=0;
 assert.equal(w.buyEquipment(0,0,0,a.offers[0].uid).ok,false);assert.equal(w.rerollShop(0).ok,false);assert.equal(w.recruit(0,a.recruits[0].uid).ok,false);
 w.heroes[0].gold=1000;assert.equal(w.buyEquipment(0,0,0,b.offers[0].uid).ok,false);assert.equal(w.buyLesson(0,0,b.lessons[0].uid).ok,false);assert.equal(w.recruit(0,b.recruits[0].uid).ok,false);
 w.heroes[1].role='warrior';assert.equal(w.buyEquipment(0,0,1,a.offers[0].uid).ok,false);assert.deepEqual(w.heroes.map(h=>h.gold),[1000,1000]);
});
test('each player can buy a lesson, with a separate purchase count and surcharge',()=>{
 const w=shop();for(let slot=0;slot<2;slot++){const s=w.shop.stalls[slot],price=s.lessons[0].price;assert.equal(w.buyLesson(slot,slot,s.lessons[0].uid).ok,true);assert.equal(w.heroes[slot].gold,1000-price);assert.equal(s.lessonPurchases,1);assert.equal(w.buyLesson(slot,slot,s.lessons[0].uid).ok,false);const uid=s.lessons[0].uid;w.rerollShop(slot);assert.equal(s.lessonPurchases,1);assert.equal(w.buyLesson(slot,slot,uid).ok,false);}
});
test('party replacement revalidates the selected companion after another player recruits',()=>{
 const w=shop();w.heroes.push(createHero('archer',2,{ai:true}));const a=w.shop.stalls[0],b=w.shop.stalls[1];
 assert.equal(w.recruit(0,a.recruits[0].uid).status,'replace-required');assert.equal(w.recruit(1,b.recruits[0].uid).status,'replace-required');
 const before=w.heroes[1].gold;assert.equal(w.recruit(0,a.recruits[0].uid,2).ok,true);const hired=w.heroes[2];
 assert.equal(w.recruit(1,b.recruits[0].uid,2).ok,false);assert.equal(w.heroes[1].gold,before);assert.equal(w.heroes[2],hired);assert.equal(w.heroes.length,3);
 assert.equal(w.recruit(1,b.recruits[0].uid).status,'replace-required');assert.equal(w.recruit(1,b.recruits[0].uid,2).ok,true);assert.equal(w.heroes.length,3);
});
