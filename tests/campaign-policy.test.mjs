import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {applyReward,skillPool} from '../src/coop/builds.js';
import {createCampaignStrategy,visitCampaignShop} from '../tools/audit-campaign.mjs';

const setup=(role='warrior')=>{const w=new World(17);w.reset([role],1);return{w,h:w.heroes[0]};};
const active=slot=>({key:`active:${slot}`,kind:'active',slot});
test('empty hero does not preselect a pair; first acquired visible skill commits the plan',()=>{
 const {h}=setup(),s=createCampaignStrategy();assert.equal(s.plan(h),null);assert.equal(s.score(h,active(0)),s.score(h,active(3)));
 applyReward(h,'active:3');assert.equal(s.plan(h),'blades');assert.ok(s.score(h,active(1))>s.score(h,active(0)));
});
test('coherent selection protects upgraded actives while legacy reproduces destructive preference',()=>{
 const {h}=setup(),s=createCampaignStrategy();applyReward(h,'active:0');s.plan(h);applyReward(h,'active:0');applyReward(h,'active:1');applyReward(h,'active:1');
 assert.ok(s.score(h,active(2))<s.score(h,active(0)));assert.ok(createCampaignStrategy('legacy').score(h,active(2))>createCampaignStrategy('legacy').score(h,active(0)));
});
test('only an uninvested off-plan skill can be exchanged for the actual missing partner',()=>{
 const {h}=setup(),s=createCampaignStrategy();applyReward(h,'active:0');s.plan(h);applyReward(h,'active:1');
 assert.ok(s.score(h,active(2))>100);assert.ok(s.score(h,{key:'replaceSkill:1',kind:'replacement'},{pendingKey:'active:2'})>0);
 assert.ok(s.score(h,{key:'replaceSkill:0',kind:'replacement'},{pendingKey:'active:2'})<0);
 applyReward(h,'active:1');assert.ok(s.score(h,active(2))<0);
});
test('advances/mastery are preferred when actually legal and incompatible forms cannot dismantle a pair',()=>{
 const {h}=setup(),s=createCampaignStrategy();for(const k of ['active:0','active:2','active:0','active:2'])applyReward(h,k);
 let pool=skillPool(h,{clears:8});assert.ok(s.score(h,pool.find(o=>o.key==='advance:0'))>s.score(h,active(0)));
 assert.ok(s.score(h,pool.find(o=>o.key==='form:0:aegis'))<s.score(h,{key:'reward:keep',kind:'keep'}));
 for(const k of ['advance:0','advance:2','active:0','active:2','passive:storage','passive:storage'])assert.ok(applyReward(h,k).ok,k);
 pool=skillPool(h,{clears:16});assert.ok(s.score(h,pool.find(o=>o.key==='mastery:fortress'))>140);
 assert.equal(skillPool(h,{clears:15}).some(o=>o.kind==='mastery'),false);
});
test('passive replacement preserves pair component and established dependencies',()=>{
 const {h}=setup('mage'),s=createCampaignStrategy();applyReward(h,'active:2');s.plan(h);applyReward(h,'active:3');
 for(const k of ['arcane','ember','detonate','momentum'])applyReward(h,`passive:${k}`);
 assert.ok(s.score(h,{key:'replace:arcane',kind:'replacement'},{pendingKey:'passive:harvest'})<0);
 assert.ok(s.score(h,{key:'replace:ember',kind:'replacement'},{pendingKey:'passive:harvest'})<0);
 assert.ok(['detonate','momentum'].some(key=>s.score(h,{key:'replace:'+key,kind:'replacement'},{pendingKey:'passive:harvest'})>0));
});
test('shop policy uses public paid lesson API and never injects funds or replaces a skill',()=>{
 const {w,h}=setup(),s=createCampaignStrategy();applyReward(h,'active:0');applyReward(h,'active:2');h.gold=100;w.room=5;w.clears=10;w.mode='complete';w.enterShop();
 const lesson=w.shop.stalls[0].lessons.find(o=>o?.kind==='active');assert.ok(lesson);w.shop.stalls[0].offers=[]; // Isolate the production-rolled course shelf; policy none does not recruit.
 const before=h.gold,skills=[...h.skills],original=w.buyLesson.bind(w),paid=[];w.buyLesson=(...args)=>{const item=w.shop.stalls[args[0]].lessons.find(o=>o?.uid===args[2]),price=item.price;const result=original(...args);if(result.ok)paid.push(price);return result;};
 const rec={shops:[]};visitCampaignShop(w,'none',rec,s);assert.ok(paid.length);assert.equal(h.gold,before-paid.reduce((a,b)=>a+b,0));assert.ok(h.skills.every((v,i)=>v>=skills[i]));
});
test('bad offers may divert to a rank-preserving form instead of destroying an invested skill',()=>{
 const {h}=setup(),s=createCampaignStrategy();for(const k of ['active:0','active:0','active:1','active:1'])applyReward(h,k);s.plan(h);
 const offers=[active(2),active(3),{key:'form:0:aegis',kind:'form',slot:0,form:'aegis'}];
 const pick=offers.sort((a,b)=>s.score(h,b)-s.score(h,a))[0];assert.equal(pick.kind,'form');applyReward(h,pick.key);
 assert.equal(h.skills[0],2);assert.equal(h.skills[1],2);assert.equal(s.plan(h),'legacy:aegis');
});
test('unaffordable lessons do not generate free purchases or a free shop reroll',()=>{
 const {w,h}=setup(),s=createCampaignStrategy();applyReward(h,'active:0');w.room=5;w.clears=10;w.mode='complete';w.enterShop();h.gold=0;
 const rec={shops:[]};visitCampaignShop(w,'build',rec,s);assert.equal(h.gold,0);assert.deepEqual(rec.shops[0].actions,[]);assert.equal(w.heroes.length,1);
});
