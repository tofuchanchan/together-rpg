import test from 'node:test';
import assert from 'node:assert/strict';
import {createHero,rollRecruit} from '../src/coop/recruitment.js';
import {applyReward,skillPool} from '../src/coop/builds.js';
import {selectAiReward} from '../src/coop/ai-build.js';
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);

test('recruits spend their existing first two build points learning both base actives',()=>{
 for(let seed=1;seed<=100;seed++){
  const w={room:5,level:7,heroes:[createHero('mage',0,{level:7})]},r=rollRecruit(w,rng(seed),`foundation-${seed}`);
  assert.ok(r.hero.skills.every(n=>n>=1),`seed ${seed} has no working pair of active skills`);
  assert.equal(r.buildPoints,3);assert.equal(r.buildPointsUsed,3);assert.equal(r.attributePointsUsed,6);
  const replay=createHero(r.role,0,{level:7,rarity:r.rarity});for(const key of r.attributeChoices)applyReward(replay,key);
  for(const card of r.buildChoices){assert.ok(card.offers.includes(card.key));assert.ok(skillPool(replay,{clears:card.clears}).some(o=>o.key===card.key));assert.equal(applyReward(replay,card.key,card.replaceKey?{replaceKey:card.replaceKey}:{}).ok,true);}
  assert.deepEqual(replay.skills,r.hero.skills);
 }
});

test('automatic rewards preserve shield dependencies and can decline a destructive full-slot hand',()=>{
 const h=createHero('warrior',0,{ai:true});h.skills=[1,1];h.passives={guard:1,storage:2,harvest:2,thorns:2};
 const before=structuredClone(h),offers=skillPool(h).filter(o=>['passive:chill','passive:focus','passive:momentum'].includes(o.key));
 assert.equal(offers.length,3);assert.equal(selectAiReward(h,offers),null);assert.deepEqual(h,before);
 const upgrade=skillPool(h).find(o=>o.key==='passive:guard');assert.equal(selectAiReward(h,[...offers,upgrade]).offer.key,'passive:guard');assert.deepEqual(h,before);
});

test('automatic form changes cannot leave a previously working conversion without its source',()=>{
 const h=createHero('mage',0,{ai:true});h.skills=[2,1];h.passives={ember:2,emberConsume:1};
 const ice=skillPool(h).find(o=>o.key==='form:0:icelance');assert.ok(ice);assert.equal(selectAiReward(h,[ice]),null);
});

test('AI may repair an already inactive slot while preserving all still-active dependencies',()=>{
 const h=createHero('warrior',0,{ai:true});h.skills=[1,1];h.passives={storage:1,harvest:2,thorns:2,focus:2};
 const guard=skillPool(h).find(o=>o.key==='passive:guard'),decision=selectAiReward(h,[guard]);assert.ok(decision);assert.equal(decision.offer.key,'passive:guard');
 const probe=structuredClone(h);assert.equal(applyReward(probe,decision.offer.key,decision.options).ok,true);
 assert.ok(probe.passives.guard);assert.ok(Object.keys(probe.passives).length<=4);
});
