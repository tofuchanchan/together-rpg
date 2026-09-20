import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {addFixtureCompanions} from './hero-fixture.mjs';

function arena(role){
 const w=new World(823);w.reset(['warrior','mage'],1);addFixtureCompanions(w);w.enemies=[];w.spawnQueue=[];w.pressure=null;w.obstacles=[];w.hazards=[];w.bossWarnings=[];w.projectiles=[];
 for(const p of w.heroes){p.x=1000;p.y=500;}
 const h=w.heroes.find(p=>p.role===role);Object.assign(h,{x:0,y:0,ai:true,skills:[2,2],forms:[null,null],resource:0,cd:[0,0],lastMove:{x:0,y:1}});
 const foe=(x,y=0,kind='goblin')=>{const e=w.createEnemy(kind,x,y);e.hp=e.maxHp=1000;e.cd=99;w.enemies.push(e);return e;};
 return{w,h,foe};
}

test('aegis faces a forecast direct strike but saves shield while no threat is incoming',()=>{
 const {w,h,foe}=arena('warrior'),e=foe(150);h.forms[0]='aegis';h.core='bulwark';
 assert.equal(w.aiInput(h).skill1,false);
 e.action={kind:'melee',x:0,y:0,r:65,t:.25,windup:.8,hit:false};
 const input=w.aiInput(h);assert.equal(input.skill1,true);assert.equal(input.dodge,false);assert.equal(h.aiIntent,'guard');assert.ok(input.x>.9);
});

test('imminent attacks and poison keep evasive priority over aegis',()=>{
 const {w,h,foe}=arena('warrior'),e=foe(150);h.forms[0]='aegis';h.core='bulwark';
 e.action={kind:'melee',x:0,y:0,r:65,t:.72,windup:.8,hit:false};
 let input=w.aiInput(h);assert.equal(input.dodge,true);assert.equal(input.skill1,false);
 e.action.t=.25;w.hazards=[{type:'poison',x:0,y:0,r:90,timer:.1,life:3}];
 input=w.aiInput(h);assert.equal(input.skill1,false);assert.equal(input.dodge,true);
});

test('aegis anticipates a frontal projectile then holds only while its shield covers incoming damage',()=>{
 const {w,h,foe}=arena('warrior');foe(200);h.forms[0]='aegis';
 const shot={hostile:true,x:130,y:0,dx:-1,dy:0,speed:280,life:2,damage:15};w.projectiles=[shot];
 let input=w.aiInput(h);assert.equal(input.skill1,true);assert.equal(input.dodge,false);assert.ok(input.x>.9);
 h.action={type:'bash',form:'aegis',dir:{x:1,y:0},t:.5,duration:.8,cancelAt:0};h.guardDir={x:1,y:0};h.guardUntil=w.time+.4;h.shield=30;h.cd[0]=2;shot.x=65;
 input=w.aiInput(h);assert.equal(input.dodge,false);assert.equal(h.aiIntent,'guard');assert.equal(Math.hypot(input.x,input.y),0);
 h.shield=5;input=w.aiInput(h);assert.equal(input.dodge,true);
 h.shield=30;shot.x=-65;shot.dx=1;input=w.aiInput(h);assert.equal(input.dodge,true);
});

test('shield energy is released before another shield when enemies are in shockwave reach',()=>{
 const {w,h,foe}=arena('warrior');foe(120);h.core='bulwark';h.resource=80;
 assert.equal(w.aiInput(h).skill2,true,'a core alone does not make E consume energy');
 h.passives.guardRelease=1;
 assert.equal(w.aiInput(h).skill2,false);
 h.storedGuard=20;const input=w.aiInput(h);assert.equal(input.skill2,true);assert.equal(input.skill1,false);
 h.storedGuard=0;h.shield=40;assert.equal(w.aiInput(h).skill2,true,'shield conversion also works without stored energy');
});

test('bloodspin saves rage for its moving spin but can break a surround without full rage',()=>{
 const {w,h,foe}=arena('warrior');foe(120);h.core='berserker';h.forms[1]='bloodspin';
 assert.equal(w.aiInput(h).skill2,true,'base spin does not consume core rage');h.passives.rageEdge=1;
 assert.equal(w.aiInput(h).skill2,false);
 h.resource=30;let input=w.aiInput(h);assert.equal(input.skill2,true);assert.equal(input.skill1,false);
 h.resource=0;foe(0,135);foe(-120);assert.equal(w.aiInput(h).skill2,true);
});

test('ice lance waits for chill or a useful penetration line instead of spending every cooldown',()=>{
 const {w,h,foe}=arena('mage'),e=foe(260);h.core='frostweaver';h.forms[0]='icelance';
 assert.equal(w.aiInput(h).skill1,true,'without the fragment component there is nothing to cash out');h.passives.iceFragments=1;
 assert.equal(w.aiInput(h).skill1,false);
 e.frostStacks=2;e.brittle=2;e.chillBy={0:{stacks:2,brittleUntil:10}};assert.equal(w.aiInput(h).skill1,false,'teammate chill is not a personal recipe');
 e.chillBy[h.id]={stacks:2};assert.equal(w.aiInput(h).skill1,true);
 e.chillBy[h.id].stacks=0;foe(340,10);assert.equal(w.aiInput(h).skill1,true);
});

test('ice lance works on bosses and is independently usable without frost core',()=>{
 const {w,h,foe}=arena('mage'),e=foe(260);h.forms[0]='icelance';
 assert.equal(w.aiInput(h).skill1,true);
 h.passives.iceFragments=1;assert.equal(w.aiInput(h).skill1,true,'the lance must be able to build its own chill without another source');
 h.core='frostweaver';e.boss=true;assert.equal(w.aiInput(h).skill1,true);
});

test('coldfield is laid in an approaching enemy path without recasting over a living field',()=>{
 const {w,h,foe}=arena('mage'),e=foe(215);h.forms[1]='coldfield';
 assert.equal(w.aiInput(h).skill2,false);
 e.vx=-150;assert.equal(w.aiInput(h).skill2,true);
 w.hazards=[{type:'coldfield',owner:h.id,x:50,y:0,r:185,life:2}];assert.equal(w.aiInput(h).skill2,false);
 w.hazards[0].life=.2;assert.equal(w.aiInput(h).skill2,true);
});

test('a ready basic frost ring approaches its cast edge then resumes safe ranged spacing',()=>{
 const {w,h,foe}=arena('mage'),e=foe(240);h.skills[0]=0;
 let input=w.aiInput(h);assert.ok(input.x>.8);assert.equal(input.skill2,false);
 e.x=175;input=w.aiInput(h);assert.equal(input.skill2,true);
 h.cd[1]=3;input=w.aiInput(h);assert.ok(input.x<-.8);assert.equal(input.skill2,false);
 h.cd[1]=0;e.action={kind:'melee',x:0,y:0,r:65,t:.72,windup:.8,hit:false};input=w.aiInput(h);assert.equal(h.aiIntent,'evade');assert.equal(input.dodge,true);assert.equal(input.skill2,false);
});

test('sniper keeps a wider firing band and holds markedshot until the personal mark matures',()=>{
 const {w,h,foe}=arena('archer'),e=foe(250);h.core='sniper';h.forms[0]='markedshot';h.huntTarget=e.id;h.huntStacks=1;
 assert.equal(w.aiInput(h).skill1,true,'unconverted marks do not benefit Q');h.passives.markCashout=1;
 let input=w.aiInput(h);assert.ok(input.x<0);assert.equal(input.skill1,false);
 h.huntStacks=3;input=w.aiInput(h);assert.equal(input.skill1,true);
});

test('sniper keeps a valid marked target but reacts to close threats rather than chasing stale marks',()=>{
 const {w,h,foe}=arena('archer'),marked=foe(310),other=foe(0,200);h.core='sniper';h.forms[0]='markedshot';h.passives.markCashout=1;h.huntTarget=marked.id;h.huntStacks=4;
 let input=w.aiInput(h);assert.equal(input.skill1,true);assert.ok(Math.hypot(input.x,input.y)<.01);
 other.y=100;input=w.aiInput(h);assert.equal(input.skill1,false);assert.ok(input.y<0);
 other.y=260;marked.x=550;input=w.aiInput(h);assert.equal(input.skill1,false);assert.ok(input.y<0);
});

test('shadow volley safely creates an unspent firing origin without a resource requirement',()=>{
 const {w,h,foe}=arena('archer');foe(280);h.core='ranger';h.forms[1]='shadowvolley';h.resource=0;
 let input=w.aiInput(h);assert.equal(input.dodge,true);assert.ok(Math.abs(input.y)>.9);assert.equal(input.skill2,false);assert.equal(h.aiIntent,'shadow');
 h.shadow={x:0,y:0,life:3,face:0,spent:false};input=w.aiInput(h);assert.equal(input.dodge,false);assert.equal(input.skill2,true);assert.equal(input.skill1,false);
 h.shadow.spent=true;assert.equal(w.aiInput(h).dodge,true,'spent mobile shadows can be replaced');
 h.evolutionBranches[1]='garrison';input=w.aiInput(h);assert.equal(input.dodge,false,'garrison cannot be replaced while still alive');assert.equal(input.skill2,true);
 h.shadow=null;h.cd[1]=2;input=w.aiInput(h);assert.equal(input.dodge,false);
});

test('only delayed volley waits for energy and spent shadows cannot satisfy it',()=>{
 const {w,h,foe}=arena('archer');foe(280);h.forms[1]='shadowvolley';h.dodgeCd=1;
 assert.equal(w.aiInput(h).skill2,true);
 h.core='ranger';assert.equal(w.aiInput(h).skill2,true);
 h.passives.delayedVolley=1;assert.equal(w.aiInput(h).skill2,false);
 h.shadow={life:3,spent:true};assert.equal(w.aiInput(h).skill2,false);
 h.shadow.spent=false;assert.equal(w.aiInput(h).skill2,true);
 h.shadow=null;h.resource=60;assert.equal(w.aiInput(h).skill2,true);
});

test('owned fragments are gathered without chasing another player\'s drops',()=>{
 for(const type of ['magnet','amber','wisp']){
  const {w,h}=arena('archer');w.pickups=[{id:91,type,owner:0,x:25,y:0,life:4},{id:92,type,owner:h.id,x:0,y:-95,life:4}];
  const input=w.aiInput(h);assert.equal(h.aiIntent,'loot');assert.equal(h.lootTarget,92);assert.ok(input.y<-.8);
  w.pickups.pop();w.aiInput(h);assert.notEqual(h.aiIntent,'loot');
 }
});

test('nearby supply is useful to an unshielded ally, but full shields and unsafe drops are ignored',()=>{
 const {w,h}=arena('archer');w.pickups=[{id:90,type:'supply',owner:0,x:100,y:0,life:5}];
 let input=w.aiInput(h);assert.equal(h.aiIntent,'loot');assert.ok(input.x>.8);
 h.shield=40;w.aiInput(h);assert.notEqual(h.aiIntent,'loot');
 h.shield=0;w.pickups[0].x=400;w.aiInput(h);assert.notEqual(h.aiIntent,'loot');
 w.pickups[0].x=100;w.hazards=[{type:'poison',x:100,y:0,r:35,timer:.1}];w.aiInput(h);assert.notEqual(h.aiIntent,'loot');
 w.hazards=[];const ally=w.heroes[0];Object.assign(ally,{down:true,x:0,y:-80});input=w.aiInput(h);assert.equal(h.aiIntent,'revive');assert.ok(input.y<-.8);
 ally.down=false;h.hp=10;w.pickups.push({id:92,type:'potion',x:0,y:-100});input=w.aiInput(h);assert.equal(h.aiIntent,'heal');assert.ok(input.y<-.8);
});

test('rescue and safe medicine override offensive build setup',()=>{
 const {w,h,foe}=arena('archer');foe(280);h.core='ranger';h.forms=['markedshot','shadowvolley'];h.resource=100;
 const ally=w.heroes.find(p=>p!==h);Object.assign(ally,{x:80,y:0,down:true});
 let input=w.aiInput(h);assert.equal(h.aiIntent,'revive');assert.equal(input.dodge,false);assert.equal(input.skill1,false);assert.equal(input.skill2,false);
 ally.down=false;h.hp=10;w.pickups=[{id:99,type:'potion',x:0,y:-100}];
 input=w.aiInput(h);assert.equal(h.aiIntent,'heal');assert.equal(input.dodge,false);assert.equal(input.skill1,false);assert.equal(input.skill2,false);assert.ok(input.y<0);
});
