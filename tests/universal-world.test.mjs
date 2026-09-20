import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {createHero} from '../src/coop/recruitment.js';
import {universalPickup} from '../src/coop/universal-combat.js';

function arena(role='warrior'){
 const w=new World(67);w.reset([role,role==='mage'?'archer':'mage'],1);w.enemies=[];w.obstacles=[];w.spawnQueue=[];w.xpNext=1e6;w.waveDuration=10000;w.refreshPressure=()=>{};w.updateEnemy=()=>{};
 // These ownership fixtures explicitly supply companions; a new solo run has none.
 for(const other of ['warrior','mage','archer'])if(!w.heroes.some(h=>h.role===other))w.heroes.push(createHero(other,w.heroes.length,{ai:true}));
 for(const h of w.heroes){h.ai=false;h.x=h.id?1000:0;h.y=0;h.attackCd=1000;h.pickupRadius=75;}
 w.random=()=>0;
 return w;
}
function foe(w,x=150,y=0,boss=false){const e=w.createEnemy(boss?'thornking':'goblin',x,y);e.hp=e.maxHp=1000;e.stats.armor=0;e.cd=999;w.enemies.push(e);return e;}

for(const role of ['warrior','mage','archer'])test(`World ${role} real attack hit spawns a real needle and no recursive needles`,()=>{
 const w=arena(role),h=w.heroes[0],e=foe(w);h.passives={needleMagazine:1};w.damageEnemy(e,1,h,0,'attack',0,null,{eventId:71});assert.equal(w.universalObjects.length,1);assert.equal(e.hp,999);w.advance(.3);assert.equal(e.hp,989);assert.equal(w.universalObjects.length,0);assert.equal(h.damageDone,11);
});
test('World direct contribution plus teammate kill can summon; pet-only kill cannot',()=>{
 const w=arena(),h=w.heroes[0],ally=w.heroes[1];h.passives={boneWhistle:1};let e=foe(w);w.damageEnemy(e,2,h,0,'attack');w.damageEnemy(e,2000,ally,0,'attack');assert.equal(w.pets.length,1);w.time=2;e=foe(w);w.damageEnemy(e,2000,h,0,'proc');assert.equal(w.pets.length,1);
});
test('World eight Boss attacks summon without adds and count event once per cleave',()=>{
 const w=arena(),h=w.heroes[0],e=foe(w,250,0,true);h.passives={boneWhistle:1};for(let i=1;i<=8;i++){w.damageEnemy(e,1,h,0,'attack',0,null,{eventId:i});w.damageEnemy(e,1,h,0,'attack',0,null,{eventId:i});}assert.equal(w.pets.length,1);
});
test('World dodge-end star magazine volley uses chosen movement direction',()=>{
 const w=arena(),h=w.heroes[0],e=foe(w,250);h.passives={needleMagazine:1,returnCore:1};h.awakening='starMagazine';w.damageEnemy(e,1,h,0,'attack');assert.equal(h.universal.ammo,1);assert.equal(w.universalObjects.length,0);w.request(h,'dodge',{x:0,y:1});w.advance(.31,[{x:0,y:1}]);assert.equal(h.universal.ammo,0);const p=w.universalObjects[0];assert.ok(p&&p.dy===1);
});
test('World successful iframe avoidance charges risk while random evasion does not',()=>{
 const w=arena(),h=w.heroes[0],e=foe(w,250);h.skills=[1,0];h.passives={riskEcho:1};h.evasion=1;w.damageHero(h,10,e);assert.equal(h.universal?.riskUntil,undefined);h.evasion=0;h.invuln=0;w.request(h,'dodge',{x:1,y:0});w.damageHero(h,10,{...e,attackId:27});assert.ok(h.universal.riskUntil>w.time);w.advance(.31);h.action=null;w.request(h,'skill1',{x:1,y:0});assert.ok(w.universalObjects.some(o=>o.kind==='riskPulse'));
});
test('World loot pickup drives sigil/supply once per merged XP object, no credit on death',()=>{
 const w=arena(),h=w.heroes[0];h.skills=[1,0];h.passives={scavengeSigil:1,supplyPack:1};const e=foe(w,300);w.damageEnemy(e,2000,h,0,'attack');assert.equal(w.xp,0);assert.ok(w.pickups.some(p=>p.type==='xp'));h.x=300;w.updatePickups(.2);assert.ok(w.xp>0);assert.ok(w.universalObjects.some(o=>o.kind==='sigil'));assert.equal(h.universal.supplies,1);w.dropPickup({type:'xp',x:300,y:0,value:30});w.dropPickup({type:'xp',x:300,y:0,value:70});w.time=1;w.updatePickups(.2);assert.equal(h.universal.supplies,2);
});
test('World owned fragments reject nearby ally, expire, and shield absorption consumes temporary credits',()=>{
 const w=arena(),h=w.heroes[0],ally=w.heroes[1],e=foe(w,300);h.passives={bloodAmber:1};h.shield=0;w.damageHero(h,20,e);const p=w.pickups.find(p=>p.type==='amber');assert.ok(p);h.x=400;ally.x=p.x;ally.y=p.y;w.updatePickups(.1);assert.equal(ally.shield,0);assert.ok(w.pickups.includes(p));h.x=p.x;h.y=p.y;w.updatePickups(.1);assert.equal(h.shield,6);h.shield+=20;h.invuln=0;w.damageHero(h,6,e);assert.equal(h.shield,20);w.advance(3.1);assert.equal(h.shield,20);
});
test('World healing from real contribution triggers healing wave, overkill does not double settle',()=>{
 const w=arena(),h=w.heroes[0],e=foe(w),other=foe(w,80);h.passives={harvest:3,healingWave:1};h.hp=50;h.universal={healed:8};w.damageEnemy(e,2000,h);assert.equal(h.hp,59);assert.ok(other.hp<1000);const hp=other.hp;w.damageEnemy(e,2000,h);assert.equal(other.hp,hp);
});
test('World chained detonation counts a teammate contribution heal once across nested deaths',()=>{
 const w=arena('mage'),killer=w.heroes[0],ally=w.heroes[1];w.random=()=>.99;killer.passives={detonate:1};ally.passives={harvest:1,healingWave:1};ally.hp=50;
 const first=foe(w,100),second=foe(w,180);first.hp=second.hp=1;first.statuses=[{type:'burn',owner:killer.id,life:3,timer:1,damage:1}];second.contributors={[ally.id]:w.time};
 w.damageEnemy(first,2,killer,0,'proc');assert.equal(w.kills,2);assert.equal(ally.hp,53);assert.equal(ally.universal.healed,3,'the outer death must not notify the inner death healing again');
});
test('World skill sources cannot spend their own newly applied two anomalies in same multi-hit event',()=>{
 const w=arena(),h=w.heroes[0],e=foe(w);h.skills=[1,0];h.passives={ember:1,chill:1,mixedFuse:1};w.damageEnemy(e,1,h,0,'skill',0,null,{eventId:80});w.damageEnemy(e,1,h,0,'skill',0,null,{eventId:80});assert.equal(w.universalObjects.filter(o=>o.kind==='fuse').length,0);w.damageEnemy(e,1,h,0,'skill',0,null,{eventId:81});assert.equal(w.universalObjects.filter(o=>o.kind==='fuse').length,1);w.advance(.4);assert.ok(e.hp<997);
});
test('World pet/needle/trap events never refresh shared direct-hit counters or recursively form pets',()=>{
 const w=arena(),h=w.heroes[0];h.skills=[1,1];h.passives={boneWhistle:1,paperCrow:1,needleMagazine:1,magnetAstrolabe:1};for(let i=0;i<30;i++)foe(w,100+i*8,(i%3-1)*50);const e=w.enemies[0];w.damageEnemy(e,1,h,0,'attack',0,null,{eventId:99});w.damageEnemy(e,2000,h,0,'attack',0,null,{eventId:100});w.request(h,'skill1',{x:1,y:0});w.advance(2);assert.ok(w.pets.length<=3);assert.ok(w.universalObjects.filter(o=>o.kind==='needle').length<=24);assert.ok(w.pickups.filter(p=>p.type==='magnet').length<=5);assert.ok(h.damageDone>1);
});
