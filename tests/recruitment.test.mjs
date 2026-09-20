import test from 'node:test';
import assert from 'node:assert/strict';
import {createHero,HERO_ROLES,RECRUIT_RARITIES,rollRecruit,recruitPrice} from '../src/coop/recruitment.js';
import {applyReward,attributePool,skillPool} from '../src/coop/builds.js';
import {applyEquipment,rollEquipment,unequipEquipment,withEquipmentBase} from '../src/coop/equipment.js';
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const world=(level=5,room=5)=>({level,room,heroes:[createHero('warrior',0,{level})],gold:65,enemies:[],pets:[],universalObjects:[],equipmentObjects:[],effects:[],nextId:42});

test('shared factory preserves all combat defaults and fresh nested state',()=>{
 for(const role of Object.keys(HERO_ROLES)){
  const a=createHero(role,0),b=createHero(role,1);
  assert.equal(a.hp,HERO_ROLES[role].hp);assert.equal(a.maxHp,a.hp);assert.equal(a.level,1);assert.equal(a.ai,false);
  assert.equal(a.power,1);assert.equal(a.skillPower,1);assert.equal(a.critDamage,1.5);assert.equal(a.rerolls,3);assert.equal(a.pickupRadius,75);
  assert.deepEqual(a.skills,[0,0]);assert.deepEqual(a.equipment,{weapon:null,armor:null});assert.equal(a.core,null);assert.equal(a.action,null);
  for(const key of ['skills','passives','forms','evolutionBranches','runes','move','lastMove','cd','equipment','evolved'])assert.notEqual(a[key],b[key]);
  for(const key of ['shield','casts','swings','directHits','charged','empowered','dodgeCd','attackCd','stride','gait','hitFlash','visualStop','invuln','revive','damageDone','resource','storedGuard','huntStacks','guardUntil'])assert.equal(a[key],0,key);
 }
 assert.throws(()=>createHero('rogue',0));
 const high=createHero('mage',2,{level:12,ai:true,name:'雪芽'});assert.equal(high.level,12);assert.equal(high.ai,true);assert.equal(high.name,'雪芽');assert.equal(high.power,1);assert.deepEqual(high.skills,[0,0]);
});

test('candidate level rounds human average, excluding high AI levels and room number',()=>{
 const w=world(2,100);w.heroes.push(createHero('mage',1,{level:7}),createHero('archer',2,{level:99,ai:true}));
 const c=rollRecruit(w,random(31),'candidate');assert.equal(c.level,5);assert.equal(c.hero.level,5);assert.equal(c.attributePoints,4);assert.equal(c.buildPoints,2);
 assert.equal(rollRecruit({...w,heroes:[]},random(31),'empty').level,1);
 assert.equal(rollRecruit({...w,level:8,heroes:[{role:'mage',ai:false}]},random(31),'legacy').level,8);
});

test('rarity adds only listed base values, never points, skill levels or gear quality',()=>{
 const make=rank=>{const seeded=random(82);let calls=0;return rollRecruit(world(15),()=>++calls===3?[.1,.7,.9,.99][rank-1]:seeded(),`rank-${rank}`);};
 const ordinary=make(1);
 for(let rank=2;rank<=4;rank++){
  const c=make(rank),bonus=RECRUIT_RARITIES[rank];assert.equal(c.rarity,rank);assert.equal(c.level,ordinary.level);
  assert.equal(c.buildPoints,ordinary.buildPoints);assert.equal(c.attributePoints,ordinary.attributePoints);
  assert.deepEqual(c.attributeChoices,ordinary.attributeChoices);assert.deepEqual(c.buildChoices,ordinary.buildChoices);assert.deepEqual(c.hero.skills,ordinary.hero.skills);
  assert.equal(c.hero.maxHp-ordinary.hero.maxHp,bonus.hp);assert.ok(Math.abs(c.hero.power-ordinary.hero.power-bonus.power)<1e-10);assert.ok(Math.abs(c.hero.skillPower-ordinary.hero.skillPower-bonus.skillPower)<1e-10);
  for(const slot of ['weapon','armor'])assert.deepEqual({...c.hero.equipment[slot],uid:null},{...ordinary.hero.equipment[slot],uid:null});
 }
});

test('generation is seeded and has no world mutation or temporary combat objects',()=>{
 const w=world(18),before=structuredClone(w),c=rollRecruit(w,random(123),'first');
 assert.deepEqual(w,before);assert.deepEqual(c,rollRecruit(w,random(123),'first'));
 assert.equal(c.hero.id,-1);assert.equal(c.hero.ai,true);assert.equal(c.hero.hp,c.hero.maxHp);assert.equal(c.hero.shadow,null);assert.equal(c.hero.shield,0);assert.deepEqual(c.hero.equipmentState,{});
 assert.equal(c.hero.equipment.weapon.uid,'first-weapon');assert.equal(c.hero.equipment.armor.uid,'first-armor');
 assert.throws(()=>rollRecruit(w,null,'bad'));assert.throws(()=>rollRecruit(w,random(1)));
});

test('same-role hires are eligible and starting levels do not receive free skills',()=>{
 const w=world(1),c=rollRecruit(w,()=>.2,'same');assert.equal(c.role,'warrior');assert.equal(c.hero.role,w.heroes[0].role);
 assert.equal(c.attributePoints,0);assert.equal(c.buildPoints,0);assert.equal(c.buildPointsUsed,0);assert.deepEqual(c.hero.skills,[0,0]);assert.deepEqual(c.hero.passives,{});assert.equal(c.hero.core,null);
 const level2=rollRecruit(world(2),random(2),'level2');assert.equal(level2.attributePointsUsed,1);assert.equal(level2.buildPointsUsed,0);assert.deepEqual(level2.hero.skills,[0,0]);
});

test('1000 seeded recruits replay only legal selections within separate level budgets',()=>{
 for(let seed=1;seed<=1000;seed++){
  const level=1+seed%40,c=rollRecruit(world(level,5+seed%20),random(seed),`seed-${seed}`),h=createHero(c.role,-1,{ai:true,level:c.level,name:c.name,rarity:c.rarity});
  assert.equal(c.attributePoints,level-1);assert.equal(c.attributePointsUsed,c.attributePoints);assert.equal(c.buildPoints,Math.floor((level-1)*.65));assert.equal(c.buildPointsUsed,c.buildPoints);
  assert.equal(c.buildPointsUsed,c.buildChoices.length);assert.equal(c.attributePointsUsed,c.attributeChoices.length);
  for(const key of c.attributeChoices){assert.ok(attributePool(h).some(o=>o.key===key));assert.equal(applyReward(h,key).ok,true);}
  for(const chosen of c.buildChoices){
   assert.ok(chosen.offers.includes(chosen.key));assert.ok(skillPool(h,{clears:chosen.clears}).some(o=>o.key===chosen.key));
   assert.equal(applyReward(h,chosen.key,chosen.replaceKey?{replaceKey:chosen.replaceKey}:{}).ok,true);assert.ok(Object.keys(h.passives).length<=4);
  }
  assert.deepEqual(h.passives,c.hero.passives);assert.deepEqual(h.skills,c.hero.skills);assert.deepEqual(h.forms,c.hero.forms);assert.equal(h.core,c.hero.core);
  for(const [key,rank] of Object.entries(h.passives))assert.ok(skillPool({...h,passives:{...h.passives,[key]:Math.min(rank,2)}}).some(o=>o.key===`passive:${key}`),`${seed}: ${key} lost source`);
  assert.ok(h.skills.every(n=>n<=3));assert.ok(Object.values(h.passives).every(n=>n<=3));assert.equal(c.hero.awakening,null);
  assert.equal(c.hero.equipment.weapon.role,c.role);assert.equal(c.hero.equipment.armor.role,c.role);
  assert.ok(c.price>Object.values(c.hero.equipment).reduce((sum,item)=>sum+item.sellPrice,0));
 }
});

test('recruit price competes with early equipment and charges for valuable carried gear',()=>{
 const candidate={level:3,rarity:1,hero:{equipment:{weapon:{price:24,sellPrice:6,rarity:1},armor:{price:24,sellPrice:6,rarity:1}}}};
 assert.equal(recruitPrice(candidate),30);assert.equal(recruitPrice({...candidate,rarity:2}),38);
 for(const item of Object.values(candidate.hero.equipment))Object.assign(item,{price:72,sellPrice:18,rarity:3});assert.equal(recruitPrice(candidate),106);
 for(const item of Object.values(candidate.hero.equipment))Object.assign(item,{price:112,sellPrice:28,rarity:4});assert.equal(recruitPrice(candidate),198);
});

test('equipment can be removed without losing existing or subsequent training',()=>{
 const c=rollRecruit(world(8),random(101),'train'),h=c.hero;
 unequipEquipment(h,'weapon');unequipEquipment(h,'armor');h.haste=1.95;
 assert.equal(h.role,'warrior');const item=rollEquipment(h.role,'weapon',5,()=>.6,'haste');assert.equal(item.main.stat,'haste');assert.equal(applyEquipment(h,item).ok,true);
 assert.ok(h.haste>2);withEquipmentBase(h,()=>{assert.ok(attributePool(h).some(o=>o.key==='haste'));applyReward(h,'haste');});
 assert.ok(Math.abs(h.haste-2-item.main.value)<1e-10);unequipEquipment(h,'weapon');assert.ok(Math.abs(h.haste-2)<1e-10);
});
