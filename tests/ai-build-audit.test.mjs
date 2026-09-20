import test from 'node:test';
import assert from 'node:assert/strict';
import {createHero,rollRecruit} from '../src/coop/recruitment.js';
import {applyReward,skillPool} from '../src/coop/builds.js';
import {applyEquipment,rollEquipment,unequipEquipment,withEquipmentBase} from '../src/coop/equipment.js';
import {selectAiReward} from '../src/coop/ai-build.js';
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);

test('foundation at the actual level boundary spends existing points, including every rarity',()=>{
 for(let level=1;level<=6;level++)for(let rarity=1;rarity<=4;rarity++){
  let calls=0;const seeded=random(71),rng=()=>++calls===3?[.1,.7,.9,.99][rarity-1]:seeded();
  const c=rollRecruit({room:5,heroes:[createHero('mage',0,{level})]},rng,`${level}-${rarity}`),budget=Math.floor((level-1)*.65);
  assert.equal(c.rarity,rarity);assert.equal(c.buildPointsUsed,budget);assert.equal(c.attributePointsUsed,level-1);
  const foundations=c.buildChoices.filter(o=>o.offerSource==='base-active-training');
  assert.equal(foundations.length,Math.min(2,budget));
  assert.equal(new Set(foundations.map(o=>o.key)).size,foundations.length);
  assert.ok(foundations.every(o=>o.key.startsWith('active:')));
  assert.equal(c.hero.skills.filter(Boolean).length,Math.min(2,budget));
 }
});

test('AI probes keep equipped ward sources and nested live state without sharing mutations',()=>{
 const h=createHero('warrior',0,{ai:true});h.skills=[3,3];h.passives={storage:2,shieldBrood:1};
 const gear=rollEquipment('warrior','armor',5,()=>0,'ward-audit');gear.main={stat:'armor',value:.035};gear.affixes=[{key:'spellWard',strength:1}];
 assert.equal(applyEquipment(h,gear).ok,true);h.resourceEvents=new Set([11,12]);h.universal={shields:[{amount:8,until:4,equipment:true}],castIds:new Set([4])};h.shield=8;
 const before=structuredClone(h),card=skillPool(h).find(o=>o.key==='passive:storage');assert.ok(card);
 const selected=selectAiReward(h,[card]);assert.equal(selected?.offer.key,card.key);assert.deepEqual(h,before);
 assert.equal(applyReward(h,selected.offer.key,selected.options).ok,true);assert.equal(h.passives.storage,3);
 assert.equal(unequipEquipment(h,'armor').ok,true);
 assert.equal(selectAiReward(h,[{...card,key:'passive:shieldBrood'}]),null,'unequipped ward cannot remain a usable shield source');
});

test('AI rewards respect HP gear and training caps, and full-rank source cards remain protected',()=>{
 const h=createHero('warrior',0,{ai:true});h.skills=[3,3];h.passives={guard:3,storage:3,harvest:3,thorns:3};
 const gear=rollEquipment('warrior','armor',5,()=>0,'health-audit');gear.main={stat:'maxHp',value:32};gear.affixes=[];applyEquipment(h,gear);h.hp=10;
 const before=structuredClone(h),hp={key:'high:hp',kind:'attribute'},choice=selectAiReward(h,[hp]);assert.equal(choice?.offer.key,'high:hp');assert.deepEqual(h,before);
 applyReward(h,choice.offer.key,choice.options);assert.equal(h.maxHp,before.maxHp+60);assert.equal(h.hp,70);unequipEquipment(h,'armor');assert.equal(h.maxHp,before.maxHp+60-32);
 const destructive=skillPool(h).filter(o=>['passive:chill','passive:focus','passive:momentum'].includes(o.key));assert.equal(destructive.length,3);assert.equal(selectAiReward(h,destructive),null);
 const weapon=rollEquipment('warrior','weapon',5,()=>0,'crit-cap-audit');weapon.main={stat:'crit',value:.07};h.crit=.61;applyEquipment(h,weapon);
 const capBefore=structuredClone(h),train=selectAiReward(h,[{key:'crit',kind:'attribute'}]);assert.equal(train?.offer.key,'crit');assert.deepEqual(h,capBefore);
 withEquipmentBase(h,()=>applyReward(h,train.offer.key));assert.ok(Math.abs(h.crit-.72)<1e-10);unequipEquipment(h,'weapon');assert.ok(Math.abs(h.crit-.65)<1e-10);
});
