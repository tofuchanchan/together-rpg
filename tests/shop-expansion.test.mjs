import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {rollEquipment} from '../src/coop/equipment-data.js';
import {handleShopInput} from '../src/coop/shop-view.js';
const store=()=>{const w=new World(55);w.reset(['warrior','mage'],2);w.room=5;w.mode='complete';w.heroes.forEach(h=>h.gold=2000);w.enterShop();return w;};
test('all fifth items, tabs, target row and exit are navigable without affecting the other player',()=>{
 const w=store(),s=w.shop.stalls[0],peer=structuredClone(w.shop.stalls[1]),v={world:w,router:{flush(){assert.fail();}}};
 for(const category of ['equipment','skills','recruits']){
  assert.equal(s.category,category);for(let i=0;i<4;i++)handleShopInput(v,0,{down:true});
  assert.equal(s.cursor,4);handleShopInput(v,0,{skill1:true});assert.equal(s.inspect.index,4);handleShopInput(v,0,{cancel:true});
  for(let i=0;i<4;i++)handleShopInput(v,0,{up:true});handleShopInput(v,0,{tabRight:true});
 }
 handleShopInput(v,0,{cancel:true});assert.equal(s.cursor,7);handleShopInput(v,0,{confirm:true});assert.deepEqual(w.shop.ready,[true,false]);assert.deepEqual(w.shop.stalls[1],peer);
});
test('each personal store has five equipment, five different lessons and five candidates',()=>{
 const w=store();for(const [i,s] of w.shop.stalls.entries()){assert.equal(s.offers.length,5);assert.equal(s.lessons.length,5);assert.equal(s.recruits.length,5);assert.ok(s.lessons.every(Boolean));assert.equal(new Set(s.lessons.map(l=>l.key)).size,5);assert.ok([...s.offers,...s.lessons].every(o=>o.role===w.heroes[i].role));assert.equal(new Set([...s.offers,...s.lessons,...s.recruits].map(o=>o.uid)).size,15);assert.ok(s.offers.some(o=>o.slot==='weapon'));assert.ok(s.offers.some(o=>o.slot==='armor'));}
});
test('fifth equipment and fifth candidate can be purchased using only owner funds',()=>{
 const w=store(),s=w.shop.stalls[1];assert.equal(w.buyEquipment(1,4,1,s.offers[4].uid).ok,true);assert.equal(w.recruit(1,s.recruits[4].uid).ok,true);assert.equal(w.heroes[0].gold,2000);assert.equal(w.heroes.length,3);assert.equal(s.recruits[4].hired,true);assert.ok(!s.recruits[0].hired);
});
test('multiple lesson purchases use escalating personal prices; reroll cannot reset the surcharge',()=>{
 const w=store(),s=w.shop.stalls[0],first=s.lessons[0],second=s.lessons[1],base=second.price;assert.equal(w.buyLesson(0,0,first.uid).ok,true);assert.ok(second.price>base);const secondPrice=second.price;assert.equal(w.buyLesson(0,0,second.uid).ok,true);assert.equal(w.heroes[0].gold,2000-first.price-secondPrice);assert.equal(s.lessonPurchases,2);assert.equal(w.shop.stalls[1].lessonPurchases,0);w.rerollShop(0);assert.equal(s.lessonPurchases,2);assert.ok(s.lessons.filter(Boolean).every(l=>l.price===Math.ceil(l.basePrice*1.7)));
});
test('the same appearance rolls every rarity and names expose meaningful stat prefixes',()=>{
 const items=[.9,.3,.05,0].map((rarity,i)=>{let n=0;return rollEquipment('archer','weapon',5,()=>n++===0?rarity:.05,`r${i}`);});
 assert.equal(new Set(items.map(o=>o.visualKey)).size,1);assert.deepEqual(items.map(o=>o.affixes.length),[0,1,2,3]);assert.ok(items[3].name.startsWith('传奇·'));assert.ok(items.every(o=>o.name.includes(o.baseName)));assert.equal(new Set(items.map(o=>o.name)).size,4);
 // Worst higher tier must beat the best lower tier at the same room.
 const extremes=(rarity,roll)=>{let n=0;return rollEquipment('archer','weapon',5,()=>n++===0?rarity:roll,`${rarity}/${roll}`);};
 assert.ok(extremes(.05,0).affixes[0].strength>extremes(.3,.999).affixes[0].strength);assert.ok(extremes(0,0).affixes[0].strength>extremes(.05,.999).affixes[0].strength);
});
