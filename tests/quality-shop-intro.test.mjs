import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {applyReward,skillPool} from '../src/coop/builds.js';
import {createHero} from '../src/coop/recruitment.js';
import {SKILL_PAIRS} from '../src/coop/skill-pairs.js';
import {configurePairAction} from '../src/coop/pair-combat.js';
import {spritePose,jointPose} from '../src/coop/sprite-animation.js';
import {equipmentPose} from '../src/coop/equipment-art.js';
import {rollLesson,lessonPrice,lessonEligibility} from '../src/coop/shop-lessons.js';
import {handleShopInput} from '../src/coop/shop-view.js';
import {ENEMIES,ENEMY_PROGRESS} from '../src/coop/enemies.js';
import {pressureKind,pressurePlan,partyPressure} from '../src/coop/pressure.js';
import {rareRoll,scaledEnemy} from '../src/coop/encounters.js';
import {lootRoll} from '../src/coop/loot.js';
const ready=(h,key)=>{const p=SKILL_PAIRS[key];for(const s of p.slots)for(let i=0;i<3;i++)applyReward(h,`active:${s}`);for(const s of p.slots)applyReward(h,`advance:${s}`);h.passives[p.component]=2;};
function store(key='stars',humans=2){const w=new World(842),p=SKILL_PAIRS[key];w.reset([p.role,p.role],humans);for(const h of w.heroes)ready(h,key);w.clears=19;w.room=10;w.mode='complete';w.gold=500;w.enterShop();return w;}
function stock(w,key){const h=w.heroes[0],o=skillPool(h,{clears:w.clears}).find(o=>o.key===key);assert.ok(o);w.shop.lesson={...o,uid:'test-lesson',role:h.role,targetRank:o.kind==='passive'?(h.passives[key.split(':')[1]]||0)+1:o.kind==='active'?h.skills[o.slot]+1:null,price:lessonPrice(o,w.room)};return w.shop.lesson;}

test('all new action poses retain their facing, rigid scale and continuous release/recovery',()=>{
 for(const [key,pair] of Object.entries(SKILL_PAIRS))for(const s of pair.slots)for(const facing of [0,1,2,3,4,5,6,7]){
  const h=createHero(pair.role,0);ready(h,key);h.face=facing;h.action={type:pair.role==='warrior'?'spin':'fireball',slot:s,t:0,facing,dir:{x:1,y:0}};configurePairAction({},h,h.action);const a=h.action;const first=spritePose(h).row;
  for(const time of [0,a.windup-1e-6,a.windup,a.activeEnd-1e-6,a.activeEnd,a.duration]){a.t=time;const before=jointPose(h),pose=spritePose(h),equipped=equipmentPose(h);a.t=time+1e-6;const after=jointPose(h);assert.equal(pose.row,first,`${key}/${s}`);assert.equal(equipped.row,first);assert.equal(pose.sx,1);assert.equal(pose.sy,1);assert.ok(Math.abs(after.arm.rotation-before.arm.rotation)<.001);assert.ok([pose.x,pose.y,pose.rotation].every(Number.isFinite));}
 }
});
test('124px dodge is frame-rate independent and cannot phase through obstacles',()=>{
 for(const fps of [30,60,120]){const w=new World();w.reset(['warrior'],1);w.pressure=null;w.enemies=[];w.obstacles=[];w.heroes[0].x=w.heroes[0].y=0;const h=w.heroes[0];w.request(h,'dodge',{x:1,y:0});for(let i=0;i<fps/2;i++)w.advance(1/fps);assert.ok(Math.abs(h.x-124)<1e-6);assert.equal(h.invuln,0);}
 const w=new World();w.reset(['warrior'],1);w.pressure=null;w.enemies=[];w.heroes[0].x=w.heroes[0].y=0;w.obstacles=[{x:80,y:0,r:24}];w.request(w.heroes[0],'dodge',{x:1,y:0});w.advance(.4);assert.ok(w.heroes[0].x<=39.001);
});
test('mastery purchase checks both recipe and owner, spends once and survives reroll as sold',()=>{
 const w=store(),item=stock(w,'mastery:stars'),gold=w.gold;w.heroes[1].passives.arcane=1;assert.ok(lessonEligibility(w,item,w.heroes[1]));assert.equal(w.buyLesson(1,1,item.uid).ok,false);assert.equal(w.gold,gold);assert.equal(w.buyLesson(0,0,item.uid).ok,true);assert.equal(w.heroes[0].pairMastery.stars,true);assert.equal(w.gold,gold-item.price);assert.equal(w.buyLesson(1,0,item.uid).ok,false);w.rerollShop(0);assert.equal(w.shop.lesson.uid,item.uid);assert.equal(w.shop.lesson.sold,true);
});
test('unaffordable and stale lesson purchases preserve all progression, money and RNG',()=>{
 const w=store(),item=stock(w,'mastery:stars');w.gold=1;const seed=w.seed,hero=structuredClone(w.heroes[0]);assert.equal(w.buyLesson(0,0,item.uid).ok,false);assert.equal(w.gold,1);assert.equal(w.seed,seed);assert.deepEqual(w.heroes[0],hero);w.gold=300;w.rerollShop(0);const gold=w.gold;assert.equal(w.buyLesson(0,0,item.uid).ok,false);assert.equal(w.gold,gold);
});
test('shop advances one skill only, never silently replaces or grants its pair',()=>{
 const w=store('fortress',1),h=w.heroes[0];h.skillAdvances=[false,false,false,false];const item=stock(w,'advance:0');assert.equal(w.buyLesson(0,0,item.uid).ok,true);assert.equal(h.skillAdvances[0],true);assert.equal(h.skillAdvances[2],false);assert.equal(h.pairMastery.fortress,undefined);
});
test('lesson stock contains legal role/rank choices and obeys the late mastery gate',()=>{
 const w=store();let masters=0;for(let i=0;i<250;i++){const o=rollLesson(w);assert.ok(w.heroes.some(h=>!lessonEligibility(w,o,h)));masters+=o.kind==='mastery';}assert.ok(masters>0&&masters<250);w.clears=15;for(let i=0;i<100;i++)assert.notEqual(rollLesson(w).kind,'mastery');
});
test('lesson shelf supports controller detail, cancellation and shared revision protection',()=>{
 const w=store(),item=stock(w,'mastery:stars'),v={world:w,router:{flush(){}}};w.shop.cursors=[6,6];handleShopInput(v,0,{skill1:true});assert.deepEqual(w.shop.inspect,{type:'lesson'});const rev=w.shop.revision;handleShopInput(v,0,{cancel:true});assert.ok(w.shop.revision>rev);assert.equal(w.gold,500);handleShopInput(v,0,{confirm:true});assert.equal(w.shop.lesson.sold,true);const gold=w.gold;handleShopInput(v,1,{confirm:true});assert.equal(w.gold,gold);assert.equal(w.heroes[1].pairMastery.stars,undefined);
});
test('lessons can target a recruited companion and a new shop resets the purchase quota',()=>{
 const w=store('stars',1),h=createHero('mage',1,{ai:true});ready(h,'stars');w.heroes.push(h);const item=stock(w,'mastery:stars');assert.equal(w.buyLesson(0,1,item.uid).ok,true);assert.equal(h.pairMastery.stars,true);w.leaveShop(0);w.room=15;w.mode='complete';w.enterShop();assert.ok(!w.shop.lessonBought);assert.ok(!w.shop.lesson.sold);
});
test('first two waves offer only beginner fodder in scheduled and random slots; all species unlock progressively',()=>{
 const seen=new Set();for(let progress=1;progress<=22;progress++)for(let i=0;i<240;i++){const kind=pressureKind(Math.ceil(progress/2),progress%2||2,i,()=>((i*137)%997)/997);assert.ok(ENEMY_PROGRESS[kind].wave<=progress);if(progress<=2)assert.ok(['seedling','dustling'].includes(kind));seen.add(kind);}assert.deepEqual([...seen].sort(),Object.keys(ENEMIES).sort());
});
test('newcomer pressure has fewer simultaneous threats without removing finite kill supply',()=>{
 const p=partyPressure(pressurePlan(1,1),1);assert.equal(p.initial,4);assert.equal(p.aliveCap,8);assert.equal(p.totalBudget,48);assert.equal(p.duration,44);const early=scaledEnemy(ENEMIES.seedling,1,0,()=>.5).stats;assert.ok(early.hp<=13);assert.ok(early.speed<110);assert.ok(early.damage<4);
});
test('rarity and starter XP introduction gates apply without granting guaranteed drops',()=>{
 for(let i=1;i<=3;i++)assert.equal(rareRoll(()=>0,i),0);assert.equal(rareRoll(()=>0,4),1);assert.equal(rareRoll(()=>0,8),2);assert.equal(rareRoll(()=>0,14),3);
 assert.equal(lootRoll({progress:1},()=>.8)[0]?.type,'xp');assert.equal(lootRoll({progress:3},()=>.8).length,0);assert.equal(lootRoll({progress:1},()=>.99).length,0);
});
