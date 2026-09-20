import fs from 'node:fs';
import assert from 'node:assert/strict';
import {rollEquipment,EQUIPMENT_AFFIXES} from '../src/coop/equipment-data.js';
import {createHero} from '../src/coop/recruitment.js';
import {applyReward,skillPool,evolutionStatus} from '../src/coop/builds.js';
import {ROUTES} from '../src/coop/progression-data.js';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const roles=['warrior','mage','archer'],percent=(n,d)=>+(n/d*100).toFixed(2),rows=[];
// The first three stock items follow fillStock's role/slot/item draws exactly.
// No repeated shop refresh, purchases or unseen stock selection is simulated.
for(const room of [5,10,15,20]){
 const n=10000,stats={room,stocks:n,noWarriorGear:0,noEitherOfTwoRoles:0,legendaryItems:0,legendaryAllThreeAffixes:0,slots:{weapon:{},armor:{}}};
 for(let seed=1;seed<=n;seed++){
  const random=rng(seed*104729+room*31),items=Array.from({length:3},(_,i)=>rollEquipment(roles[Math.floor(random()*3)],random()<.5?'weapon':'armor',room,random,`gear-${seed}-${i}`));
  if(!items.some(i=>i.role==='warrior'))stats.noWarriorGear++;
  if(!items.some(i=>['warrior','mage'].includes(i.role)))stats.noEitherOfTwoRoles++;
  for(const item of items){const signature=item.affixes.map(a=>a.key).sort().join('|')||'none';stats.slots[item.slot][signature]=(stats.slots[item.slot][signature]||0)+1;if(item.rarity===4){stats.legendaryItems++;if(item.affixes.length===3)stats.legendaryAllThreeAffixes++;assert.equal(item.affixes.length,3);}}
 }
 stats.noCompatibleSingleRolePercent=percent(stats.noWarriorGear,n);stats.noCompatibleTwoDistinctRolesPercent=percent(stats.noEitherOfTwoRoles,n);rows.push(stats);
}
const mage=createHero('mage',0);for(const key of ['active:0','active:1','form:1:coldfield','active:1','active:1'])assert(applyReward(mage,key).ok);
const frostDeadEnd={hero:{role:mage.role,skills:mage.skills,forms:mage.forms},status:evolutionStatus(mage,1),availableEvolutions:skillPool(mage,{clears:40,highReward:true}).filter(o=>o.kind==='evolution')};
assert.equal(frostDeadEnd.status.route,null);assert.equal(frostDeadEnd.status.branches.length,0);
const data={generatedAt:new Date().toISOString(),stockMethod:'10000 fixed-seed first-stock draws per shop; production rollEquipment and stock role/slot RNG order, no purchased gear injected',stocks:rows,affixKeys:Object.keys(EQUIPMENT_AFFIXES),distinctBehaviorSetsPerSlot:8,legendaryBehaviorSetsPerSlot:1,routeSlots:Object.fromEntries(roles.map(role=>[role,Object.entries(ROUTES).filter(([,r])=>r.role===role).map(([key,r])=>({key,slot:r.slot,branches:r.branches}))])),mageEDeadEnd:frostDeadEnd,limitations:['A main stat and affix strength still vary; one legendary behavior set does not mean all legendary items have equal DPS.','Visual sword/bow/crossbow/rod changes do not modify the attack model in equipment hooks.','Class-compatible stock is not the same as affordable or better gear.','Room20 shop is after normal victory, so only three shops can influence the standard run.']};
fs.mkdirSync('output/deep-test',{recursive:true});fs.writeFileSync('output/deep-test/build-support-statistics.json',JSON.stringify(data,null,2)+'\n');
console.table(rows.map(s=>({room:s.room,noSingle:s.noCompatibleSingleRolePercent,noDuo:s.noCompatibleTwoDistinctRolesPercent,legendary:s.legendaryItems,allThree:s.legendaryAllThreeAffixes})));
console.log('Confirmed: mage E at III + coldfield has no legal evolution route.');
