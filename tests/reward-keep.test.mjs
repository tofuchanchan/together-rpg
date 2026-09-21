import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {applyReward,skillPool} from '../src/coop/builds.js';
import {rollEquipment,applyEquipment,unequipEquipment} from '../src/coop/equipment.js';
import {selectAiReward} from '../src/coop/ai-build.js';

const recorded={ember:3,boneWhistle:1,commandWhistle:3,elementFeed:1};
function fixture(humans=2){
 const w=new World(22);w.reset(['mage','warrior'],humans);w.pressure=null;w.enemies=[];w.obstacles=[];w.effects=[];w.room=18;w.wave=2;w.clears=35;w.bossRoom=false;w.heroes[0].gold=123;
 const h=w.heroes[0];h.level=17;h.skills=[3,3];h.passives={...recorded};h.awakening='hiveHorn';h.rerolls=0;
 w.beginReward('skill');w.offers[0]=['magnetAstrolabe','shatter','momentum'].map(key=>skillPool(h,{clears:36}).find(o=>o.key===`passive:${key}`));
 return w;
}

test('recorded mage seed22 clear36 menu can preserve all four synergies with zero rerolls',()=>{
 const w=fixture(),h=w.heroes[0];assert.equal(w.clears,36);assert.ok(w.offers[0].every(Boolean));
 for(const o of w.offers[0])assert.equal(applyReward(structuredClone(h),o.key).status,'replace-required');
 const originals=structuredClone(w.offers[0]),before=structuredClone(h);let draws=0;w.random=()=>{draws++;return .5;};
 const choices=w.rewardChoices(0);assert.equal(choices.length,4);assert.deepEqual(choices.slice(0,3),originals);assert.equal(choices[3].key,'reward:keep');
 w.choose(0,3);w.confirm(0);assert.equal(w.ready[0],true);assert.equal(w.ready[1],false);assert.equal(w.mode,'upgrade');
 assert.deepEqual(h,before);assert.deepEqual(w.offers[0],originals);assert.equal(w.heroes[0].gold,123);assert.equal(draws,0);
});

test('keep is an independent action, never inserted into or rerolled with random offers',()=>{
 const w=fixture(),h=w.heroes[0];h.rerolls=1;assert.equal(w.offers[0].length,3);w.choose(0,3);assert.equal(w.reroll(0),true);
 assert.equal(h.rerolls,0);assert.equal(w.selection[0],0);assert.equal(w.offers[0].length,3);assert.ok(w.offers[0].every(o=>o.key!=='reward:keep'));assert.equal(w.rewardChoices(0).at(-1).key,'reward:keep');
});

test('players confirm keep independently and the wave advances exactly once',()=>{
 const w=fixture();w.heroes[1].passives={needleMagazine:1,mineShoes:1,orbitBlades:1,kineticWheel:1};let finishes=0;const finish=w.finishReward.bind(w);w.finishReward=()=>{finishes++;finish();};
 assert.equal(w.keepReward(0),true);assert.equal(w.keepReward(0),false);assert.equal(w.ready[1],false);assert.equal(finishes,0);
 assert.equal(w.keepReward(1),true);assert.equal(finishes,1);assert.equal(w.mode,'complete');assert.equal(w.keepReward(1),false);assert.equal(finishes,1);assert.equal(w.heroes[0].gold,123);
});

test('cancel replacement restores the original card cursor and does not confirm keep',()=>{
 const w=fixture(),h=w.heroes[0];w.choose(0,2);w.confirm(0);assert.equal(w.rewardMenus[0].type,'replace');assert.equal(w.rewardChoices(0).length,4);assert.ok(w.rewardChoices(0).every(o=>o.kind==='replacement'));
 assert.equal(w.keepReward(0),false);w.choose(0,3);assert.equal(w.cancelReplacement(0),true);assert.equal(w.selection[0],2);assert.equal(w.ready[0],false);assert.deepEqual(h.passives,recorded);
 w.confirm(0);assert.equal(w.rewardMenus[0].type,'replace');assert.equal(w.ready[0],false);assert.equal(w.cancelReplacement(0),true);w.choose(0,3);w.confirm(0);assert.equal(w.ready[0],true);assert.deepEqual(h.passives,recorded);
});

test('accepting a replacement returns the ready view to its selected original reward',()=>{
 const w=fixture();w.choose(0,1);w.confirm(0);w.choose(0,3);w.confirm(0);assert.equal(w.ready[0],true);assert.equal(w.rewardMenus[0],null);assert.equal(w.offers[0].length,3);assert.equal(w.selection[0],1);assert.equal(w.rewardChoices(0)[w.selection[0]].key,'passive:shatter');
});

test('keep is unavailable for attributes, unfilled builds, invalid owners and reshape routes',()=>{
 const w=fixture();for(const i of [-1,1.5,2,99])assert.equal(w.keepReward(i),false);
 assert.equal(w.canKeepReward(1),false);w.beginReward('attribute');assert.equal(w.canKeepReward(0),false);assert.equal(w.rewardChoices(0).length,3);assert.equal(w.keepReward(0),false);
 w.room=10;w.bossRoom=true;w.clears=18;w.heroes[0].core='pyromancer';w.beginReward('skill');assert.equal(w.rewardMenus[0].type,'route');assert.equal(w.canKeepReward(0),false);assert.ok(w.rewardChoices(0).every(o=>o.kind==='route'));
 w.choose(0,w.offers[0].findIndex(o=>o.key==='route:core'));w.confirm(0);assert.equal(w.rewardMenus[0].type,'reshape');assert.equal(w.canKeepReward(0),false);assert.equal(w.keepReward(0),false);assert.equal(w.offers[0].length,2);
});

test('Boss high reward may be declined only after selecting the reward route',()=>{
 const w=fixture(1);w.room=10;w.bossRoom=true;w.clears=18;w.beginReward('skill');assert.equal(w.canKeepReward(0),false);
 w.choose(0,w.offers[0].findIndex(o=>o.key==='route:reward'));w.confirm(0);assert.equal(w.canKeepReward(0),true);assert.equal(w.offers[0].length,3);
 const before=structuredClone(w.heroes[0].passives);w.choose(0,w.rewardChoices(0).length-1);w.confirm(0);assert.equal(w.mode,'shop');assert.deepEqual(w.heroes[0].passives,before);assert.equal(w.clears,19);
});

test('holding a build cannot grant a reward twice or spend queued XP attribute choices',()=>{
 const w=fixture(1);assert.equal(w.keepReward(0),true);assert.equal(w.mode,'complete');w.beginReward('attribute');const power=w.heroes[0].power;
 assert.equal(w.keepReward(0),false);w.choose(0,w.rewardChoices(0).length);assert.ok(w.selection[0]<w.offers[0].length);assert.equal(w.heroes[0].power,power);assert.equal(w.ready[0],false);
});

test('a skill offered from equipped crit remains valid when confirmed or replacing a passive',()=>{
 for(const full of [false,true]){
  const w=new World(83);w.reset(['warrior'],1);w.pressure=null;w.enemies=[];w.room=6;w.wave=1;w.clears=10;const h=w.heroes[0];h.skills=[3,3];
  const item=rollEquipment('warrior','weapon',5,()=>0,'natural-crit-source');item.main={stat:'crit',value:.038};assert.equal(applyEquipment(h,item).ok,true);assert.equal(h.crit,.038);
  if(full)h.passives={guard:1,harvest:2,thorns:2,focus:2};w.beginReward('skill');const blood=skillPool(h).find(o=>o.key==='passive:blood');assert.ok(blood);w.offers[0]=[blood];w.confirm(0);
  if(full){assert.equal(w.rewardMenus[0].type,'replace');w.choose(0,w.offers[0].findIndex(o=>o.key==='replace:focus'));w.confirm(0);}
  assert.equal(h.passives.blood,1);assert.equal(w.mode,'play');assert.equal(w.rewardError,null);assert.equal(h.crit,.038);
 }
});

test('attribute confirmation still trains the base stat without equipment swallowing the cap',()=>{
 const w=new World(2);w.reset(['warrior'],1);w.pressure=null;w.enemies=[];const h=w.heroes[0];h.crit=.61;const item=rollEquipment('warrior','weapon',5,()=>0,'cap-check');item.main={stat:'crit',value:.07};applyEquipment(h,item);
 w.beginReward('attribute');w.offers[0]=[{key:'crit'}];w.confirm(0);assert.ok(Math.abs(h.crit-.72)<1e-10);unequipEquipment(h,'weapon');assert.ok(Math.abs(h.crit-.65)<1e-10);
});

test('AI probes also retain equipment-only skill sources while leaving the candidate hero untouched',()=>{
 const w=new World(2);w.reset(['warrior'],1);const h=w.heroes[0],item=rollEquipment('warrior','weapon',5,()=>0,'ai-crit-source');item.main={stat:'crit',value:.038};applyEquipment(h,item);
 const before=structuredClone(h),blood=skillPool(h).find(o=>o.key==='passive:blood');assert.ok(blood);assert.equal(selectAiReward(h,[blood])?.offer.key,'passive:blood');assert.deepEqual(h,before);
});
