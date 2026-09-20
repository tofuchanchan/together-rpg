import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {addFixtureCompanions} from './hero-fixture.mjs';
import {buildProjectileHit,tickBuild,releaseBuildEnergy} from '../src/coop/build-combat.js';

function arena(role='warrior'){
 const w=new World(713);w.reset([role,role==='mage'?'archer':'mage'],1);addFixtureCompanions(w,[role,role==='mage'?'archer':'mage','warrior','mage','archer']);w.enemies=[];w.obstacles=[];w.spawnQueue=[];w.pressure=null;w.xpNext=1e6;w.waveTimer=-100;
 for(const h of w.heroes){h.ai=false;h.x=h.id?900:0;h.y=0;h.attackCd=99;}
 const h=w.heroes[0],foe=(x=100,y=0)=>{const e=w.createEnemy('goblin',x,y);e.hp=e.maxHp=1000;e.cd=99;w.enemies.push(e);return e;};
 return {w,h,foe};
}

test('ember component lets a fireball ignite a previously unburned enemy',()=>{
 const {w,h,foe}=arena('mage'),e=foe();h.core='pyromancer';h.passives.ember=1;h.passives.emberConsume=2;
 w.shoot(h,{x:1,y:0},'fireball',20,390,'skill');w.updateProjectiles(.2);
 assert.ok(e.statuses.some(s=>s.type==='burn'&&s.owner===h.id&&s.damage>0));
});

test('downed heroes lose pending resource and shadow immediately, without waiting for revival',()=>{
 const {w,h,foe}=arena('archer'),e=foe();h.resource=80;h.shadow={x:0,y:0,life:4,face:0};h.huntStacks=3;h.huntTarget=e.id;
 w.damageHero(h,10000,e);w.advance(1/120);
 assert.equal(h.down,true);assert.equal(h.resource,0);assert.equal(h.shadow,null);
});

test('old off-target marks cannot be cashed out after their four second timeout',()=>{
 const {w,h,foe}=arena('archer'),a=foe(240),b=foe(280,100);h.core='sniper';
 for(let i=0;i<5;i++)w.damageEnemy(a,1,h);
 w.damageEnemy(b,1,h);w.time=5;tickBuild(w,h,0);
 const damage=buildProjectileHit(w,{source:'skill',type:'pierce',damage:10,form:'markedshot'},a,h,{x:1,y:0});
 assert.equal(damage,10);
});

test('reacquiring an expired off-target mark starts from one rather than reviving five stacks',()=>{
 const {w,h,foe}=arena('archer'),a=foe(240),b=foe(280,100);h.core='sniper';
 for(let i=0;i<5;i++)w.damageEnemy(a,1,h);
 w.damageEnemy(b,1,h);w.time=5;tickBuild(w,h,0);w.damageEnemy(a,1,h);
 assert.equal(a.huntMarks[h.id].stacks,1);assert.equal(h.huntStacks,1);
});

test('dead executioner does not gain living HP from a teammate finishing its bleed target',()=>{
 const {w,h,foe}=arena('archer'),e=foe();h.core='executioner';h.crit=1;w.damageEnemy(e,1,h);h.hp=0;h.down=true;
 w.damageEnemy(e,2000,w.heroes[1]);assert.equal(h.down,true);assert.equal(h.hp,0);
});

test('burn consumption affects only the owner and is not undone by the consuming projectile hit',()=>{
 const {w,h,foe}=arena('mage'),e=foe();h.core='pyromancer';h.passives.ember=1;h.passives.emberConsume=2;e.statuses=[{type:'burn',owner:h.id,damage:8,life:3,timer:1},{type:'burn',owner:1,damage:17,life:3,timer:1}];
 const p={source:'skill',type:'fireball',damage:20,eventId:50};const damage=buildProjectileHit(w,p,e,h,{x:1,y:0});
 w.damageEnemy(e,damage,h,0,'skill',0,null,{eventId:p.eventId,skipBurn:p.skipBurn});
 assert.equal(e.statuses.find(s=>s.owner===h.id).damage,4.4);assert.equal(e.statuses.find(s=>s.owner===1).damage,17);
});

test('burn death chains retain original owner, bounded depth and single death settlement',()=>{
 const {w,h,foe}=arena('mage');h.core='pyromancer';h.passives.detonate=2;h.skills=[1,1];const a=foe(100),b=foe(200),c=foe(300),d=foe(400);
 for(const e of [a,b,c,d]){e.hp=10;e.statuses=[{type:'burn',owner:h.id,damage:8,life:3,timer:1}];}
 const killer=w.heroes[1];w.damageEnemy(a,11,killer,0,'skill');
 assert.equal(w.kills,3);assert.ok(d.hp>0);assert.ok(h.damageDone>0);assert.equal(killer.damageDone,10);assert.equal(w.deathQueue.length,0);
 w.damageEnemy(a,999,killer);assert.equal(w.kills,3);
});

test('storage shield never spends rage twice or converts rage into unearned shield energy',()=>{
 const {w,h}=arena();h.core='berserker';h.passives={storage:1,rageEdge:1,guardRelease:1};h.resource=60;h.storedGuard=0;
 releaseBuildEnergy(w,h,{slot:1,dir:{x:1,y:0}});
 assert.equal(h.resource,0);assert.equal(w.delayed.filter(j=>j.type==='bloodpulse').length,2);assert.equal(w.effects.filter(f=>f.variant==='guardburst').length,0);
 w.delayed=[];h.storedGuard=60;releaseBuildEnergy(w,h,{slot:1,dir:{x:1,y:0}});
 assert.equal(h.storedGuard,0);assert.equal(w.delayed.length,0);assert.equal(w.effects.filter(f=>f.variant==='guardburst').length,1);
});

test('paused combat and attribute rewards preserve remaining build windows without advancing them',()=>{
 const {w,h}=arena('archer');h.shadow={x:0,y:0,life:3,face:0};h.resource=60;h.guardUntil=2;h.huntTarget=null;
 w.pause();w.advance(20);assert.equal(w.time,0);assert.equal(h.shadow.life,3);assert.equal(h.resource,60);
 w.resume();w.beginReward('attribute');w.advance(20);assert.equal(w.time,0);assert.equal(h.shadow.life,3);assert.equal(h.resource,60);
});

test('standalone volley charge works without an active skill at normal archer range',()=>{
 const {w,h,foe}=arena('archer'),e=foe(300);h.core='ranger';h.passives.volleyCharge=1;h.resource=60;h.skills=[0,0];
 const before=e.hp;w.damageEnemy(e,10,h,0,'attack');w.updateProjectiles(.7);
 assert.equal(h.resource,12);assert.ok(before-e.hp>8.5,'full-charge attack must add damage at normal archer distance');
 assert.equal(w.effects.some(f=>f.variant==='bloodspin'),false);
});
