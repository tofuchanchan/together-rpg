import test from 'node:test';
import assert from 'node:assert/strict';
import {World,MAP} from '../src/coop/model.js';
import {applyReward} from '../src/coop/builds.js';
import {SKILL_PAIRS} from '../src/coop/skill-pairs.js';
import {pairProjectileHit,updatePairAction} from '../src/coop/pair-combat.js';
import {companionInput} from '../src/coop/ai.js';
import {HERO_ROLES} from '../src/coop/recruitment.js';
import {pairCycle} from '../tools/audit-pair-balance.mjs';
function arena(key){const p=SKILL_PAIRS[key],w=new World(17);w.reset([p.role],1);w.enemies=[];w.obstacles=[];w.pressure=null;w.waveDuration=999;w.xpNext=1e9;const h=w.heroes[0];h.x=h.y=0;h.attackCd=999;for(const slot of p.slots)for(let i=0;i<3;i++)assert.ok(applyReward(h,'active:'+slot).ok);for(const slot of p.slots)assert.ok(applyReward(h,'advance:'+slot).ok);h.passives[p.component]=2;assert.ok(applyReward(h,'mastery:'+key).ok);return{w,h};}
test('mastery bonus rain preserves all three traveling rain zones and remains bounded',()=>{
 const {w,h}=arena('storm'),e=w.createEnemy('goblin',100,0);w.enemies=[e];
 const main=[0,1,2].map(i=>({owner:0,kind:'rain',x:100+i*95,y:0,r:105,life:2,pulses:0}));w.skillFields=[...main];
 for(let eventId=100;eventId<110;eventId++)pairProjectileHit(w,{pair:'pair-fan',bounce:true,eventId,hit:new Set([e.id])},e,h,16);
 assert.ok(main.every(f=>w.skillFields.includes(f)),'bonus cannot evict a paid primary rain field');
 assert.equal(w.skillFields.length,4,'three main fields plus at most one brief bonus');
});
test('pin arrows immobilize without launching the target out of the follow-up firing line',()=>{
 const {w,h}=arena('rail'),e=w.createEnemy('mushroom',140,0);e.hp=e.maxHp=10000;e.cd=999;e.stats.speed=0;w.enemies=[e];
 w.request(h,h.loadout.indexOf(2)?'skill2':'skill1',{x:1,y:0});h.action.t=h.action.windup;updatePairAction(w,h,h.action);w.updateProjectiles(.3);
 assert.ok(e.freeze>0);assert.equal(Math.hypot(e.knock.x,e.knock.y),0);
});
test('fortress AI times the advanced wall against a direct telegraph and holds a safe guard',()=>{
 const {w,h}=arena('fortress'),e=w.createEnemy('goblin',80,0);w.enemies=[e];e.action={kind:'melee',x:0,y:0,r:60,windup:.6,t:.15,hit:false};
 const ready=companionInput(w,h,HERO_ROLES.warrior,MAP);assert.equal(ready.skill1,true);assert.equal(h.aiIntent,'guard');
 w.request(h,'skill1',ready);w.advance(.12);h.action.t=.4;h.guardUntil=w.time+.6;h.shield=50;e.action={kind:'melee',x:h.x,y:h.y,r:60,windup:.6,t:.5,hit:false};
 const hold=companionInput(w,h,HERO_ROLES.warrior,MAP);assert.equal(hold.dodge,false);assert.equal(h.aiIntent,'guard');
});
test('arcane AI does not abandon a safe active station to chase a target inside missile range',()=>{
 const {w,h}=arena('stars'),e=w.createEnemy('goblin',320,0);w.enemies=[e];w.skillFields=[{kind:'orbit',owner:0,x:0,y:0,r:130,life:3}];h.cd[3]=5;
 const input=companionInput(w,h,HERO_ROLES.mage,MAP);assert.equal(Math.hypot(input.x,input.y),0);assert.equal(input.skill1,true);
 e.x=80;e.action={kind:'melee',x:0,y:0,r:100,windup:.5,t:.4,hit:false};const evade=companionInput(w,h,HERO_ROLES.mage,MAP);assert.ok(Math.hypot(evade.x,evade.y)>0);assert.equal(h.aiIntent,'evade');
});

test('bonus rain cannot serve as a new mastery trigger after the primary rain expires',()=>{
 const {w,h}=arena('storm'),e=w.createEnemy('goblin',100,0);w.enemies=[e];
 const echo={owner:0,kind:'rain',echo:true,x:100,y:0,r:130,life:.4};w.skillFields=[echo];
 pairProjectileHit(w,{pair:'pair-fan',bounce:true,eventId:99,hit:new Set([e.id])},e,h,16);
 assert.deepEqual(w.skillFields,[echo]);assert.equal(h.rainEchoEvent,undefined);
});

test('two archers retain independent three-zone rains and cannot consume each others bonus',()=>{
 const {w,h}=arena('storm'),other={...h,id:1,pairMastery:{storm:true}};w.heroes.push(other);
 const e=w.createEnemy('goblin',100,0);w.enemies=[e];
 const main=[0,1].flatMap(owner=>[0,1,2].map(i=>({owner,kind:'rain',x:100+i*95,y:0,r:105,life:2})));w.skillFields=[...main];
 for(const actor of [h,other])pairProjectileHit(w,{pair:'pair-fan',bounce:true,eventId:100+actor.id,hit:new Set([e.id])},e,actor,16);
 const otherBonus=w.skillFields.find(f=>f.owner===1&&f.echo);
 pairProjectileHit(w,{pair:'pair-fan',bounce:true,eventId:102,hit:new Set([e.id])},e,h,16);
 assert.ok(main.every(f=>w.skillFields.includes(f)));assert.ok(w.skillFields.includes(otherBonus));
 assert.equal(w.skillFields.length,8);assert.equal(w.skillFields.filter(f=>f.echo).length,2);
});

test('advanced counter remains an offensive attack when no blockable warning is available',()=>{
 const {w,h}=arena('fortress');w.enemies=[w.createEnemy('thornking',150,0)];
 const input=companionInput(w,h,HERO_ROLES.warrior,MAP);assert.equal(input.skill1,true);
});

for(const key of Object.keys(SKILL_PAIRS))test(`${key}: a correctly executed mastery combo earns its last build pick`,()=>{
 // Equal total investment: the other version spends its final pick on +20% skill
 // strength. Keep a broad benefit band, not a snapshot of a specific damage sum.
 const full=pairCycle(key),attribute=pairCycle(key,false),gain=full.damage/attribute.damage;
 assert.equal(full.bursts,1);assert.equal(attribute.bursts,0);
 assert.ok(gain>1.05,`conditional mastery benefit must exceed a plain attribute: ${gain}`);
 assert.ok(gain<1.4,`one mastery pick must not multiply the whole two-skill cycle: ${gain}`);
});
